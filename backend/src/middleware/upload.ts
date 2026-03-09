import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { BadRequestError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Allowed MIME sets
// ---------------------------------------------------------------------------

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const IMAGE_AND_PDF_MIMES = new Set([
  ...IMAGE_MIMES,
  'application/pdf',
]);

// ---------------------------------------------------------------------------
// File-filter factory
// ---------------------------------------------------------------------------

function createFileFilter(
  allowedMimes: Set<string>,
  label: string,
): (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      const allowed = [...allowedMimes].join(', ');
      cb(
        new BadRequestError(
          `Invalid file type for ${label}. Received "${file.mimetype}". Allowed: ${allowed}`,
          'INVALID_FILE_TYPE',
        ),
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Storage engine — memory (buffers are passed to StorageService later)
// ---------------------------------------------------------------------------

const memoryStorage = multer.memoryStorage();

// ---------------------------------------------------------------------------
// Multer instances
// ---------------------------------------------------------------------------

const campaignImageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: createFileFilter(IMAGE_MIMES, 'campaign image'),
});

const campaignDocumentsUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: createFileFilter(IMAGE_AND_PDF_MIMES, 'campaign document'),
});

const avatarUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: createFileFilter(IMAGE_MIMES, 'avatar'),
});

const kycDocumentUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: createFileFilter(IMAGE_AND_PDF_MIMES, 'KYC document'),
});

// ---------------------------------------------------------------------------
// Middleware exports
// ---------------------------------------------------------------------------

/** Single campaign image — max 5 MB, image only (jpeg/png/webp). */
export const uploadCampaignImage = campaignImageUpload.single('image');

/** Up to 15 campaign documents — max 10 MB each, image + PDF. */
export const uploadCampaignDocuments = campaignDocumentsUpload.array('documents', 15);

/** Single avatar — max 2 MB, image only (jpeg/png/webp). */
export const uploadAvatar = avatarUpload.single('avatar');

/** Single KYC document — max 10 MB, image + PDF. */
export const uploadKycDocument = kycDocumentUpload.single('document');
