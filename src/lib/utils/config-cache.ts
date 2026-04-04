import "server-only";

const DEFAULT_CONFIG_CACHE_TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const configCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function getCachedConfigValue<T>({
  key,
  resolver,
  ttlMs = DEFAULT_CONFIG_CACHE_TTL_MS,
}: {
  key: string;
  resolver: () => Promise<T>;
  ttlMs?: number;
}): Promise<T> {
  if (process.env.NODE_ENV === "test") {
    return resolver();
  }

  const now = Date.now();
  const existingEntry = configCache.get(key);

  if (existingEntry && existingEntry.expiresAt > now) {
    return existingEntry.value as T;
  }

  const inFlightRequest = inFlightRequests.get(key);
  if (inFlightRequest) {
    return (await inFlightRequest) as T;
  }

  const request = resolver()
    .then((value) => {
      configCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });

      return value;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return (await request) as T;
}

export function clearConfigCache(): void {
  configCache.clear();
  inFlightRequests.clear();
}
