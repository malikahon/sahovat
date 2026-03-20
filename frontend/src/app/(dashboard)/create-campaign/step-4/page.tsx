'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, Plus, FileText } from 'lucide-react';

import { campaignsApi } from '@/lib/api';
import { DocumentType } from '@/lib/types';
import type { CampaignDocument } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const MAX_DOCUMENTS = 15;

export default function Step4Page() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <Step4Content />
    </Suspense>
  );
}

function Step4Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const t = useTranslations('campaigns');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(
    DocumentType.OTHER,
  );
  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Redirect to step 1 if no campaign id
  useEffect(() => {
    if (!campaignId) {
      router.replace('/create-campaign/step-1');
    }
  }, [campaignId, router]);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['campaign-documents', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.listDocuments(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.documents;
    },
    enabled: !!campaignId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: () =>
      campaignsApi.uploadDocument(
        campaignId!,
        selectedFile!,
        documentType,
        notes || undefined,
      ),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['campaign-documents', campaignId],
        });
        setSelectedFile(null);
        setDocumentType(DocumentType.OTHER);
        setNotes('');
        setShowAddForm(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (docId: string) =>
      campaignsApi.deleteDocument(campaignId!, docId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['campaign-documents', campaignId],
        });
      }
    },
  });

  if (!campaignId) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canAddMore = documents.length < MAX_DOCUMENTS;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('wizard.documents')}</p>
            <p className="text-xs text-muted-foreground">
              {t('wizard.documentsHint')}
            </p>
          </div>

          {/* Document list */}
          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {t('wizard.noDocuments')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: CampaignDocument) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {t(`wizard.documentTypes.${doc.document_type}`)}
                      </Badge>
                      {doc.notes && (
                        <span className="truncate text-xs text-muted-foreground">
                          {doc.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Max documents message */}
          {!canAddMore && (
            <p className="text-xs text-muted-foreground">
              {t('wizard.maxDocuments')}
            </p>
          )}

          {/* Add document form */}
          {showAddForm && canAddMore ? (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label htmlFor="doc-file">File</Label>
                <input
                  ref={fileInputRef}
                  id="doc-file"
                  type="file"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-type">{t('wizard.documentType')}</Label>
                <select
                  id="doc-type"
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as DocumentType)
                  }
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.values(DocumentType).map((type) => (
                    <option key={type} value={type}>
                      {t(`wizard.documentTypes.${type}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-notes">{t('wizard.documentNotes')}</Label>
                <Textarea
                  id="doc-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {uploadMutation.error && (
                <p className="text-sm text-destructive">
                  {uploadMutation.error.message}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedFile || uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadMutation.isPending && (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                  {t('wizard.addDocument')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedFile(null);
                    setNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            canAddMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="size-4" />
                {t('wizard.addDocument')}
              </Button>
            )
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/create-campaign/step-1?id=${campaignId}`)}
          >
            ← {t('wizard.step1')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/create-campaign/step-2?id=${campaignId}`)}
          >
            ← {t('wizard.step2')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/create-campaign/step-3?id=${campaignId}`)}
          >
            ← {t('wizard.step3')}
          </Button>
        </div>
        <Button
          type="button"
          onClick={() =>
            router.push(`/create-campaign/step-5?id=${campaignId}`)
          }
        >
          {t('wizard.step5')} →
        </Button>
      </div>
    </div>
  );
}
