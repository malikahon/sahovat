'use client';

import { useState, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  XCircle,
  PauseCircle,
  Snowflake,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

type ActionType = 'approve' | 'reject' | 'request_info' | 'freeze';

const BACKEND_STORAGE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

function DocumentItem({ doc }: {
  doc: {
    id: string;
    document_type: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    is_private: boolean;
    notes: string | null;
    file_url: string;
    uploaded_at: string;
  }
}) {
  const isImage = doc.mime_type.startsWith('image/');
  const fileUrl = doc.file_url.startsWith('http')
    ? doc.file_url
    : `${BACKEND_STORAGE}${doc.file_url}`;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        {isImage ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs capitalize">
            {doc.document_type.replace('_', ' ')}
          </Badge>
          {doc.is_private && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              Private
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {(doc.file_size / 1024).toFixed(0)} KB
          </span>
        </div>
        {doc.notes && (
          <p className="mt-1 text-xs text-muted-foreground">{doc.notes}</p>
        )}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <Button variant="ghost" size="icon" className="size-7">
          <ExternalLink className="size-3.5" />
        </Button>
      </a>
    </div>
  );
}

export default function AdminCampaignReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('admin.campaigns');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'campaign', id],
    queryFn: () => adminApi.getCampaign(id),
  });

  const campaign = data?.data;

  async function handleAction(action: ActionType) {
    setLoading(true);
    try {
      let result;
      if (action === 'approve') {
        result = await adminApi.verifyCampaign(id, true, notes || undefined);
      } else if (action === 'reject') {
        result = await adminApi.verifyCampaign(id, false, notes || undefined);
      } else if (action === 'request_info') {
        result = await adminApi.updateCampaignStatus(id, 'paused', notes || undefined);
      } else if (action === 'freeze') {
        result = await adminApi.updateCampaignStatus(id, 'frozen', notes || undefined);
      }

      if (result?.success) {
        toast.success(
          action === 'approve' ? t('approveSuccess')
          : action === 'reject' ? t('rejectSuccess')
          : t('statusUpdated'),
        );
        queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'campaign', id] });
        router.push('/admin/campaigns');
      } else {
        toast.error(result?.error ?? 'Action failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
      setPendingAction(null);
      setNotes('');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Campaign not found.
      </div>
    );
  }

  const needsNotes = pendingAction === 'reject' || pendingAction === 'request_info' || pendingAction === 'freeze';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground line-clamp-1">{campaign.title}</h1>
          <p className="text-sm text-muted-foreground">{t('backToList')}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Campaign Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('campaignInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {campaign.cover_image_url && (
                <img
                  src={
                    campaign.cover_image_url.startsWith('http')
                      ? campaign.cover_image_url
                      : `${BACKEND_STORAGE}${campaign.cover_image_url}`
                  }
                  alt={campaign.title}
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-0.5 capitalize">{campaign.category}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="mt-0.5 capitalize">
                    {campaign.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Goal</p>
                  <p className="font-medium">{formatUZS(campaign.goal_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Raised</p>
                  <p className="font-medium">{formatUZS(campaign.current_amount)}</p>
                </div>
                {campaign.region && (
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="capitalize">{campaign.region}</p>
                  </div>
                )}
                {campaign.end_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p>{new Date(campaign.end_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-line line-clamp-6">
                  {campaign.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Creator Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('creatorInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>{campaign.creator_display_name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono">{campaign.creator_phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verification</span>
                <Badge
                  variant="outline"
                  className={
                    campaign.creator_verification_status === 'approved'
                      ? 'border-green-500 text-green-600'
                      : campaign.creator_verification_status === 'pending'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'text-muted-foreground'
                  }
                >
                  {campaign.creator_verification_status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Donors</span>
                <span>{campaign.donor_count}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Documents */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {t('documents')} ({campaign.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noDocuments')}</p>
              ) : (
                <div className="space-y-2">
                  {campaign.documents.map((doc) => (
                    <DocumentItem key={doc.id} doc={doc} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setPendingAction('approve')}
                >
                  <CheckCircle className="size-4 mr-2" />
                  {t('approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setPendingAction('reject')}
                >
                  <XCircle className="size-4 mr-2" />
                  {t('reject')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPendingAction('request_info')}
                >
                  <PauseCircle className="size-4 mr-2" />
                  {t('requestInfo')}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setPendingAction('freeze')}
                >
                  <Snowflake className="size-4 mr-2" />
                  {t('freeze')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => { if (!open) { setPendingAction(null); setNotes(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'approve' && t('approveConfirm')}
              {pendingAction === 'reject' && t('rejectConfirm')}
              {pendingAction === 'request_info' && t('requestInfo')}
              {pendingAction === 'freeze' && t('freezeConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Campaign: <strong>{campaign.title}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {needsNotes && (
            <div className="space-y-2 px-0">
              <Label className="text-sm">
                {t('adminNotes')}
                {pendingAction === 'reject' && ' *'}
              </Label>
              <Textarea
                placeholder={
                  pendingAction === 'reject'
                    ? t('rejectReason')
                    : t('adminNotes')
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && handleAction(pendingAction)}
              disabled={loading || (pendingAction === 'reject' && !notes.trim())}
              className={
                pendingAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : pendingAction === 'reject'
                  ? 'bg-destructive'
                  : ''
              }
            >
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
