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
// CAMPAIGNS API (via BFF proxy routes)
// ============================================================

export const campaignsApi = {
  async list(
    query?: import('./types').CampaignListQuery,
  ): Promise<import('./types').PaginatedResponse<import('./types').CampaignWithStats>> {
    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      }
    }
    const qs = params.toString();
    const res = await fetch(`/api/campaigns${qs ? `?${qs}` : ''}`);
    return res.json();
  },

  async get(id: string): Promise<{
    success: boolean;
    data?: { campaign: import('./types').CampaignWithStats };
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${id}`);
    return res.json();
  },

  async create(
    data: import('./types').CreateCampaignDto,
  ): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(
    id: string,
    data: import('./types').UpdateCampaignDto,
  ): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${id}`, {
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
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async submit(id: string): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${id}/submit`, {
      method: 'PUT',
    });
    return res.json();
  },

  async uploadCoverImage(
    id: string,
    file: File,
  ): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`/api/campaigns/${id}/cover-image`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async listDocuments(id: string): Promise<{
    success: boolean;
    data?: { documents: import('./types').CampaignDocument[] };
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${id}/documents`);
    return res.json();
  },

  async uploadDocument(
    campaignId: string,
    file: File,
    documentType: import('./types').DocumentType,
    notes?: string,
  ): Promise<{
    success: boolean;
    data?: { document: import('./types').CampaignDocument };
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);
    const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async deleteDocument(
    campaignId: string,
    docId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${campaignId}/documents/${docId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getStats(id: string): Promise<{
    success: boolean;
    data?: { stats: { total_donated: number; donor_count: number; net_donated: number } };
    error?: string;
  }> {
    const res = await fetch(`/api/campaigns/${id}/stats`);
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
