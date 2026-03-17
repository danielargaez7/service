type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type TimeTrexApiMode = 'rest' | 'legacy_rpc';
type TimeTrexAuthMode = 'env_session' | 'rpc_login';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

interface LegacyRpcAuthState {
  cookieHeader: string;
  csrfToken: string;
  createdAt: number;
}

interface RpcResponseEnvelope {
  ok: boolean;
  status: number;
  text: string;
  json: unknown;
  setCookies: string[];
}

export interface TimeTrexAuthDiagnostics {
  apiMode: TimeTrexApiMode;
  authMode: TimeTrexAuthMode;
  hasApiToken: boolean;
  hasEnvSessionCookie: boolean;
  hasEnvCsrfToken: boolean;
  hasRpcCredentials: boolean;
  cacheActive: boolean;
  cacheAgeMs: number | null;
  cacheTtlMs: number;
}

/**
 * TimeTrex API wrapper.
 * Provides a minimal typed boundary for payroll-related integrations.
 */
export class TimeTrexService {
  private readonly baseUrl = process.env.TIMETREX_BASE_URL ?? 'http://localhost:8002';
  private readonly apiToken = process.env.TIMETREX_API_TOKEN ?? '';
  private readonly apiMode = (process.env.TIMETREX_API_MODE ??
    'rest') as TimeTrexApiMode;
  private readonly authMode = (process.env.TIMETREX_AUTH_MODE
    ?? (process.env.TIMETREX_USERNAME && process.env.TIMETREX_PASSWORD
      ? 'rpc_login'
      : 'env_session')) as TimeTrexAuthMode;
  private readonly sessionCookie = process.env.TIMETREX_SESSION_COOKIE ?? '';
  private readonly csrfToken = process.env.TIMETREX_CSRF_TOKEN ?? '';
  private readonly rpcVersion = process.env.TIMETREX_RPC_VERSION ?? '2';
  private readonly username = process.env.TIMETREX_USERNAME ?? '';
  private readonly password = process.env.TIMETREX_PASSWORD ?? '';
  private readonly loginLanguage = process.env.TIMETREX_LOGIN_LANGUAGE ?? 'en';
  private readonly authTtlMs = Number(process.env.TIMETREX_AUTH_TTL_MS ?? 30 * 60 * 1000);
  private authState: LegacyRpcAuthState | null = null;

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TimeTrex request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  getAuthDiagnostics(): TimeTrexAuthDiagnostics {
    const cacheAgeMs = this.authState ? Date.now() - this.authState.createdAt : null;
    return {
      apiMode: this.apiMode,
      authMode: this.authMode,
      hasApiToken: Boolean(this.apiToken),
      hasEnvSessionCookie: Boolean(this.sessionCookie),
      hasEnvCsrfToken: Boolean(this.csrfToken),
      hasRpcCredentials: Boolean(this.username && this.password),
      cacheActive: Boolean(this.authState),
      cacheAgeMs,
      cacheTtlMs: this.authTtlMs,
    };
  }

  private buildMessageId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  private normalizeCookieHeader(value: string): string {
    return value
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.includes('='))
      .join('; ');
  }

  private extractCookieValue(cookieHeader: string, key: string): string | null {
    const parts = cookieHeader.split(';').map((part) => part.trim());
    const match = parts.find((part) => part.toLowerCase().startsWith(`${key.toLowerCase()}=`));
    return match ? match.slice(match.indexOf('=') + 1) : null;
  }

  private tryExtractStringField(data: unknown, keys: string[]): string | null {
    if (!data || typeof data !== 'object') return null;
    const stack: unknown[] = [data];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      const asRecord = current as Record<string, unknown>;
      for (const key of keys) {
        const value = asRecord[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      for (const value of Object.values(asRecord)) {
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      }
    }
    return null;
  }

  private getSetCookies(response: Response): string[] {
    const headers = response.headers as unknown as {
      getSetCookie?: () => string[];
      get?: (name: string) => string | null;
    };
    if (typeof headers.getSetCookie === 'function') {
      return headers.getSetCookie();
    }
    const single = headers.get?.('set-cookie');
    return single ? [single] : [];
  }

  private combineSetCookies(setCookies: string[]): string {
    const pairs = setCookies
      .flatMap((raw) => raw.split(','))
      .map((part) => part.trim())
      .filter(Boolean)
      .map((cookie) => cookie.split(';')[0]?.trim())
      .filter((cookie): cookie is string => Boolean(cookie && cookie.includes('=')));
    const deduped = new Map<string, string>();
    for (const pair of pairs) {
      const [name, ...rest] = pair.split('=');
      if (!name || rest.length === 0) continue;
      deduped.set(name.trim(), `${name.trim()}=${rest.join('=').trim()}`);
    }
    return Array.from(deduped.values()).join('; ');
  }

  private isAuthExpired(envelope: RpcResponseEnvelope): boolean {
    if (envelope.status === 401 || envelope.status === 403) return true;
    const body = `${envelope.text} ${JSON.stringify(envelope.json ?? {})}`.toLowerCase();
    return (
      body.includes('invalid session')
      || body.includes('not authenticated')
      || body.includes('authentication required')
      || body.includes('session expired')
      || body.includes('csrf')
    );
  }

  private async performRpcRequest(
    className: string,
    methodName: string,
    payload: Record<string, unknown>,
    auth?: LegacyRpcAuthState
  ): Promise<RpcResponseEnvelope> {
    const query = new URLSearchParams({
      Class: className,
      Method: methodName,
      v: this.rpcVersion,
      MessageID: this.buildMessageId(),
    });

    const body = new URLSearchParams({
      json: JSON.stringify(payload),
    });

    const response = await fetch(`${this.baseUrl}/api/json/api.php?${query.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        ...(auth ? { 'X-CSRF-Token': auth.csrfToken, Cookie: auth.cookieHeader } : {}),
      },
      body: body.toString(),
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      text,
      json,
      setCookies: this.getSetCookies(response),
    };
  }

  private getAuthStateFromEnv(): LegacyRpcAuthState | null {
    if (!this.sessionCookie) return null;
    const normalizedCookie = this.normalizeCookieHeader(this.sessionCookie);
    const csrf =
      (this.csrfToken || this.extractCookieValue(normalizedCookie, 'CSRF-Token') || '').trim();
    if (!csrf) return null;

    const withCsrfCookie = normalizedCookie.includes('CSRF-Token=')
      ? normalizedCookie
      : `${normalizedCookie}; CSRF-Token=${csrf}`;

    return {
      cookieHeader: withCsrfCookie,
      csrfToken: csrf,
      createdAt: Date.now(),
    };
  }

  private async loginWithRpcCredentials(): Promise<LegacyRpcAuthState | null> {
    if (!this.username || !this.password) return null;

    const attempts: Array<Record<string, unknown>> = [
      { 0: { user_name: this.username, password: this.password } },
      { 0: { username: this.username, password: this.password } },
      {
        0: {
          user_name: this.username,
          password: this.password,
          selected_language: this.loginLanguage,
        },
      },
    ];

    for (const payload of attempts) {
      const envelope = await this.performRpcRequest(
        'APIAuthentication',
        'login',
        payload
      );

      if (!envelope.ok) continue;

      const cookieFromSetCookie = this.combineSetCookies(envelope.setCookies);
      const sessionIdFromJson =
        this.tryExtractStringField(envelope.json, ['SessionID', 'session_id', 'sessionId'])
        ?? null;
      const csrfFromJson =
        this.tryExtractStringField(envelope.json, ['CSRF-Token', 'csrf_token', 'csrfToken'])
        ?? null;

      let cookieHeader = cookieFromSetCookie;
      if (!cookieHeader && sessionIdFromJson) {
        cookieHeader = `SessionID=${sessionIdFromJson}`;
      }

      const csrf =
        (csrfFromJson
          || this.extractCookieValue(cookieHeader, 'CSRF-Token')
          || this.extractCookieValue(cookieHeader, 'csrf-token')
          || '')
          .trim();

      if (!cookieHeader || !csrf) continue;

      const authState: LegacyRpcAuthState = {
        cookieHeader: cookieHeader.includes('CSRF-Token=')
          ? cookieHeader
          : `${cookieHeader}; CSRF-Token=${csrf}`,
        csrfToken: csrf,
        createdAt: Date.now(),
      };

      // Warm up authenticated context when supported.
      await this.performRpcRequest(
        'APIAuthentication',
        'getPostLoginData',
        { 0: { selected_language: this.loginLanguage } },
        authState
      ).catch(() => undefined);

      return authState;
    }

    return null;
  }

  private async getLegacyRpcAuthState(forceRefresh = false): Promise<LegacyRpcAuthState> {
    if (
      !forceRefresh
      && this.authState
      && Date.now() - this.authState.createdAt < this.authTtlMs
    ) {
      return this.authState;
    }

    if (this.authMode === 'rpc_login') {
      const loggedIn = await this.loginWithRpcCredentials();
      if (loggedIn) {
        this.authState = loggedIn;
        return loggedIn;
      }
    }

    const fromEnv = this.getAuthStateFromEnv();
    if (fromEnv) {
      this.authState = fromEnv;
      return fromEnv;
    }

    throw new Error(
      'TimeTrex legacy_rpc authentication is not configured. Set TIMETREX_AUTH_MODE=rpc_login with TIMETREX_USERNAME/TIMETREX_PASSWORD or provide TIMETREX_SESSION_COOKIE and TIMETREX_CSRF_TOKEN.'
    );
  }

  private async rpcRequest<T>(
    className: string,
    methodName: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const firstAuth = await this.getLegacyRpcAuthState(false);
    let envelope = await this.performRpcRequest(className, methodName, payload, firstAuth);

    if (this.isAuthExpired(envelope)) {
      const refreshedAuth = await this.getLegacyRpcAuthState(true);
      envelope = await this.performRpcRequest(className, methodName, payload, refreshedAuth);
    }

    if (!envelope.ok) {
      throw new Error(
        `TimeTrex RPC request failed (${envelope.status}) [${className}.${methodName}]: ${envelope.text}`
      );
    }

    return envelope.json as T;
  }

  previewPayroll(payload: Record<string, unknown>) {
    if (this.apiMode === 'legacy_rpc') {
      const legacyPayload = {
        0: {
          filter_data: {},
          filter_columns: {
            is_owner: true,
            id: true,
            is_child: true,
            user_id: true,
            first_name: true,
            last_name: true,
            object_type_id: true,
            manual_id: true,
            default_item_id: true,
            accrual_policy_id: true,
            pay_code_id: true,
            start_date: true,
            end_date: true,
            pay_period_id: true,
            pay_period_schedule: true,
          },
          filter_items_per_page: 0,
          filter_sort: {},
          ...payload,
        },
      };
      return this.rpcRequest<unknown>(
        'APIPayPeriod',
        'getPayPeriod',
        legacyPayload
      );
    }

    return this.request<unknown>('/api/v1/payroll/preview', {
      method: 'POST',
      body: payload,
    });
  }

  exportPayroll(payload: Record<string, unknown>) {
    if (this.apiMode === 'legacy_rpc') {
      const legacyPayload = {
        0: {
          filter_data: {},
          filter_sort: {},
          filter_columns: {
            pay_stub_transaction_date: true,
            pay_stub_start_date: true,
            pay_stub_end_date: true,
            id: true,
            status_id: true,
            is_owner: true,
            user_id: true,
            pay_stub_id: true,
            pay_period_id: true,
            pay_stub_run_id: true,
            currency_id: true,
            remittance_source_account_type_id: true,
            cb: true,
            status: true,
            destination_user_first_name: true,
            destination_user_last_name: true,
            remittance_source_account: true,
            remittance_destination_account: true,
            amount: true,
            transaction_date: true,
          },
          filter_items_per_page: 0,
          filter_page: 1,
          ...payload,
        },
      };
      return this.rpcRequest<unknown>(
        'APIPayStubTransaction',
        'getPayStubTransaction',
        legacyPayload
      );
    }

    return this.request<unknown>('/api/v1/payroll/export', {
      method: 'POST',
      body: payload,
    });
  }
}
