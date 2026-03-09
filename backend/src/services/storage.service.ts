import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { storagePaths } from '../config/storage.js';
import { AppError, NotFoundError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Interface (mirrors types/services.ts — defined inline to avoid circular deps
// during bootstrap)
// ---------------------------------------------------------------------------

export interface StorageService {
  savePublic(file: Buffer, filename: string, mimetype: string): Promise<string>;
  savePrivate(file: Buffer, filename: string, mimetype: string): Promise<string>;
  getPrivate(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getPublicUrl(relativePath: string): string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_FILENAME_LENGTH = 200;

/**
 * Strip everything except alphanumerics, hyphens, underscores, and dots.
 * Collapse consecutive dots/hyphens. Trim length.
 */
function sanitizeFilename(raw: string): string {
  const ext = path.extname(raw);
  const base = path.basename(raw, ext);

  const clean = base
    .replace(/[^a-zA-Z0-9_-]/g, '-') // replace special chars with hyphen
    .replace(/-{2,}/g, '-')           // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')          // trim leading/trailing hyphens
    .slice(0, MAX_FILENAME_LENGTH);

  const safeExt = ext
    .replace(/[^a-zA-Z0-9.]/g, '')
    .slice(0, 10);

  return `${clean || 'file'}${safeExt}`;
}

/**
 * Choose a subdirectory based on MIME type.
 */
function subdirectoryForMime(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype === 'application/pdf') return 'documents';
  return 'other';
}

/**
 * Generate a unique on-disk filename.
 */
function uniqueFilename(originalName: string): string {
  return `${randomUUID()}-${sanitizeFilename(originalName)}`;
}

/**
 * Resolve `candidate` under `root` and ensure it doesn't escape `root`.
 * Returns the resolved absolute path or throws.
 */
function resolveSecure(root: string, candidate: string): string {
  const resolved = path.resolve(root, candidate);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new AppError('Invalid file path', 400, 'INVALID_PATH');
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class LocalStorageService implements StorageService {
  private readonly publicRoot: string;
  private readonly privateRoot: string;
  private readonly publicUrl: string;

  constructor() {
    this.publicRoot = storagePaths.publicPath;
    this.privateRoot = storagePaths.privatePath;
    this.publicUrl = storagePaths.publicUrl.replace(/\/+$/, ''); // strip trailing slash
  }

  // ---- public files -------------------------------------------------------

  async savePublic(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string> {
    const subdir = subdirectoryForMime(mimetype);
    const unique = uniqueFilename(filename);
    const relativePath = path.join(subdir, unique);
    const absolutePath = path.join(this.publicRoot, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file);

    return this.getPublicUrl(relativePath);
  }

  // ---- private files ------------------------------------------------------

  async savePrivate(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string> {
    const subdir = subdirectoryForMime(mimetype);
    const unique = uniqueFilename(filename);
    const relativePath = path.join(subdir, unique);
    const absolutePath = path.join(this.privateRoot, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file);

    // Return the relative path (NOT a URL) — callers store this in DB
    return relativePath;
  }

  async getPrivate(filePath: string): Promise<Buffer> {
    const absolutePath = resolveSecure(this.privateRoot, filePath);

    try {
      return await fs.readFile(absolutePath);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        throw new NotFoundError('File not found');
      }
      throw err;
    }
  }

  // ---- delete (public or private) -----------------------------------------

  async delete(filePath: string): Promise<void> {
    // Determine root: if the path starts with the public root or looks like a
    // URL-relative public path, target publicRoot. Otherwise privateRoot.
    let absolutePath: string;

    if (path.isAbsolute(filePath)) {
      // Absolute path — verify it falls under one of our roots
      if (filePath.startsWith(this.publicRoot + path.sep)) {
        absolutePath = filePath;
      } else if (filePath.startsWith(this.privateRoot + path.sep)) {
        absolutePath = filePath;
      } else {
        throw new AppError('Invalid file path', 400, 'INVALID_PATH');
      }
    } else {
      // Relative path — try private first (private paths are always stored as
      // relative), fall back to public.
      const privateCandid = resolveSecure(this.privateRoot, filePath);
      const publicCandid = resolveSecure(this.publicRoot, filePath);

      try {
        await fs.access(privateCandid);
        absolutePath = privateCandid;
      } catch {
        absolutePath = publicCandid;
      }
    }

    try {
      await fs.unlink(absolutePath);
    } catch (err: unknown) {
      // Swallow ENOENT — file already gone
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return;
      }
      throw err;
    }
  }

  // ---- URL helper ---------------------------------------------------------

  getPublicUrl(relativePath: string): string {
    // Normalize slashes (Windows compat) and trim leading slash/backslash
    const normalized = relativePath
      .split(path.sep)
      .join('/')
      .replace(/^\/+/, '');

    return `${this.publicUrl}/${normalized}`;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const storageService: StorageService = new LocalStorageService();
