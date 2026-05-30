import Redis from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => console.error('[redis] error:', err.message));
redis.on('connect', () => console.log('[redis] connected'));

/**
 * Cache-aside helper. Returns cached JSON if present, otherwise runs `producer`,
 * caches the result with the given TTL (seconds), and returns it.
 * Cache failures never break the request — they degrade to a direct call.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    console.warn(`[redis] read failed for ${key}:`, (err as Error).message);
  }

  const value = await producer();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[redis] write failed for ${key}:`, (err as Error).message);
  }

  return value;
}
