/**
 * API client for frontend-to-BFF communication.
 *
 * Auth calls go through Next.js API routes (same-origin, cookie-based).
 * Other API calls go through the BFF proxy or directly to the backend
 * (to be expanded in later weeks).
 */

// ============================================================
// AUTH API (via BFF proxy routes — cookies handled server-side)
// ============================================================

export const authApi = {
  /**
   * Send OTP to the given phone number.
   */
  async requestOtp(phone_number: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number }),
    });
    return res.json();
  },

  /**
   * Verify OTP. On success, tokens are stored in httpOnly cookies by the BFF.
   * Returns user data and is_new_user flag (no tokens exposed to client).
   */
  async verifyOtp(
    phone_number: string,
    otp: string,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User; is_new_user: boolean };
    error?: string;
  }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number, otp }),
    });
    return res.json();
  },

  /**
   * Complete registration (authenticated — cookie sent automatically).
   */
  async register(
    data: import('./types').RegisterDto,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * Refresh session tokens (refresh_token cookie sent automatically on /api/auth path).
   */
  async refresh(): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
    });
    return res.json();
  },

  /**
   * Logout — revokes refresh token and clears cookies.
   */
  async logout(): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    return res.json();
  },

  /**
   * Get current authenticated user data.
   */
  async getMe(): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) {
      return { success: false, error: 'Not authenticated' };
    }
    return res.json();
  },
};

// ============================================================
// USERS API (via BFF proxy routes)
// ============================================================

export const usersApi = {
  async getProfile(): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/users/profile');
    if (res.status === 401) {
      return { success: false, error: 'Not authenticated' };
    }
    return res.json();
  },

  async updateProfile(
    data: import('./types').UpdateProfileDto,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async initiateOneId(): Promise<{
    success: boolean;
    data?: { redirect_url: string };
    error?: string;
  }> {
    const res = await fetch('/api/users/oneid/initiate');
    return res.json();
  },
};

// ============================================================
// WITHDRAWAL ACCOUNTS API (via BFF proxy routes)
// ============================================================

export const withdrawalAccountsApi = {
  async list(): Promise<{
    success: boolean;
    data?: { accounts: import('./types').SafeWithdrawalAccount[] };
    error?: string;
  }> {
    const res = await fetch('/api/withdrawal-accounts');
    if (res.status === 401) {
      return { success: false, error: 'Not authenticated' };
    }
    return res.json();
  },

  async create(
    data: import('./types').CreateWithdrawalAccountDto,
  ): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetch('/api/withdrawal-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(
    id: string,
    data: import('./types').UpdateWithdrawalAccountDto,
  ): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetch(`/api/withdrawal-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await fetch(`/api/withdrawal-accounts/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async setPrimary(id: string): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetch(`/api/withdrawal-accounts/${id}/primary`, {
      method: 'PUT',
    });
    return res.json();
  },
};

// ============================================================
// GENERAL API CLIENT (for non-auth endpoints, to be used in later weeks)
// ============================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
