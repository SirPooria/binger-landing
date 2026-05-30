import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';
import type { StorageProvider, StoragePutInput, StoragePutResult } from './types.js';

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  return map[mime.toLowerCase()] ?? '.bin';
}

export function createLocalStorage(): StorageProvider {
  const uploadDir = config.storage.uploadDir;
  const baseUrl = config.storage.publicUploadBaseUrl.replace(/\/$/, '');

  return {
    async put({ buffer, mimeType }: StoragePutInput): Promise<StoragePutResult> {
      await fs.mkdir(uploadDir, { recursive: true });
      const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extFromMime(mimeType)}`;
      await fs.writeFile(path.join(uploadDir, key), buffer);
      return { url: `${baseUrl}/${key}`, key };
    },
  };
}
