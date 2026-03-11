'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Upload, ImageIcon } from 'lucide-react';

import { campaignsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function Step3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const t = useTranslations('campaigns');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Redirect to step 1 if no campaign id
  useEffect(() => {
    if (!campaignId) {
      router.replace('/create-campaign/step-1');
    }
  }, [campaignId, router]);

  // Load existing campaign
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.get(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.campaign;
    },
    enabled: !!campaignId,
  });

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => campaignsApi.uploadCoverImage(campaignId!, file),
    onSuccess: (result) => {
      if (result.success) {
        router.push(`/create-campaign/step-4?id=${campaignId}`);
      }
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Please select a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setFileError('File size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleSkip = () => {
    router.push(`/create-campaign/step-4?id=${campaignId}`);
  };

  if (!campaignId) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentImageUrl = previewUrl || campaign?.cover_image_url;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('wizard.coverImage')}</p>
          <p className="text-xs text-muted-foreground">
            {t('wizard.coverImageHint')}
          </p>
        </div>

        {/* Image preview / upload area */}
        <div
          className="relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
          onClick={() => fileInputRef.current?.click()}
        >
          {currentImageUrl ? (
            <div className="space-y-3 text-center">
              <img
                src={currentImageUrl}
                alt="Cover preview"
                className="mx-auto max-h-64 rounded-lg object-cover"
              />
              <p className="text-xs text-muted-foreground">
                {t('wizard.coverImageReplace')}
              </p>
            </div>
          ) : (
            <>
              <ImageIcon className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t('wizard.coverImageUpload')}
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {fileError && (
          <p className="text-sm text-destructive">{fileError}</p>
        )}

        {uploadMutation.error && (
          <p className="text-sm text-destructive">
            {uploadMutation.error.message}
          </p>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(`/create-campaign/step-2?id=${campaignId}`)
            }
          >
            {t('wizard.step2')}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button
              type="button"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={handleSubmit}
            >
              {uploadMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              <Upload className="size-4" />
              {t('wizard.saveDraft')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
