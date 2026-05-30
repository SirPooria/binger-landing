import { config } from '../config.js';
import { createGcsStorage } from './gcs.js';
import { createLocalStorage } from './local.js';
import type { StorageProvider } from './types.js';

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    provider = config.storage.driver === 'gcs' ? createGcsStorage() : createLocalStorage();
  }
  return provider;
}
