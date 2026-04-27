/**
 * API client for frontend-to-BFF communication.
 *
 * Auth calls go through Next.js API routes (same-origin, cookie-based).
 * Other API calls go through the BFF proxy or directly to the backend
 * (to be expanded in later weeks).
 */

// ============================================================
// FETCH WITH AUTO TOKEN REFRESH
// ============================================================

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Wrapper around fetch that automatically retries on 401 after refreshing tokens.
 * Auth endpoints (login, OTP, refresh, logout) bypass the retry logic.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status !== 401) {
    return res;
  }

  // Avoid infinite loops — don't retry auth endpoints
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/api/auth/')) {
    return res;
  }

  // Attempt token refresh (deduplicate concurrent refreshes)
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }

  const refreshed = await (refreshPromise ?? Promise.resolve(false));
  if (!refreshed) {
    return res; // refresh failed — return original 401
  }

  // Retry the original request with new cookies
  return fetch(input, init);
}

// ============================================================
// SAFE JSON HELPER
// ============================================================

async function safeJson<T>(res: Response, fallback?: T): Promise<T> {
  if (!res.ok) {
    try {
      return await res.json();
    } catch {
      return (fallback ?? { success: false, error: `HTTP ${res.status}` }) as T;
    }
  }
  try {
    return await res.json();
  } catch {
    return (fallback ?? { success: false, error: 'Invalid response' }) as T;
  }
}

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
    data?: { user: import('./types').User | null; is_new_user: boolean; registration_token?: string };
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

  /**
   * Verify admin password after OTP-based login.
   * Used when an admin user logs in via the normal OTP flow.
   */
  async verifyAdminPassword(
    password: string,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/auth/admin-verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  /**
   * Set a password for the current user (required before campaign creation).
   */
  async setPassword(
    password: string,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
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
    const res = await fetchWithRetry('/api/users/profile');
    return safeJson(res);
  },

  async updateProfile(
    data: import('./types').UpdateProfileDto,
  ): Promise<{
    success: boolean;
    data?: { user: import('./types').User };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async initiateOneId(): Promise<{
    success: boolean;
    data?: { redirect_url: string };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/users/oneid/initiate');
    return safeJson(res);
  },

  async uploadVerificationDocument(
    file: File,
    documentType: string,
    legalFirstName: string,
    legalLastName: string,
  ): Promise<{
    success: boolean;
    data?: { file_url: string; document_id: string; ai_status: string };
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('legal_first_name', legalFirstName);
    formData.append('legal_last_name', legalLastName);
    const res = await fetchWithRetry('/api/users/verification/document', {
      method: 'POST',
      body: formData,
    });
    return safeJson(res);
  },

  async getVerificationDocuments(): Promise<{
    success: boolean;
    data?: {
      documents: Array<{
        id: string;
        document_type: string;
        status: string;
        original_filename: string | null;
        legal_first_name: string | null;
        legal_last_name: string | null;
        ai_status: string | null;
        ai_confidence: number | null;
        uploaded_at: string;
        reviewed_at: string | null;
        reviewer_notes: string | null;
      }>;
    };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/users/verification/documents');
    return safeJson(res);
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
    const res = await fetchWithRetry('/api/withdrawal-accounts');
    return safeJson(res);
  },

  async create(
    data: import('./types').CreateWithdrawalAccountDto,
  ): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/withdrawal-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async update(
    id: string,
    data: import('./types').UpdateWithdrawalAccountDto,
  ): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/withdrawal-accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  async delete(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/withdrawal-accounts/${id}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  async setPrimary(id: string): Promise<{
    success: boolean;
    data?: { account: import('./types').SafeWithdrawalAccount };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/withdrawal-accounts/${id}/primary`, {
      method: 'PUT',
    });
    return safeJson(res);
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
    const res = await fetchWithRetry(`/api/campaigns${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  async get(id: string): Promise<{
    success: boolean;
    data?: { campaign: import('./types').CampaignWithStats };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    // Normalize: backend returns { data: CampaignObj } directly,
    // but frontend expects { data: { campaign: CampaignObj } }.
    if (json.success && json.data && !json.data.campaign && json.data.id) {
      return { ...json, data: { campaign: json.data } };
    }
    return json;
  },

  async create(
    data: import('./types').CreateCampaignDto,
  ): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    if (json.success && json.data && !json.data.campaign && json.data.id) {
      return { ...json, data: { campaign: json.data } };
    }
    return json;
  },

  async update(
    id: string,
    data: import('./types').UpdateCampaignDto,
  ): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    if (json.success && json.data && !json.data.campaign && json.data.id) {
      return { ...json, data: { campaign: json.data } };
    }
    return json;
  },

  async delete(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  async submit(id: string): Promise<{
    success: boolean;
    data?: { campaign: import('./types').Campaign };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}/submit`, {
      method: 'PUT',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    if (json.success && json.data && !json.data.campaign && json.data.id) {
      return { ...json, data: { campaign: json.data } };
    }
    return json;
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
    const res = await fetchWithRetry(`/api/campaigns/${id}/cover-image`, {
      method: 'POST',
      body: formData,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    if (json.success && json.data && !json.data.campaign && json.data.id) {
      return { ...json, data: { campaign: json.data } };
    }
    return json;
  },

  async listDocuments(id: string): Promise<{
    success: boolean;
    data?: { documents: import('./types').CampaignDocument[] };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}/documents`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await safeJson<any>(res);
    // Normalize: backend returns { data: Document[] } (array),
    // but frontend expects { data: { documents: Document[] } }.
    if (json.success && Array.isArray(json.data)) {
      return { ...json, data: { documents: json.data } };
    }
    return json;
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
    const res = await fetchWithRetry(`/api/campaigns/${campaignId}/documents`, {
      method: 'POST',
      body: formData,
    });
    return safeJson(res);
  },

  async deleteDocument(
    campaignId: string,
    docId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${campaignId}/documents/${docId}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  async getStats(id: string): Promise<{
    success: boolean;
    data?: { stats: { total_donated: number; donor_count: number; net_donated: number } };
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/campaigns/${id}/stats`);
    return safeJson(res);
  },
};

// ============================================================
// DONATIONS API (via BFF proxy routes)
// ============================================================

export const donationsApi = {
  /**
   * Get current platform fee percentage (public, no auth needed).
   */
  async getFeeInfo(): Promise<{
    success: boolean;
    data?: { platform_fee_percentage: number };
    error?: string;
  }> {
    const res = await fetch('/api/donations/fee-info');
    return safeJson(res);
  },

  /**
   * Request OTP for a donation > 100,000 UZS.
   */
  async requestOtp(
    campaign_id: string,
    amount: number,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry('/api/donations/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id, amount }),
    });
    return safeJson(res);
  },

  /**
   * Verify OTP code for a high-value donation.
   */
  async verifyOtp(otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry('/api/donations/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
    return safeJson(res);
  },

  /**
   * Initiate a donation. Returns pending donation record + PayMe checkout URL.
   */
  async initiate(data: import('./types').InitiateDonationDto): Promise<{
    success: boolean;
    data?: { donation: import('./types').Donation; checkout_url: string };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/donations/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  /**
   * Dev-only: Simulate PayMe payment completion by calling the webhook endpoint.
   * Triggers the backend to mark the donation as completed.
   */
  async simulatePayment(
    donationId: string,
    amount: number,
  ): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/donations/webhook/payme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donation_id: donationId,
        status: 'completed',
        amount,
        transaction_id: `mock_txn_${Date.now()}`,
      }),
    });
    return res.json();
  },

  /**
   * Get a single donation by ID.
   */
  async getById(id: string): Promise<{
    success: boolean;
    data?: import('./types').Donation;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/donations/${id}`);
    return safeJson(res);
  },

  /**
   * List the current user's donations.
   */
  async listMy(query?: { page?: number; limit?: number }): Promise<{
    success: boolean;
    data?: import('./types').DonationWithCampaign[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/donations/my${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  /**
   * List donations for a specific campaign.
   */
  async listByCampaign(
    campaignId: string,
    query?: { page?: number; limit?: number },
  ): Promise<{
    success: boolean;
    data?: import('./types').Donation[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/donations/campaign/${campaignId}${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  /**
   * Download a donation receipt PDF. Returns a Blob for browser download.
   */
  async downloadReceipt(id: string): Promise<Blob | null> {
    const res = await fetch(`/api/donations/${id}/receipt`);
    if (!res.ok) return null;
    return res.blob();
  },
};

// ============================================================
// SAVED CARDS API
// ============================================================

export const savedCardsApi = {
  /**
   * Initiate adding a new card (tokenize + request OTP).
   */
  async create(
    card_number: string,
    card_expire: string,
  ): Promise<{
    success: boolean;
    data?: { card_id: string; phone_masked: string; wait: number };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/saved-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_number, card_expire }),
    });
    return safeJson(res);
  },

  /**
   * Verify card OTP.
   */
  async verify(
    card_id: string,
    code: string,
  ): Promise<{
    success: boolean;
    data?: import('./types').SavedCard;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/saved-cards/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id, code }),
    });
    return safeJson(res);
  },

  /**
   * List the current user's saved cards.
   */
  async list(): Promise<{
    success: boolean;
    data?: import('./types').SavedCard[];
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/saved-cards');
    return safeJson(res);
  },

  /**
   * Remove a saved card.
   */
  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetchWithRetry(`/api/saved-cards/${id}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  /**
   * Set a card as default.
   */
  async setDefault(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetchWithRetry(`/api/saved-cards/${id}/default`, {
      method: 'PUT',
    });
    return safeJson(res);
  },
};

// ============================================================
// WITHDRAWALS API (organizer — via BFF proxy routes)
// ============================================================

export const withdrawalsApi = {
  /**
   * GET /api/withdrawals/dashboard
   * Returns per-campaign stats + withdrawal history for the organizer.
   */
  async getDashboard(): Promise<{
    success: boolean;
    data?: import('./types').OrganizerDashboard;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/withdrawals/dashboard');
    return safeJson(res);
  },

  /**
   * GET /api/withdrawals/my
   */
  async listMy(query?: {
    page?: number;
    limit?: number;
    campaign_id?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    withdrawals?: import('./types').WithdrawalRequest[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/withdrawals/my${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  /**
   * GET /api/withdrawals/campaigns/:id/balance
   */
  async getCampaignBalance(campaignId: string): Promise<{
    success: boolean;
    data?: import('./types').CampaignWithBalance['balance'];
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/withdrawals/campaigns/${campaignId}/balance`);
    return safeJson(res);
  },

  /**
   * POST /api/withdrawals
   */
  async request(data: {
    campaign_id: string;
    withdrawal_account_id: string;
    amount: number;
  }): Promise<{
    success: boolean;
    data?: { withdrawal: import('./types').WithdrawalRequest };
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },
};

// ============================================================
// ADMIN API (via BFF proxy routes — admin-only)
// ============================================================

export const adminApi = {
  // ---- Stats ----
  async getStats(): Promise<{
    success: boolean;
    data?: import('./types').AdminDashboardStatsResponse;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/stats');
    return safeJson(res);
  },

  async getDonationsOverTime(days = 30): Promise<{
    success: boolean;
    data?: import('./types').DonationOverTimeEntry[];
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/stats/donations-over-time?days=${days}`);
    return safeJson(res);
  },

  async getDonationsByCategory(): Promise<{
    success: boolean;
    data?: import('./types').DonationByCategoryEntry[];
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/stats/donations-by-category');
    return safeJson(res);
  },

  async getMoneyFlow(): Promise<{
    success: boolean;
    data?: import('./types').MoneyFlowStats;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/stats/money-flow');
    return safeJson(res);
  },

  // ---- Users ----
  async listUsers(query?: {
    page?: number;
    limit?: number;
    search?: string;
    is_admin?: boolean;
    is_banned?: boolean;
    verification_status?: string;
  }): Promise<{
    success: boolean;
    users?: import('./types').AdminUserListItem[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/admin/users${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  async getUser(id: string): Promise<{
    success: boolean;
    data?: import('./types').AdminUserDetail;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/users/${id}`);
    return safeJson(res);
  },

  async updateUser(
    id: string,
    payload: import('./types').AdminUpdateUserPayload,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return safeJson(res);
  },

  async toggleAdmin(id: string, is_admin: boolean): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/users/${id}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin }),
    });
    return safeJson(res);
  },

  async toggleBan(id: string, is_banned: boolean, reason?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/users/${id}/ban`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_banned, reason }),
    });
    return safeJson(res);
  },

  // ---- Campaigns ----
  async listCampaigns(query?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    is_verified?: boolean;
  }): Promise<{
    success: boolean;
    campaigns?: import('./types').AdminCampaignListItem[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/admin/campaigns${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  async getCampaign(id: string): Promise<{
    success: boolean;
    data?: import('./types').AdminCampaignDetail;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/campaigns/${id}`);
    return safeJson(res);
  },

  async verifyCampaign(id: string, verified: boolean, admin_notes?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/campaigns/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified, admin_notes }),
    });
    return safeJson(res);
  },

  async updateCampaignStatus(
    id: string,
    status: string,
    admin_notes?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/campaigns/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes }),
    });
    return safeJson(res);
  },

  // ---- Audit Log ----
  async getAuditLog(query?: {
    page?: number;
    limit?: number;
    action_type?: string;
    target_type?: string;
    admin_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{
    success: boolean;
    actions?: import('./types').AdminAuditLogEntry[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/admin/audit-log${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  // ---- Settings ----
  async getSettings(): Promise<{
    success: boolean;
    data?: import('./types').AdminSettingsResponse;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/settings');
    return safeJson(res);
  },

  async updateSettings(data: import('./types').AdminUpdateSettingsDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  // ---- Escrow ----
  async getEscrow(): Promise<{
    success: boolean;
    data?: import('./types').EscrowSummary;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/admin/escrow');
    return safeJson(res);
  },

  // ---- Withdrawal Queue (10.3 / 10.8) ----
  async listWithdrawals(query?: {
    page?: number;
    limit?: number;
    status?: string;
    campaign_id?: string;
  }): Promise<{
    success: boolean;
    withdrawals?: import('./types').AdminWithdrawalListItem[];
    pagination?: { page: number; limit: number; total: number; total_pages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/admin/withdrawals${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  async getWithdrawal(id: string): Promise<{
    success: boolean;
    data?: import('./types').AdminWithdrawalDetail;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/admin/withdrawals/${id}`);
    return safeJson(res);
  },

  async reviewWithdrawal(
    id: string,
    action: 'approve' | 'reject',
    admin_notes?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry(`/api/admin/withdrawals/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_notes }),
    });
    return safeJson(res);
  },

  async completeWithdrawal(
    id: string,
    transaction_reference: string,
    admin_notes?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry(`/api/admin/withdrawals/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_reference, admin_notes }),
    });
    return safeJson(res);
  },

  async listVerificationDocuments(status?: string): Promise<{
    success: boolean;
    data?: {
      documents: Array<{
        id: string;
        user_id: string;
        user_display_name: string | null;
        user_phone: string;
        document_type: string;
        original_filename: string | null;
        legal_first_name: string | null;
        legal_last_name: string | null;
        status: string;
        uploaded_at: string;
        reviewed_at: string | null;
        reviewer_notes: string | null;
        ai_status: string | null;
        ai_confidence: number | null;
        ai_extracted_text: string | null;
      }>;
    };
    error?: string;
  }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetchWithRetry(`/api/admin/verification-documents${qs}`);
    return safeJson(res);
  },

  async reviewVerificationDocument(
    id: string,
    decision: 'approved' | 'rejected',
    reviewer_notes?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetchWithRetry(`/api/admin/verification-documents/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reviewer_notes }),
    });
    return safeJson(res);
  },

  /** Returns a URL for streaming the private document file through the BFF. */
  getVerificationDocumentFileUrl(id: string): string {
    return `/api/admin/verification-documents/${id}/file`;
  },
};

// ============================================================
// EVENTS API (Week 11 — behavioral event tracking)
// ============================================================

export const eventsApi = {
  async track(event: {
    event_type: string;
    campaign_id?: string;
    session_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; data?: { event_id: string } }> {
    const res = await fetchWithRetry('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return safeJson(res);
  },
};

// ============================================================
// FEED API (Week 11 — personalized campaign feed)
// ============================================================

export const feedApi = {
  async getPersonalized(query?: {
    page?: number;
    limit?: number;
  }): Promise<import('./types').PaginatedResponse<import('./types').CampaignWithStats>> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/feed${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },
};

// ============================================================
// RECURRING DONATIONS API (Week 12)
// ============================================================

export const recurringApi = {
  /**
   * List the current user's recurring donations.
   */
  async listMy(query?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    success: boolean;
    data?: import('./types').RecurringDonation[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const res = await fetchWithRetry(`/api/recurring-donations${qs ? `?${qs}` : ''}`);
    return safeJson(res);
  },

  /**
   * Create a new recurring donation subscription.
   */
  async create(data: import('./types').CreateRecurringDonationDto): Promise<{
    success: boolean;
    data?: import('./types').RecurringDonation;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/recurring-donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  /**
   * Get a single recurring donation by ID.
   */
  async getById(id: string): Promise<{
    success: boolean;
    data?: import('./types').RecurringDonation;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/recurring-donations/${id}`);
    return safeJson(res);
  },

  /**
   * Update a recurring donation (amount, frequency, status).
   */
  async update(
    id: string,
    data: import('./types').UpdateRecurringDonationDto,
  ): Promise<{
    success: boolean;
    data?: import('./types').RecurringDonation;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/recurring-donations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  },

  /**
   * Delete a recurring donation (only cancelled/paused/failed).
   */
  async delete(id: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetchWithRetry(`/api/recurring-donations/${id}`, {
      method: 'DELETE',
    });
    return safeJson(res);
  },

  /**
   * Get the user's impact stats.
   */
  async getImpact(): Promise<{
    success: boolean;
    data?: {
      total_donated: number;
      campaigns_supported: number;
      streak_weeks: number;
      total_donations_count: number;
      recurring_active_count: number;
      recurring_total_monthly: number;
    };
    error?: string;
  }> {
    const res = await fetchWithRetry('/api/recurring-donations/impact');
    return safeJson(res);
  },
};


