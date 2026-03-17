type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

/**
 * Kimai API wrapper.
 * This service intentionally keeps a thin transport layer so feature routes
 * can build against stable method signatures while integration evolves.
 */
export class KimaiService {
  private readonly baseUrl = process.env.KIMAI_BASE_URL ?? 'http://localhost:8001';
  private readonly apiToken = process.env.KIMAI_API_TOKEN ?? '';

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
      throw new Error(`Kimai request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  listTimesheets(params: Record<string, string | number | boolean> = {}) {
    const search = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    return this.request<unknown[]>(`/api/timesheets?${search.toString()}`);
  }

  createTimesheet(payload: Record<string, unknown>) {
    return this.request<unknown>('/api/timesheets', {
      method: 'POST',
      body: payload,
    });
  }
}
