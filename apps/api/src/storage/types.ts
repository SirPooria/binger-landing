export interface StoragePutInput {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

export interface StoragePutResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  put(input: StoragePutInput): Promise<StoragePutResult>;
}
