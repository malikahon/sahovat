/**
 * OCR Service — Tesseract.js-based document text extraction and name matching.
 *
 * Architecture:
 *  - Uses a PERSISTENT Tesseract worker (createWorker) initialized once at startup.
 *    This avoids re-downloading language data (~9 MB) on every request and keeps
 *    WASM warm between calls.
 *  - Every recognize() call is wrapped in a 45-second timeout so a hung worker
 *    can never leave a document permanently in ai_status = 'pending'.
 *  - Worker errors are captured via the errorHandler option so they don't bubble
 *    up as unhandledRejection events (which would crash the Express process).
 *  - If the worker crashes or becomes unresponsive it is automatically replaced
 *    on the next request.
 *
 * PDF documents are not supported — flagged as needs_review for manual admin review.
 */

import Tesseract from 'tesseract.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcrDecision = 'auto_approved' | 'auto_rejected' | 'needs_review';

export interface OcrResult {
  decision: OcrDecision;
  confidence: number;   // 0.0 – 1.0
  extractedText: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum combined confidence to auto-approve. Set conservatively. */
const AUTO_APPROVE_THRESHOLD = 0.80;

/** Minimum raw Tesseract OCR quality to trust any result. */
const MIN_OCR_QUALITY = 50; // 0-100

/** Maximum ms to wait for Tesseract before giving up. */
const OCR_TIMEOUT_MS = 45_000;

// ---------------------------------------------------------------------------
// Persistent worker singleton
// ---------------------------------------------------------------------------

let workerPromise: Promise<Tesseract.Worker> | null = null;
let workerLastError: string | null = null;

/**
 * Local cache dir for traineddata so it's only downloaded once ever.
 * Stored alongside this file: backend/src/services/tessdata/
 */
const TESSDATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'tessdata',
);

function buildWorker(): Promise<Tesseract.Worker> {
  workerLastError = null;

  return Tesseract.createWorker('eng+rus', Tesseract.OEM.LSTM_ONLY, {
    // Cache downloaded language data locally so it's only fetched once
    cachePath: TESSDATA_DIR,
    // Suppress Tesseract's internal console noise
    logger: () => undefined,
    // Capture worker-level errors so they don't become unhandledRejections
    errorHandler: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OCR] Tesseract worker error (handled):', msg);
      workerLastError = msg;
      // Invalidate the singleton — next request will create a fresh worker
      workerPromise = null;
    },
  });
}

/**
 * Get (or lazily create) the persistent Tesseract worker.
 * If the previous worker reported an error it is discarded and replaced.
 */
function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    console.log('[OCR] Initializing Tesseract worker (eng+rus)…');
    workerPromise = buildWorker().then((w) => {
      console.log('[OCR] Tesseract worker ready');
      return w;
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OCR] Failed to initialize Tesseract worker:', msg);
      workerPromise = null; // allow retry next time
      throw err;
    });
  }
  return workerPromise;
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Invalidate the worker — it may be hung
      workerPromise = null;
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);

    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ---------------------------------------------------------------------------
// Name matching helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a string for comparison:
 * - lowercase, strip diacritics/accents
 * - remove Uzbek apostrophe variants (ʻ ʼ ' `)
 * - collapse everything non-alphanumeric to spaces
 */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`ʻʼ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Token-overlap score: fraction of name tokens found in the document text.
 * Uses both exact and substring matching to handle partial OCR reads.
 */
function nameMatchScore(nameFirst: string, nameLast: string, text: string): number {
  const normText = normalise(text);
  const textTokens = new Set(normText.split(' ').filter(Boolean));

  const nameTokens = [
    ...normalise(nameFirst).split(' '),
    ...normalise(nameLast).split(' '),
  ].filter((t) => t.length >= 2); // skip single-char tokens

  if (nameTokens.length === 0) return 0;

  let matched = 0;
  for (const token of nameTokens) {
    const found =
      textTokens.has(token) ||
      [...textTokens].some((t) => t.includes(token) || token.includes(t));
    if (found) matched++;
  }

  return matched / nameTokens.length;
}

// ---------------------------------------------------------------------------
// Main OCR function
// ---------------------------------------------------------------------------

/**
 * Run OCR on an image buffer and determine whether the claimed legal name
 * appears in the document text.
 *
 * @param imageBuffer  Raw image bytes (JPEG, PNG, WEBP)
 * @param legalFirst   User-provided legal first name
 * @param legalLast    User-provided legal last name
 * @param mimetype     MIME type — PDFs skip OCR and return needs_review
 */
export async function verifyDocumentName(
  imageBuffer: Buffer,
  legalFirst: string,
  legalLast: string,
  mimetype: string,
): Promise<OcrResult> {
  // PDFs: skip — Tesseract cannot process PDF natively
  if (mimetype === 'application/pdf') {
    return {
      decision: 'needs_review',
      confidence: 0,
      extractedText: '',
      error: 'PDF documents require manual review',
    };
  }

  let extractedText = '';
  let ocrQuality = 0;

  try {
    const worker = await withTimeout(getWorker(), OCR_TIMEOUT_MS, 'Worker init');

    const result = await withTimeout(
      worker.recognize(imageBuffer),
      OCR_TIMEOUT_MS,
      'OCR recognize',
    );

    extractedText = result.data.text ?? '';
    ocrQuality = result.data.confidence ?? 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[OCR] recognize failed:', message);
    return {
      decision: 'needs_review',
      confidence: 0,
      extractedText: '',
      error: `OCR failed: ${message}`,
    };
  }

  // If OCR quality is too low, don't trust the result
  if (ocrQuality < MIN_OCR_QUALITY) {
    return {
      decision: 'needs_review',
      confidence: ocrQuality / 100,
      extractedText,
      error: `Low OCR quality (${ocrQuality.toFixed(0)}%) — manual review required`,
    };
  }

  // If very little text was extracted the image is likely unreadable
  if (extractedText.trim().length < 10) {
    return {
      decision: 'needs_review',
      confidence: 0,
      extractedText,
      error: 'Too little text extracted — manual review required',
    };
  }

  const nameScore = nameMatchScore(legalFirst, legalLast, extractedText);

  // Combined confidence: 70% name match + 30% raw OCR quality
  const combinedConfidence = nameScore * 0.7 + (ocrQuality / 100) * 0.3;

  let decision: OcrDecision;
  if (combinedConfidence >= AUTO_APPROVE_THRESHOLD) {
    decision = 'auto_approved';
  } else if (nameScore === 0 && ocrQuality >= MIN_OCR_QUALITY) {
    // Name not found at all and OCR was good enough to trust the result
    decision = 'auto_rejected';
  } else {
    decision = 'needs_review';
  }

  return { decision, confidence: combinedConfidence, extractedText };
}

// ---------------------------------------------------------------------------
// Warm-up export (called at server startup so the first real request is fast)
// ---------------------------------------------------------------------------

/**
 * Pre-initialize the Tesseract worker at startup.
 * Downloads language data in the background; errors are logged but not fatal.
 */
export function warmUpOcr(): void {
  getWorker().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[OCR] Warm-up failed (will retry on first request):', msg);
  });
}
