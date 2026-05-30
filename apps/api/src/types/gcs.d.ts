declare module '@google-cloud/storage' {
  export class Storage {
    bucket(name: string): {
      file(key: string): {
        save(data: Buffer, opts?: Record<string, unknown>): Promise<void>;
        makePublic(): Promise<void>;
      };
    };
  }
}
