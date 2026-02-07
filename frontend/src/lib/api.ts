/**
 * API client for communicating with the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, auth = false } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (auth && this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  // Auth endpoints
  async requestOTP(phoneNumber: string) {
    return this.request<{ phone_number: string; expires_in: number }>('/auth/request-otp', {
      method: 'POST',
      body: { phone_number: phoneNumber },
    });
  }

  async verifyOTP(phoneNumber: string, otp: string) {
    return this.request<{
      user: {
        id: string;
        phone_number: string;
        display_name: string | null;
        is_verified: boolean;
        is_admin: boolean;
        verification_status: string;
        language_preference: string;
      };
      tokens: {
        access_token: string;
        refresh_token: string;
      };
      is_new_user: boolean;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: { phone_number: phoneNumber, otp },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{
      tokens: {
        access_token: string;
        refresh_token: string;
      };
    }>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      auth: true,
    });
  }

  async getVerificationStatus() {
    return this.request<{
      is_verified: boolean;
      verification_status: string;
      has_document: boolean;
      rejection_reason: string | null;
      oneid_verified: boolean;
      oneid_name: string | null;
    }>('/auth/verify-status', {
      method: 'GET',
      auth: true,
    });
  }

  // OneID OAuth endpoints
  async initiateOneID() {
    return this.request<{
      authorization_url: string;
      mock_mode: boolean;
    }>('/auth/oneid', {
      method: 'GET',
      auth: true,
    });
  }

  async handleOneIDCallback(data: {
    code?: string;
    state: string;
    mock?: boolean;
  }) {
    return this.request<{
      user: {
        id: string;
        phone_number: string;
        display_name: string | null;
        is_verified: boolean;
        verification_status: string;
        oneid_name: string;
        oneid_verified_at: string;
      };
    }>('/auth/oneid/callback', {
      method: 'POST',
      body: data,
      auth: true,
    });
  }

  async getOneIDStatus() {
    return this.request<{
      configured: boolean;
      mock_mode: boolean;
      errors: string[];
    }>('/auth/oneid/status', {
      method: 'GET',
    });
  }

  // Withdrawal Account endpoints
  async getWithdrawalAccounts() {
    return this.request<{
      accounts: WithdrawalAccount[];
      count: number;
    }>('/users/withdrawal-accounts', {
      method: 'GET',
      auth: true,
    });
  }

  async getWithdrawalAccount(id: string) {
    return this.request<{
      account: WithdrawalAccount;
    }>(`/users/withdrawal-accounts/${id}`, {
      method: 'GET',
      auth: true,
    });
  }

  async addWithdrawalAccount(data: {
    provider: string;
    account_number: string;
    account_holder_name: string;
  }) {
    return this.request<{
      account: WithdrawalAccount;
      verification_note: string;
    }>('/users/withdrawal-accounts', {
      method: 'POST',
      body: data,
      auth: true,
    });
  }

  async updateWithdrawalAccount(
    id: string,
    data: {
      provider?: string;
      account_number?: string;
      account_holder_name?: string;
    }
  ) {
    return this.request<{
      account: WithdrawalAccount;
    }>(`/users/withdrawal-accounts/${id}`, {
      method: 'PUT',
      body: data,
      auth: true,
    });
  }

  async deleteWithdrawalAccount(id: string) {
    return this.request(`/users/withdrawal-accounts/${id}`, {
      method: 'DELETE',
      auth: true,
    });
  }

  async setPrimaryWithdrawalAccount(id: string) {
    return this.request<{
      account: WithdrawalAccount;
    }>(`/users/withdrawal-accounts/${id}/set-primary`, {
      method: 'POST',
      auth: true,
    });
  }

  // User profile endpoints
  async updateUserProfile(data: {
    display_name?: string;
    language_preference?: string;
  }) {
    return this.request<{
      user: {
        id: string;
        display_name: string | null;
        language_preference: string;
      };
    }>('/users/profile', {
      method: 'PUT',
      body: data,
      auth: true,
    });
  }
}

// Types
export interface WithdrawalAccount {
  id: string;
  user_id: string;
  provider: 'payme' | 'click' | 'uzcard' | 'humo';
  account_number_masked: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const api = new ApiClient();
export type { ApiResponse };
