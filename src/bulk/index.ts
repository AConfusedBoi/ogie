import Bottleneck from "bottleneck";

import type { ExtractOptions, ExtractResult } from "../types";

import { extract } from "../extract";
import { getBaseUrl } from "../utils/url";

// =============================================================================
// Types
// =============================================================================

/** Options for bulk extraction */
export interface BulkOptions {
  /** Global max concurrent requests (default: 10) */
  concurrency?: number;

  /** Max concurrent requests per domain (default: 3) */
  concurrencyPerDomain?: number;

  /** Minimum delay in ms between requests to the same domain (default: 200) */
  minDelayPerDomain?: number;

  /** Global requests per minute limit via reservoir (default: 600) */
  requestsPerMinute?: number;

  /** Continue processing on individual URL errors (default: true) */
  continueOnError?: boolean;

  /** Callback for progress updates */
  onProgress?: (progress: BulkProgress) => void;

  /** Timeout per request in ms (default: 30000) */
  timeout?: number;

  /** Extract options to pass to each extraction */
  extractOptions?: Omit<ExtractOptions, "timeout">;
}

/** Progress information during bulk extraction */
export interface BulkProgress {
  /** Number of completed extractions (success + failure) */
  completed: number;

  /** Total number of URLs to process */
  total: number;

  /** Number of successful extractions */
  succeeded: number;

  /** Number of failed extractions */
  failed: number;

  /** Currently processing URL */
  currentUrl?: string;
}

/** Result for a single URL in bulk extraction */
export interface BulkResultItem {
  /** The URL that was processed */
  url: string;

  /** Extraction result (success or failure) */
  result: ExtractResult;

  /** Time taken to extract in milliseconds */
  durationMs: number;
}

/** Aggregated result of bulk extraction */
export interface BulkResult {
  /** Individual results for each URL */
  results: BulkResultItem[];

  /** Total time taken for all extractions in milliseconds */
  totalDurationMs: number;

  /** Aggregated statistics */
  stats: {
    /** Total URLs processed */
    total: number;

    /** Number of successful extractions */
    succeeded: number;

    /** Number of failed extractions */
    failed: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONCURRENCY = 10;
const DEFAULT_CONCURRENCY_PER_DOMAIN = 3;
const DEFAULT_MIN_DELAY_PER_DOMAIN = 200;
const DEFAULT_REQUESTS_PER_MINUTE = 600;
const DEFAULT_TIMEOUT = 30_000;
const RESERVOIR_REFRESH_INTERVAL = 60_000;

// =============================================================================
// Internal Types
// =============================================================================

interface ResolvedOptions {
  concurrency: number;
  concurrencyPerDomain: number;
  minDelayPerDomain: number;
  requestsPerMinute: number;
  continueOnError: boolean;
  timeout: number;
  extractOptions?: Omit<ExtractOptions, "timeout">;
  onProgress?: (progress: BulkProgress) => void;
}

interface ProcessContext {
  options: ResolvedOptions;
  globalLimiter: Bottleneck;
  domainGroup: Bottleneck.Group;
  progress: BulkProgress;
  results: BulkResultItem[];
}

// =============================================================================
// Helper Functions
// =============================================================================

const resolveOptions = (options?: BulkOptions): ResolvedOptions => ({
  concurrency: options?.concurrency ?? DEFAULT_CONCURRENCY,
  concurrencyPerDomain:
    options?.concurrencyPerDomain ?? DEFAULT_CONCURRENCY_PER_DOMAIN,
  continueOnError: options?.continueOnError ?? true,
  extractOptions: options?.extractOptions,
  minDelayPerDomain: options?.minDelayPerDomain ?? DEFAULT_MIN_DELAY_PER_DOMAIN,
  onProgress: options?.onProgress,
  requestsPerMinute: options?.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE,
  timeout: options?.timeout ?? DEFAULT_TIMEOUT,
});

const createEmptyResult = (): BulkResult => ({
  results: [],
  stats: { failed: 0, succeeded: 0, total: 0 },
  totalDurationMs: 0,
});

const createLimiters = (
  opts: ResolvedOptions
): { globalLimiter: Bottleneck; domainGroup: Bottleneck.Group } => {
  const globalLimiter = new Bottleneck({
    maxConcurrent: opts.concurrency,
    reservoir: opts.requestsPerMinute,
    reservoirRefreshAmount: opts.requestsPerMinute,
    reservoirRefreshInterval: RESERVOIR_REFRESH_INTERVAL,
  });

  const domainGroup = new Bottleneck.Group({
    maxConcurrent: opts.concurrencyPerDomain,
    minTime: opts.minDelayPerDomain,
  });

  domainGroup.on("created", (limiter) => {
    limiter.chain(globalLimiter);
  });

  return { domainGroup, globalLimiter };
};

const createInitialProgress = (total: number): BulkProgress => ({
  completed: 0,
  failed: 0,
  succeeded: 0,
  total,
});

const executeExtraction = (
  url: string,
  ctx: ProcessContext
): Promise<ExtractResult> => {
  const domain = getBaseUrl(url);
  const domainLimiter = ctx.domainGroup.key(domain);

  return domainLimiter.schedule(() =>
    extract(url, {
      ...ctx.options.extractOptions,
      timeout: ctx.options.timeout,
    })
  );
};

const processUrl = async (
  url: string,
  ctx: ProcessContext
): Promise<BulkResultItem> => {
  ctx.progress.currentUrl = url;
  ctx.options.onProgress?.({ ...ctx.progress });

  const itemStartTime = performance.now();
  const result = await executeExtraction(url, ctx);
  const durationMs = performance.now() - itemStartTime;

  return { durationMs, result, url };
};

const updateProgressOnSuccess = (
  item: BulkResultItem,
  ctx: ProcessContext
): void => {
  ctx.progress.completed += 1;
  if (item.result.success) {
    ctx.progress.succeeded += 1;
  } else {
    ctx.progress.failed += 1;
  }
  ctx.progress.currentUrl = undefined;
  ctx.options.onProgress?.({ ...ctx.progress });
};

const createErrorResult = (url: string, error: unknown): BulkResultItem => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return {
    durationMs: 0,
    result: {
      error: {
        cause: error instanceof Error ? error : undefined,
        code: "FETCH_ERROR",
        message: errorMessage,
        name: "OgieError",
        url,
      },
      success: false,
    } as ExtractResult,
    url,
  };
};

const handleUrlError = (
  url: string,
  error: unknown,
  ctx: ProcessContext
): void => {
  ctx.progress.completed += 1;
  ctx.progress.failed += 1;
  ctx.progress.currentUrl = undefined;
  ctx.options.onProgress?.({ ...ctx.progress });
  ctx.results.push(createErrorResult(url, error));
};

const processUrlWithErrorHandling = async (
  url: string,
  ctx: ProcessContext
): Promise<void> => {
  try {
    const item = await processUrl(url, ctx);
    ctx.results.push(item);
    updateProgressOnSuccess(item, ctx);
  } catch (error) {
    if (!ctx.options.continueOnError) {
      throw error;
    }
    handleUrlError(url, error, ctx);
  }
};

const sortResultsByInputOrder = (
  results: BulkResultItem[],
  urls: string[]
): void => {
  const urlIndexMap = new Map(urls.map((url, index) => [url, index]));
  results.sort((a, b) => {
    const indexA = urlIndexMap.get(a.url) ?? 0;
    const indexB = urlIndexMap.get(b.url) ?? 0;
    return indexA - indexB;
  });
};

const createContext = (
  urls: string[],
  resolvedOptions: ResolvedOptions,
  limiters: { globalLimiter: Bottleneck; domainGroup: Bottleneck.Group }
): ProcessContext => ({
  domainGroup: limiters.domainGroup,
  globalLimiter: limiters.globalLimiter,
  options: resolvedOptions,
  progress: createInitialProgress(urls.length),
  results: [],
});

const awaitPromises = async (
  promises: Promise<void>[],
  continueOnError: boolean
): Promise<void> => {
  if (continueOnError) {
    await Promise.allSettled(promises);
  } else {
    await Promise.all(promises);
  }
};

const buildFinalResult = (
  ctx: ProcessContext,
  urls: string[],
  startTime: number
): BulkResult => {
  sortResultsByInputOrder(ctx.results, urls);
  return {
    results: ctx.results,
    stats: {
      failed: ctx.progress.failed,
      succeeded: ctx.progress.succeeded,
      total: urls.length,
    },
    totalDurationMs: performance.now() - startTime,
  };
};

// =============================================================================
// Main Export
// =============================================================================

/**
 * Extract metadata from multiple URLs with rate limiting
 *
 * Features:
 * - Global concurrency control
 * - Per-domain rate limiting (prevents hammering single domains)
 * - Global requests-per-minute limiting via reservoir
 * - Progress callbacks
 * - Configurable error handling (continue or stop on error)
 *
 * @example
 * ```typescript
 * const result = await extractBulk([
 *   'https://example.com/page1',
 *   'https://example.com/page2',
 *   'https://other.com/page1',
 * ], {
 *   concurrency: 5,
 *   onProgress: (p) => console.log(`${p.completed}/${p.total}`),
 * });
 * ```
 */
export const extractBulk = async (
  urls: string[],
  options?: BulkOptions
): Promise<BulkResult> => {
  const startTime = performance.now();

  if (urls.length === 0) {
    return createEmptyResult();
  }

  const resolvedOptions = resolveOptions(options);
  const limiters = createLimiters(resolvedOptions);
  const ctx = createContext(urls, resolvedOptions, limiters);

  const promises = urls.map((url) => processUrlWithErrorHandling(url, ctx));
  await awaitPromises(promises, resolvedOptions.continueOnError);
  await limiters.globalLimiter.disconnect();

  return buildFinalResult(ctx, urls, startTime);
};
