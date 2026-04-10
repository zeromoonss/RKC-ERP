const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${API_URL}/api${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async request<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(this.buildUrl(path, params), {
      ...fetchOptions,
      headers,
    });

    if (res.status === 401) {
      // Token expired — try refresh or redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/en/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T = any>(path: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T = any>(path: string, data?: any) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(data) });
  }

  put<T = any>(path: string, data?: any) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(data) });
  }

  patch<T = any>(path: string, data?: any) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T = any>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
