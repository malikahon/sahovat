import { BACKEND_URL } from './backend-url';

export interface PublicStats {
  active_campaigns: number;
  total_campaigns: number;
  completed_donations_count: number;
  total_donated_amount: number;
  total_withdrawn_amount: number;
  verified_organizers: number;
  recent_verifications_30d: number;
  platform_fee_total: number;
  generated_at: string;
}

/**
 * Server-side fetch of public aggregate stats. Cached server-side via the
 * backend's Redis cache (5 min TTL); we add a Next.js fetch revalidate
 * window of 60s to keep HTML snapshots reasonably fresh without bypassing
 * the upstream cache.
 *
 * Always returns a stats object — on backend failure, returns zeros.
 */
export async function fetchPublicStats(): Promise<PublicStats> {
  const fallback: PublicStats = {
    active_campaigns: 0,
    total_campaigns: 0,
    completed_donations_count: 0,
    total_donated_amount: 0,
    total_withdrawn_amount: 0,
    verified_organizers: 0,
    recent_verifications_30d: 0,
    platform_fee_total: 0,
    generated_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${BACKEND_URL}/public/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return (data?.data as PublicStats) ?? fallback;
  } catch {
    return fallback;
  }
}
