import QuickLRU from "quick-lru";

import type { ExtractOptions, Metadata } from "../types";

import { normalizeUrl } from "../utils/url";

/** Default TTL: 5 minutes */
const DEFAULT_TTL = 300_000;
const DEFAULT_MAX_SIZE = 100;

/** Options that affect extraction result (used for cache key generation) */
const CACHE_RELEVANT_OPTIONS = [
  "onlyOpenGraph",
  "fetchOEmbed",
  "convertCharset",
] as const;

/**
 * Generate a stable hash for cache-relevant options
 * Uses a simple string representation sorted by key
 */
const hashOptions = (options?: ExtractOptions): string => {
  if (!options) {
    return "";
  }

  const relevantPairs: string[] = [];
  for (const key of CACHE_RELEVANT_OPTIONS) {
    const value = options[key];
    if (value !== undefined) {
      relevantPairs.push(`${key}:${String(value)}`);
    }
  }

  return relevantPairs.length > 0 ? relevantPairs.toSorted().join(",") : "";
};

/**
 * Generate a cache key from URL and options
 * Format: "normalized-url" or "normalized-url::options-hash"
 */
export const generateCacheKey = (
  url: string,
  options?: ExtractOptions
): string => {
  const normalizedUrl = normalizeUrl(url);
  const optionsHash = hashOptions(options);

  return optionsHash ? `${normalizedUrl}::${optionsHash}` : normalizedUrl;
};

/** Configuration options for the metadata cache */
export interface CacheOptions {
  /** Enable caching (default: true) */
  enabled?: boolean;

  /** Time-to-live in milliseconds (default: 300000 = 5 minutes) */
  ttl?: number;

  /** Maximum number of items to cache (default: 100) */
  maxSize?: number;

  /** Callback when an item is evicted from cache */
  onEviction?: (key: string, value: Metadata) => void;
}

/** Type alias for the metadata cache instance */
export type MetadataCache = QuickLRU<string, Metadata>;

/** Create a new LRU cache for metadata */
export const createCache = (options?: CacheOptions): MetadataCache =>
  new QuickLRU<string, Metadata>({
    maxAge: options?.ttl ?? DEFAULT_TTL,
    maxSize: options?.maxSize ?? DEFAULT_MAX_SIZE,
    onEviction: options?.onEviction,
  });
