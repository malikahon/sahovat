/**
 * File upload middleware using multer
 * Handles ID document uploads for user verification
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from './errorHandler';

// Configure storage for verification documents
const verificationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/verification');
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for verification documents (images and PDFs)
const verificationFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.', 400));
  }
};

// Multer instance for verification document upload
export const uploadVerificationDocument = multer({
  storage: verificationStorage,
  fileFilter: verificationFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for verification documents
  },
});

// Configure storage for fundraiser documents
const fundraiserStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/fundraisers');
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for fundraiser documents
const fundraiserFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type.', 400));
  }
};

// Multer instance for fundraiser document upload
export const uploadFundraiserDocument = multer({
  storage: fundraiserStorage,
  fileFilter: fundraiserFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});
