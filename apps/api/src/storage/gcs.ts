import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
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

export function createGcsStorage(): StorageProvider {
  const bucketName = config.storage.gcsBucket;
  if (!bucketName) {
    throw new Error('[storage] GCS_BUCKET is required when STORAGE_DRIVER=gcs');
  }

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const publicBase = config.storage.publicUploadBaseUrl.replace(/\/$/, '');

  return {
    async put({ buffer, mimeType }: StoragePutInput): Promise<StoragePutResult> {
      const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extFromMime(mimeType)}`;
      const file = bucket.file(key);
      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: { cacheControl: 'public, max-age=31536000' },
      });
      try {
        await file.makePublic();
      } catch {
        // Bucket may use uniform access; PUBLIC_UPLOAD_BASE_URL should still resolve.
      }
      const url = publicBase ? `${publicBase}/${key}` : `https://storage.googleapis.com/${bucketName}/${key}`;
      return { url, key };
    },
  };
}
