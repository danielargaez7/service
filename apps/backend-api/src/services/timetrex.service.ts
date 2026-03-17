type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

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

  previewPayroll(payload: Record<string, unknown>) {
    return this.request<unknown>('/api/v1/payroll/preview', {
      method: 'POST',
      body: payload,
    });
  }

  exportPayroll(payload: Record<string, unknown>) {
    return this.request<unknown>('/api/v1/payroll/export', {
      method: 'POST',
      body: payload,
    });
  }
}
