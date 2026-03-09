import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './env.js';

export const storagePaths = {
  publicPath: resolve(env.PUBLIC_STORAGE_PATH),
  privatePath: resolve(env.PRIVATE_STORAGE_PATH),
  publicUrl: env.PUBLIC_STORAGE_URL,
} as const;

// Create storage directories if they don't exist
mkdirSync(storagePaths.publicPath, { recursive: true });
mkdirSync(storagePaths.privatePath, { recursive: true });
