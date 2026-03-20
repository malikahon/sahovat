'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, ShieldCheck, ShieldOff, Ban, UserCheck,
  CheckCircle, XCircle, Clock, User, Phone, Calendar,
  Globe, BadgeCheck, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { formatDate, formatUZS } from '@/lib/formatters';
import { VerificationStatus } from '@/lib/types';
import type { AdminUpdateUserPayload } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================
// Helpers
// ============================================================

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="size-3" /> },
    pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="size-3" /> },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: <XCircle className="size-3" /> },
    none:     { label: 'None',     className: 'bg-gray-100 text-gray-500', icon: <AlertTriangle className="size-3" /> },
  };
  const s = map[status] ?? map.none;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ============================================================
// Page
// ============================================================

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---- data fetch ----
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: async () => {
      const res = await adminApi.getUser(id);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load user');
      return res.data;
    },
  });

  // ---- form state (initialised from fetched data) ----
  const [form, setForm] = useState<AdminUpdateUserPayload>({});
  const [formInit, setFormInit] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<null | 'save' | 'ban' | 'unban' | 'makeAdmin' | 'revokeAdmin'>(null);
  const [banReason, setBanReason] = useState('');

  // Populate form once on first load
  if (userData && !formInit) {
    setForm({
      display_name:        userData.display_name,
      phone_number:        userData.phone_number,
      date_of_birth:       userData.date_of_birth,
      gender:              userData.gender,
      language_preference: userData.language_preference,
      is_verified:         userData.is_verified,
      verification_status: userData.verification_status as VerificationStatus,
      is_admin:            userData.is_admin,
      is_banned:           userData.is_banned,
      bio:                 userData.bio,
    });
    setFormInit(true);
  }

  // ---- mutations ----
  const updateMutation = useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => adminApi.updateUser(id, payload),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error ?? 'Update failed'); return; }
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setFormInit(false); // re-sync form on next render
    },
    onError: () => toast.error('An error occurred'),
  });

  const banMutation = useMutation({
    mutationFn: ({ is_banned, reason }: { is_banned: boolean; reason?: string }) =>
      adminApi.toggleBan(id, is_banned, reason),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error ?? 'Action failed'); return; }
      toast.success(banMutation.variables?.is_banned ? 'User banned' : 'User unbanned');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setFormInit(false);
    },
    onError: () => toast.error('An error occurred'),
  });

  const adminMutation = useMutation({
    mutationFn: (is_admin: boolean) => adminApi.toggleAdmin(id, is_admin),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error ?? 'Action failed'); return; }
      toast.success(adminMutation.variables ? 'Admin granted' : 'Admin revoked');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setFormInit(false);
    },
    onError: () => toast.error('An error occurred'),
  });

  // ---- helpers ----
  const set = <K extends keyof AdminUpdateUserPayload>(key: K, value: AdminUpdateUserPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isBusy = updateMutation.isPending || banMutation.isPending || adminMutation.isPending;

  // ---- confirm handler ----
  function handleConfirm() {
    switch (confirmDialog) {
      case 'save':
        updateMutation.mutate(form);
        break;
      case 'ban':
        banMutation.mutate({ is_banned: true, reason: banReason || undefined });
        break;
      case 'unban':
        banMutation.mutate({ is_banned: false });
        break;
      case 'makeAdmin':
        adminMutation.mutate(true);
        break;
      case 'revokeAdmin':
        adminMutation.mutate(false);
        break;
    }
    setConfirmDialog(null);
    setBanReason('');
  }

  // ---- loading / error ----
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !userData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-2" /> Back
        </Button>
        <p className="text-destructive">Failed to load user.</p>
      </div>
    );
  }

  const u = userData;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4 mr-2" /> Users
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {u.display_name ?? u.phone_number}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{u.id}</p>
          </div>
        </div>

        {/* Quick status badges */}
        <div className="flex items-center gap-2 shrink-0">
          <VerificationBadge status={u.verification_status} />
          {u.is_admin && (
            <Badge className="bg-primary text-primary-foreground text-xs">Admin</Badge>
          )}
          {u.is_banned && (
            <Badge variant="destructive" className="text-xs">Banned</Badge>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Campaigns', value: u.campaign_count },
          { label: 'Donations', value: u.donation_count },
          { label: 'Total donated', value: formatUZS(u.total_donated) },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <CardContent className="text-center p-0">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Profile Details ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" /> Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={form.display_name ?? ''}
                onChange={(e) => set('display_name', e.target.value || null)}
                placeholder="No name set"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Phone className="size-3" /> Phone Number
              </Label>
              <Input
                value={form.phone_number ?? ''}
                onChange={(e) => set('phone_number', e.target.value)}
                placeholder="+998..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Calendar className="size-3" /> Date of Birth
              </Label>
              <Input
                type="date"
                value={form.date_of_birth ?? ''}
                onChange={(e) => set('date_of_birth', e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select
                value={form.gender ?? '_none'}
                onValueChange={(v) => set('gender', v === '_none' ? null : v as 'male' | 'female')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not set</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Globe className="size-3" /> Language
            </Label>
            <Select
              value={form.language_preference ?? 'uz'}
              onValueChange={(v) => set('language_preference', v as 'uz' | 'ru' | 'en')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">Uzbek (uz)</SelectItem>
                <SelectItem value="ru">Russian (ru)</SelectItem>
                <SelectItem value="en">English (en)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bio</Label>
            <Textarea
              value={form.bio ?? ''}
              onChange={(e) => set('bio', e.target.value || null)}
              placeholder="No bio set"
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Verification & Status ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="size-4" /> Verification &amp; Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Verification Status</Label>
              <Select
                value={form.verification_status ?? 'none'}
                onValueChange={(v) => {
                  const vs = v as VerificationStatus;
                  set('verification_status', vs);
                  // Auto-sync is_verified
                  set('is_verified', vs === VerificationStatus.APPROVED);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VerificationStatus).map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="is-verified" className="text-xs">Is Verified</Label>
                <Switch
                  id="is-verified"
                  checked={form.is_verified ?? false}
                  onCheckedChange={(v) => {
                    set('is_verified', v);
                    if (v && form.verification_status !== VerificationStatus.APPROVED) set('verification_status', VerificationStatus.APPROVED);
                    if (!v && form.verification_status === VerificationStatus.APPROVED) set('verification_status', VerificationStatus.NONE);
                  }}
                />
              </div>
            </div>
          </div>

          {/* OneID info (read-only) */}
          {u.oneid_id && (
            <div className="rounded-lg bg-muted p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">OneID Verified</p>
              <p>OneID: <span className="font-mono">{u.oneid_id}</span></p>
              {u.oneid_verified_at && <p>Verified at: {formatDate(u.oneid_verified_at)}</p>}
            </div>
          )}

          {/* Metadata (read-only) */}
          <div className="rounded-lg bg-muted p-3 text-xs space-y-1 text-muted-foreground">
            <p>Joined: {formatDate(u.created_at)}</p>
            <p>Last updated: {formatDate(u.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Roles & Access ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Roles &amp; Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Admin</p>
              <p className="text-xs text-muted-foreground">Full access to the admin panel</p>
            </div>
            <div className="flex items-center gap-2">
              {u.is_admin ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => setConfirmDialog('revokeAdmin')}
                  disabled={isBusy}
                >
                  <ShieldOff className="size-3.5 mr-1.5" /> Revoke Admin
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog('makeAdmin')}
                  disabled={isBusy}
                >
                  <ShieldCheck className="size-3.5 mr-1.5" /> Make Admin
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Account Ban</p>
              <p className="text-xs text-muted-foreground">Prevents login and all platform activity</p>
            </div>
            <div className="flex items-center gap-2">
              {u.is_banned ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog('unban')}
                  disabled={isBusy}
                >
                  <UserCheck className="size-3.5 mr-1.5" /> Unban User
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDialog('ban')}
                  disabled={isBusy}
                >
                  <Ban className="size-3.5 mr-1.5" /> Ban User
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Save button ─────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          onClick={() => setConfirmDialog('save')}
          disabled={isBusy}
        >
          {isBusy ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-4" /> Save Changes
            </span>
          )}
        </Button>
      </div>

      {/* ── Confirm Dialog ──────────────────────────────────── */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => { if (!open) { setConfirmDialog(null); setBanReason(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog === 'save' && 'Save changes?'}
              {confirmDialog === 'ban' && 'Ban this user?'}
              {confirmDialog === 'unban' && 'Unban this user?'}
              {confirmDialog === 'makeAdmin' && 'Grant admin access?'}
              {confirmDialog === 'revokeAdmin' && 'Revoke admin access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog === 'save' && (
                <>Apply all edits to <strong>{u.display_name ?? u.phone_number}</strong>?</>
              )}
              {confirmDialog === 'ban' && (
                <>This will immediately prevent <strong>{u.display_name ?? u.phone_number}</strong> from logging in.</>
              )}
              {confirmDialog === 'unban' && (
                <>Restore access for <strong>{u.display_name ?? u.phone_number}</strong>?</>
              )}
              {confirmDialog === 'makeAdmin' && (
                <><strong>{u.display_name ?? u.phone_number}</strong> will have full admin panel access.</>
              )}
              {confirmDialog === 'revokeAdmin' && (
                <>Remove admin access from <strong>{u.display_name ?? u.phone_number}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmDialog === 'ban' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Ban reason (optional)</Label>
              <Textarea
                placeholder="Reason for ban…"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isBusy}
              className={
                confirmDialog === 'ban'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : confirmDialog === 'revokeAdmin'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : ''
              }
            >
              {isBusy ? 'Processing…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
