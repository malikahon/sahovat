'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, XCircle, Clock, FileText, Bot,
  AlertTriangle, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// ============================================================
// Types
// ============================================================

interface VerificationDocument {
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
}

// ============================================================
// Helpers
// ============================================================

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  drivers_license: "Driver's License",
  identity: 'Identity Doc',
  other: 'Other',
};

function docTypeLabel(type: string) {
  return DOC_TYPE_LABELS[type] ?? type;
}

// ============================================================
// Status badge
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const icon =
    status === 'approved' ? <CheckCircle className="size-3" /> :
    status === 'rejected' ? <XCircle className="size-3" /> :
    <Clock className="size-3" />;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {icon}
      {status}
    </span>
  );
}

// ============================================================
// AI status badge
// ============================================================

function AiStatusBadge({ aiStatus, confidence }: { aiStatus: string | null; confidence: number | null }) {
  if (!aiStatus || aiStatus === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        <Bot className="size-3" /> AI: processing…
      </span>
    );
  }
  if (aiStatus === 'auto_approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <Bot className="size-3" /> AI approved ({confidence != null ? `${(confidence * 100).toFixed(0)}%` : '—'})
      </span>
    );
  }
  if (aiStatus === 'auto_rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="size-3" /> AI flagged — name mismatch ({confidence != null ? `${(confidence * 100).toFixed(0)}%` : '—'})
      </span>
    );
  }
  if (aiStatus === 'needs_review') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
        <Bot className="size-3" /> AI: needs manual review
      </span>
    );
  }
  return null;
}

// ============================================================
// Document row
// ============================================================

function DocumentRow({
  doc,
  onReview,
}: {
  doc: VerificationDocument;
  onReview: (doc: VerificationDocument) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-medium text-foreground">
            {doc.user_display_name ?? 'Unknown'} — {doc.user_phone}
          </p>
        </div>

        {/* Claimed legal name */}
        {(doc.legal_first_name || doc.legal_last_name) && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Legal name: </span>
            {[doc.legal_first_name, doc.legal_last_name].filter(Boolean).join(' ')}
          </p>
        )}

        <p className="truncate text-xs text-muted-foreground">
          {docTypeLabel(doc.document_type)} · {doc.original_filename ?? '—'} · {formatDate(doc.uploaded_at)}
        </p>

        {/* AI status */}
        <AiStatusBadge aiStatus={doc.ai_status} confidence={doc.ai_confidence} />

        {doc.reviewer_notes && (
          <p className="text-xs text-muted-foreground">Notes: {doc.reviewer_notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge status={doc.status} />
        {doc.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => onReview(doc)}>
            Review
          </Button>
        )}
        {doc.status !== 'pending' && (
          <Button size="sm" variant="ghost" onClick={() => onReview(doc)}>
            <Eye className="size-3.5 mr-1" />
            View
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Document preview (image or PDF)
// ============================================================

function DocumentPreview({ docId }: { docId: string }) {
  const fileUrl = adminApi.getVerificationDocumentFileUrl(docId);
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    // Fallback — open in new tab (works for PDFs)
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center gap-2">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Preview not available for this file type.</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-muted">
      {/* Try rendering as image first; on error show PDF fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl}
        alt="Verification document"
        className="max-h-72 w-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// ============================================================
// Review / View dialog
// ============================================================

function ReviewDialog({
  doc,
  onClose,
  onDecision,
  isPending,
  error,
}: {
  doc: VerificationDocument;
  onClose: () => void;
  onDecision: (decision: 'approved' | 'rejected', notes: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [reviewNotes, setReviewNotes] = useState(doc.reviewer_notes ?? '');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const isReadOnly = doc.status !== 'pending';

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isReadOnly ? 'Verification Document' : 'Review Verification Document'}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* User info */}
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p><span className="font-medium">User:</span> {doc.user_display_name ?? 'Unknown'} ({doc.user_phone})</p>
          <p><span className="font-medium">Document type:</span> {docTypeLabel(doc.document_type)}</p>
          {(doc.legal_first_name || doc.legal_last_name) && (
            <p>
              <span className="font-medium">Claimed legal name:</span>{' '}
              {[doc.legal_first_name, doc.legal_last_name].filter(Boolean).join(' ')}
            </p>
          )}
          <p><span className="font-medium">File:</span> {doc.original_filename ?? '—'}</p>
          <p><span className="font-medium">Uploaded:</span> {formatDate(doc.uploaded_at)}</p>
          {doc.reviewed_at && (
            <p><span className="font-medium">Reviewed:</span> {formatDate(doc.reviewed_at)}</p>
          )}
        </div>

        {/* Document preview */}
        <DocumentPreview docId={doc.id} />

        {/* AI result */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            <p className="text-xs font-medium">AI Verification Result</p>
          </div>
          <AiStatusBadge aiStatus={doc.ai_status} confidence={doc.ai_confidence} />

          {doc.ai_extracted_text && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowExtractedText((v) => !v)}
              >
                {showExtractedText ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                {showExtractedText ? 'Hide' : 'Show'} extracted text
              </button>
              {showExtractedText && (
                <pre className="mt-2 max-h-32 overflow-y-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap text-muted-foreground">
                  {doc.ai_extracted_text}
                </pre>
              )}
            </div>
          )}

          {(doc.ai_status === 'auto_approved' || doc.ai_status === 'auto_rejected') && (
            <p className="text-[11px] text-muted-foreground">
              Admin can override the AI decision below.
            </p>
          )}
        </div>

        {/* Status badge for already-reviewed docs */}
        {isReadOnly && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <StatusBadge status={doc.status} />
          </div>
        )}

        {/* Reviewer notes */}
        <div className="space-y-1.5">
          <Label htmlFor="reviewer-notes" className="text-xs">
            {isReadOnly ? 'Reviewer Notes' : 'Notes for user (optional)'}
          </Label>
          <Textarea
            id="reviewer-notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={isReadOnly ? '—' : 'Explain reason for rejection or add notes…'}
            rows={3}
            className="resize-none text-sm"
            disabled={isReadOnly}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {!isReadOnly && (
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDecision('rejected', reviewNotes)}
            disabled={isPending}
          >
            <XCircle className="size-4 mr-1.5" />
            Reject
          </Button>
          <Button
            onClick={() => onDecision('approved', reviewNotes)}
            disabled={isPending}
          >
            <CheckCircle className="size-4 mr-1.5" />
            Approve
          </Button>
        </DialogFooter>
      )}

      {isReadOnly && (
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      )}
    </DialogContent>
  );
}

// ============================================================
// Main page
// ============================================================

export default function VerificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewDoc, setReviewDoc] = useState<VerificationDocument | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-verification-documents', activeTab],
    queryFn: async () => {
      const status = activeTab === 'all' ? undefined : activeTab;
      const res = await adminApi.listVerificationDocuments(status);
      if (!res.success || !res.data) return { documents: [] };
      return res.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const res = await adminApi.reviewVerificationDocument(id, decision, notes);
      if (!res.success) throw new Error(res.error ?? 'Failed to review');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verification-documents'] });
      setReviewDoc(null);
      setReviewError(null);
    },
    onError: (err) => {
      setReviewError(err.message);
    },
  });

  const documents = data?.documents ?? [];

  const pendingCount = documents.filter((d) => d.status === 'pending').length;

  const handleDecision = (decision: 'approved' | 'rejected', notes: string) => {
    if (!reviewDoc) return;
    reviewMutation.mutate({ id: reviewDoc.id, decision, notes: notes || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Identity Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review user-submitted identity documents. AI pre-screens each upload — you can override any AI decision.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Bot className="size-3.5" /> AI processes each upload automatically</span>
        <span className="flex items-center gap-1"><CheckCircle className="size-3.5 text-green-600" /> Auto-approved if name matches with high confidence</span>
        <span className="flex items-center gap-1"><AlertTriangle className="size-3.5 text-red-500" /> Flagged if name not found (still requires admin review)</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingCount > 0 && activeTab !== 'pending' && (
              <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No documents in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onReview={(d) => {
                    setReviewDoc(d);
                    setReviewError(null);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review / view dialog */}
      <Dialog
        open={reviewDoc !== null}
        onOpenChange={(open) => { if (!open) { setReviewDoc(null); setReviewError(null); } }}
      >
        {reviewDoc && (
          <ReviewDialog
            doc={reviewDoc}
            onClose={() => { setReviewDoc(null); setReviewError(null); }}
            onDecision={handleDecision}
            isPending={reviewMutation.isPending}
            error={reviewError}
          />
        )}
      </Dialog>
    </div>
  );
}
