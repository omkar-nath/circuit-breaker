import { CircuitBreakerError } from "./Error";

/**
 * @class Cache
 * @property { Map } cache
 */
class InMemoryCache {
  cache: Map<string, any>;
  maxEntries: number;
  constructor({ maxEntries = 2 ** 24 - 1 }: any) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now() || cached.expiresAt === 0) {
        return cached.value;
      }
      this.cache.delete(key);
    }
    throw new CircuitBreakerError("The value doesn't exist in cache", 404);
  }

  set(key: string, value: any, ttl: number) {
    if (this.cache.size === this.maxEntries && this.get(key) === undefined) {
      this.cache.delete(this.cache.keys().next().value);
    }

    this.cache.set(key, {
      expiresAt: ttl,
      value,
    });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  flush() {
    this.cache.clear();
  }
}

export default InMemoryCache;
