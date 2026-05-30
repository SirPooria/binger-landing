import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

// The API source uses NodeNext-style `.js` import specifiers that actually
// point at `.ts` files. Vite doesn't rewrite those by default, so this small
// plugin maps `./foo.js` -> `./foo.ts` when the .ts file exists.
function jsToTs() {
  return {
    name: 'js-to-ts-resolver',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (importer && source.startsWith('.') && source.endsWith('.js')) {
        const candidate = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [jsToTs()],
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    // DB-backed integration tests must not run concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? 'localhost',
      POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5433',
      POSTGRES_DB: process.env.POSTGRES_DB ?? 'binger_test',
      POSTGRES_USER: process.env.POSTGRES_USER ?? 'binger_test',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? 'binger_test',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6380',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret',
      TMDB_API_KEY: process.env.TMDB_API_KEY ?? 'test-tmdb-key',
      PUBLIC_API_URL: 'http://localhost:8080',
    },
  },
});
