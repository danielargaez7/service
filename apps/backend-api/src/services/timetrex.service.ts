type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type TimeTrexApiMode = 'rest' | 'legacy_rpc';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
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
  private readonly sessionCookie = process.env.TIMETREX_SESSION_COOKIE ?? '';
  private readonly csrfToken = process.env.TIMETREX_CSRF_TOKEN ?? '';
  private readonly rpcVersion = process.env.TIMETREX_RPC_VERSION ?? '2';

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

  private buildMessageId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  private async rpcRequest<T>(
    className: string,
    methodName: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    if (!this.sessionCookie || !this.csrfToken) {
      throw new Error(
        'TIMETREX_SESSION_COOKIE and TIMETREX_CSRF_TOKEN are required for legacy_rpc mode'
      );
    }

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
        'X-CSRF-Token': this.csrfToken,
        Cookie: this.sessionCookie,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `TimeTrex RPC request failed (${response.status}) [${className}.${methodName}]: ${text}`
      );
    }

    return (await response.json()) as T;
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
