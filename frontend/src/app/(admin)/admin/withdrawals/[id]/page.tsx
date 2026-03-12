'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

type PendingAction = 'approve' | 'reject' | 'complete' | null;

export default function AdminWithdrawalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: withdrawalId } = use(params);
  const t = useTranslations('admin.withdrawals');
  const queryClient = useQueryClient();

  const [adminNotes, setAdminNotes] = useState('');
  const [txRef, setTxRef] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-withdrawal', withdrawalId],
    queryFn: async () => {
      const res = await adminApi.getWithdrawal(withdrawalId);
      if (!res.success || !res.data) throw new Error('Failed to load');
      return res.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawal', withdrawalId] });
    queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
  };

  const actionMutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      if (action === 'approve') {
        return adminApi.reviewWithdrawal(withdrawalId, 'approve', adminNotes || undefined);
      } else if (action === 'reject') {
        return adminApi.reviewWithdrawal(withdrawalId, 'reject', adminNotes || undefined);
      } else if (action === 'complete') {
        if (!txRef.trim()) throw new Error(t('txRefRequired'));
        return adminApi.completeWithdrawal(withdrawalId, txRef.trim(), adminNotes || undefined);
      }
      throw new Error('Unknown action');
    },
    onSuccess: (_, action) => {
      const messages: Record<string, string> = {
        approve: t('approveSuccess'),
        reject: t('rejectSuccess'),
        complete: t('completeSuccess'),
      };
      toast.success(messages[action ?? ''] ?? 'Done');
      setPendingAction(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setPendingAction(null);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Withdrawal not found.
        <br />
        <Link href="/admin/withdrawals" className="mt-2 text-sm text-primary hover:underline">
          {t('backToQueue')}
        </Link>
      </div>
    );
  }

  const isPending = data.status === 'pending';
  const isApproved = data.status === 'approved';

  // Check name match
  const organizerName = (data.organizer_legal_name ?? '').trim().toLowerCase();
  const cardholderName = (data.cardholder_name ?? '').trim().toLowerCase();
  const namesMatch = organizerName && cardholderName && organizerName === cardholderName;
  const namesMismatch = organizerName && cardholderName && !namesMatch;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/admin/withdrawals"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('backToQueue')}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('details')}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">{data.id}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Name comparison warning (10.4) */}
      <Card className={namesMismatch ? 'border-red-200 bg-red-50' : namesMatch ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            {namesMismatch ? (
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
            ) : namesMatch ? (
              <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium">{t('nameMatchNote')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('matchWarning')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-background p-2">
                  <p className="text-muted-foreground">{t('organizerLegalName')}</p>
                  <p className="font-semibold mt-0.5">{data.organizer_legal_name ?? '—'}</p>
                </div>
                <div className="rounded bg-background p-2">
                  <p className="text-muted-foreground">{t('cardHolder')}</p>
                  <p className="font-semibold mt-0.5">{data.cardholder_name}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label={t('organizer')} value={
            <span>
              <span className="block">{data.organizer_display_name ?? '—'}</span>
              <span className="text-muted-foreground text-xs">{data.organizer_phone}</span>
            </span>
          } />
          <InfoRow label={t('campaign')} value={data.campaign_title} />
          <InfoRow label={t('requestedAmount')} value={formatUZS(data.amount)} mono />
          <InfoRow label={t('platformFee')} value={
            <span className="text-red-600">−{formatUZS(data.platform_fee)}</span>
          } />
          <InfoRow label={t('netAmount')} value={
            <span className="text-green-600 font-bold">{formatUZS(data.net_amount)}</span>
          } />
          <InfoRow label={t('cardMasked')} value={data.card_number_masked} mono />
          <InfoRow label={t('requestedAt')} value={formatDate(data.created_at)} />
          {data.reviewed_at && (
            <InfoRow label={t('reviewedAt')} value={formatDate(data.reviewed_at)} />
          )}
          {data.completed_at && (
            <InfoRow label={t('completedAt')} value={formatDate(data.completed_at)} />
          )}
          {data.transaction_reference && (
            <InfoRow label={t('txRef')} value={data.transaction_reference} mono />
          )}
          {data.admin_notes && (
            <InfoRow label={t('adminNotes')} value={data.admin_notes} />
          )}
        </CardContent>
      </Card>

      {/* Action panel — only show for pending/approved */}
      {(isPending || isApproved) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Admin notes field */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-notes">{t('adminNotes')}</Label>
              <Textarea
                id="admin-notes"
                placeholder="Optional notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Transaction reference (for complete) */}
            {isApproved && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-ref">{t('txRef')} *</Label>
                <Input
                  id="tx-ref"
                  placeholder="e.g. TXN123456789"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {isPending && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setPendingAction('approve')}
                  disabled={actionMutation.isPending}
                >
                  {t('approve')}
                </Button>
              )}
              {isPending && (
                <Button
                  variant="destructive"
                  onClick={() => setPendingAction('reject')}
                  disabled={actionMutation.isPending}
                >
                  {t('reject')}
                </Button>
              )}
              {isApproved && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setPendingAction('complete')}
                  disabled={actionMutation.isPending || !txRef.trim()}
                >
                  {t('complete')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialogs */}
      <AlertDialog
        open={pendingAction === 'approve'}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('approveConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Approving will allow the organizer to receive {formatUZS(data.net_amount)} (after {formatUZS(data.platform_fee)} platform fee).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => actionMutation.mutate('approve')}
            >
              {t('approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAction === 'reject'}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rejectConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the withdrawal request. The organizer will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => actionMutation.mutate('reject')}
            >
              {t('reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAction === 'complete'}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('completeConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              This records that {formatUZS(data.net_amount)} has been transferred to {data.card_number_masked}.
              Transaction ref: {txRef}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => actionMutation.mutate('complete')}
            >
              {t('complete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
