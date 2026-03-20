'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, XCircle, Clock, Bot, AlertTriangle } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/formatters';

// ============================================================
// Document type options
// ============================================================

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

// ============================================================
// DocumentUploadSection
// ============================================================

export function DocumentUploadSection() {
  const t = useTranslations('verification');
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState<DocumentType>('passport');
  const [legalFirstName, setLegalFirstName] = useState('');
  const [legalLastName, setLegalLastName] = useState('');

  // Validation
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});

  // Fetch existing documents
  const { data, isLoading } = useQuery({
    queryKey: ['verification-documents'],
    queryFn: async () => {
      const res = await usersApi.getVerificationDocuments();
      if (!res.success || !res.data) return { documents: [] };
      return res.data;
    },
  });

  const documents = data?.documents ?? [];

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!legalFirstName.trim()) errors.firstName = 'First name is required';
    if (!legalLastName.trim()) errors.lastName = 'Last name is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadClick = () => {
    if (!validate()) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Re-validate in case fields were cleared after clicking
    if (!validate()) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const result = await usersApi.uploadVerificationDocument(
        file,
        documentType,
        legalFirstName.trim(),
        legalLastName.trim(),
      );
      if (result.success) {
        setUploadSuccess(true);
        // Refresh user to get updated verification_status
        await refreshUser();
        // Refetch document list
        await queryClient.invalidateQueries({ queryKey: ['verification-documents'] });
        // Clear success message after 5s
        setTimeout(() => setUploadSuccess(false), 5000);
      } else {
        setUploadError(result.error ?? t('documentUploadError'));
      }
    } catch {
      setUploadError(t('documentUploadError'));
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="size-3.5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="size-3.5 text-red-500" />;
    return <Clock className="size-3.5 text-yellow-500" />;
  };

  const getStatusVariant = (status: string): 'default' | 'outline' | 'destructive' | 'secondary' => {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  };

  const getAiStatusBadge = (aiStatus: string | null | undefined) => {
    if (!aiStatus || aiStatus === 'pending') return null;
    if (aiStatus === 'auto_approved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
          <Bot className="size-3" /> AI approved
        </span>
      );
    }
    if (aiStatus === 'auto_rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
          <AlertTriangle className="size-3" /> AI flagged
        </span>
      );
    }
    if (aiStatus === 'needs_review') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
          <Bot className="size-3" /> Needs review
        </span>
      );
    }
    return null;
  };

  const docTypeLabel = (type: string) =>
    DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? type;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-5" />
          {t('documentUploadTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('documentUploadDescription')}
        </p>

        {/* Instructions */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-medium">Requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Accepted documents: Passport, National ID, or Driver&apos;s License</li>
            <li>The name on the document must exactly match your legal name below</li>
            <li>File must be a clear photo or scan (JPEG, PNG, WEBP, or PDF, max 10 MB)</li>
          </ul>
        </div>

        {/* Document type selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Document Type</Label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((dt) => (
              <button
                key={dt.value}
                type="button"
                onClick={() => setDocumentType(dt.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  documentType === dt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legal name inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="legal-first-name" className="text-xs font-medium">
              Legal First Name
            </Label>
            <Input
              id="legal-first-name"
              placeholder="As on document"
              value={legalFirstName}
              onChange={(e) => {
                setLegalFirstName(e.target.value);
                if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: undefined }));
              }}
              className={`h-9 text-sm ${fieldErrors.firstName ? 'border-destructive' : ''}`}
            />
            {fieldErrors.firstName && (
              <p className="text-[11px] text-destructive">{fieldErrors.firstName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legal-last-name" className="text-xs font-medium">
              Legal Last Name
            </Label>
            <Input
              id="legal-last-name"
              placeholder="As on document"
              value={legalLastName}
              onChange={(e) => {
                setLegalLastName(e.target.value);
                if (fieldErrors.lastName) setFieldErrors((p) => ({ ...p, lastName: undefined }));
              }}
              className={`h-9 text-sm ${fieldErrors.lastName ? 'border-destructive' : ''}`}
            />
            {fieldErrors.lastName && (
              <p className="text-[11px] text-destructive">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        {uploadSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4" />
              <div>
                <p className="font-medium">{t('documentUploadSuccess')}</p>
                <p className="text-xs mt-0.5 text-green-700">
                  Our AI is verifying your document in the background. You&apos;ll be notified once complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('documentUploading')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="size-4" />
              {t('documentUploadButton')}
            </span>
          )}
        </Button>

        {/* Document history */}
        {!isLoading && documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('documentHistory')}</p>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {docTypeLabel(doc.document_type)} — {doc.original_filename ?? 'document'}
                    </p>
                    {(doc.legal_first_name || doc.legal_last_name) && (
                      <p className="text-[11px] text-muted-foreground">
                        Name: {[doc.legal_first_name, doc.legal_last_name].filter(Boolean).join(' ')}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(doc.uploaded_at)}
                    </p>
                    {doc.reviewer_notes && (
                      <p className="text-[11px] text-muted-foreground">
                        {t('documentReviewerNotes', { notes: doc.reviewer_notes })}
                      </p>
                    )}
                    {getAiStatusBadge(doc.ai_status)}
                  </div>
                  <Badge
                    variant={getStatusVariant(doc.status)}
                    className="shrink-0 text-[11px]"
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(doc.status)}
                      {t(`documentStatus.${doc.status}`)}
                    </span>
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
