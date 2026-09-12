/**
 * Generic In-Memory Cache with TTL, Max Capacity (LRU Eviction), 
 * In-Flight Request Coalescing, and Observability Stats.
 */

export interface CacheOptions {
  name?: string;
  defaultTtlMs?: number;
  maxSize?: number;
}

export interface CacheStats {
  name: string;
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRatio: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

export class InMemoryCache<T> {
  private readonly name: string;
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private readonly store: Map<string, CacheEntry<T>> = new Map();
  private readonly inFlight: Map<string, Promise<T>> = new Map();

  private hits = 0;
  private misses = 0;
  private accessCounter = 0;

  constructor(options: CacheOptions = {}) {
    this.name = options.name ?? "Cache";
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 500; // max 500 entries default
  }

  /**
   * Retrieves an item from the cache if present and unexpired.
   */
  public get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();

    // Check TTL expiration
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh last accessed monotonic counter for strict LRU tracking
    entry.lastAccessedAt = ++this.accessCounter;
    this.hits++;
    return entry.value;
  }

  /**
   * Stores an item with an expiration TTL and enforces max size bounds.
   */
  public set(key: string, value: T, customTtlMs?: number): void {
    const ttl = customTtlMs ?? this.defaultTtlMs;
    const now = Date.now();

    // If cache reached capacity, evict the least recently used / expired entry
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evict();
    }

    this.store.set(key, {
      value,
      expiresAt: now + ttl,
      lastAccessedAt: ++this.accessCounter,
    });
  }

  /**
   * High-level helper that gets a cached value or executes the fetcher with
   * in-flight request coalescing to prevent stampedes / dog-piling.
   */
  public async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    customTtlMs?: number
  ): Promise<T> {
    // 1. Check existing cached value
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // 2. Check if a request for this exact key is already in-flight
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    // 3. Initiate single upstream fetch and store Promise in flight map
    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, customTtlMs);
        return result;
      } finally {
        // Always clean up in-flight tracker whether resolved or rejected
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Checks whether a key is present and unexpired without counting as a hit/miss.
   */
  public has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Removes a specific key from cache.
   */
  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears all stored entries and in-flight promises.
   */
  public clear(): void {
    this.store.clear();
    this.inFlight.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns current cache statistics for monitoring and debugging.
   */
  public getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      name: this.name,
      size: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: totalRequests === 0 ? 0 : Number((this.hits / totalRequests).toFixed(4)),
    };
  }

  /**
   * Evicts expired entries first, or the Least Recently Used (LRU) entry if none are expired.
   */
  private evict(): void {
    const now = Date.now();

    // 1. Try to evict an expired entry
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        return;
      }
    }

    // 2. Otherwise find and evict the entry with the oldest lastAccessedAt (LRU)
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < oldestTimestamp) {
        oldestTimestamp = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
}
