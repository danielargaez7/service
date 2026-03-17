type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

/**
 * ServiceCore Dispatch API wrapper.
 * Used for route assignment and reconciliation data needed by labor analytics.
 */
export class ServiceCoreDispatchService {
  private readonly baseUrl = process.env.SERVICECORE_API_URL ?? 'https://api.servicecore.com';
  private readonly apiKey = process.env.SERVICECORE_API_KEY ?? '';

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ServiceCore API request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  getRoutesByDate(date: string, employeeId?: string) {
    const search = new URLSearchParams({ date });
    if (employeeId) search.set('employeeId', employeeId);
    return this.request<unknown>(`/routes?${search.toString()}`);
  }

  getRouteCompletion(routeId: string) {
    return this.request<unknown>(`/routes/${routeId}/completion`);
  }

  getCustomerSites(customerId: string) {
    return this.request<unknown>(`/customers/${customerId}/sites`);
  }

  getEmployeeVehicle(employeeId: string) {
    return this.request<unknown>(`/employees/${employeeId}/vehicle`);
  }
}
