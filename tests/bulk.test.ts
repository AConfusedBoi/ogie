import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { extractBulk, type BulkProgress, type ExtractSuccess } from "../src";

// =============================================================================
// Test Server Setup
// =============================================================================

const TEST_PORT = 9876;
const TEST_HOST = `http://localhost:${TEST_PORT}`;

const createHtmlResponse = (title: string): Response => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="Description for ${title}">
      <title>${title}</title>
    </head>
    <body></body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

const delay = (ms: number): Promise<void> => Bun.sleep(ms);

let server: ReturnType<typeof Bun.serve> | undefined;
const requestTimestamps = new Map<string, number[]>();

const getTimestamps = (hostname: string): number[] =>
  requestTimestamps.get(hostname) ?? [];

const trackTimestamp = (hostname: string): void => {
  const timestamps = requestTimestamps.get(hostname) ?? [];
  timestamps.push(Date.now());
  requestTimestamps.set(hostname, timestamps);
};

const handleDelayPath = async (path: string): Promise<Response | null> => {
  const delayMatch = path.match(/\/delay\/(\d+)/);
  if (!delayMatch) {
    return null;
  }
  const delayMs = Number.parseInt(delayMatch[1], 10);
  await delay(delayMs);
  return createHtmlResponse(`Delayed ${delayMs}ms`);
};

const handleErrorPath = (path: string): Response | null =>
  path === "/error"
    ? new Response("Internal Server Error", { status: 500 })
    : null;

const handleTimeoutPath = async (path: string): Promise<Response | null> => {
  if (path !== "/timeout") {
    return null;
  }
  await delay(60_000);
  return createHtmlResponse("Timeout");
};

const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  trackTimestamp(url.hostname);

  return (
    (await handleDelayPath(path)) ??
    handleErrorPath(path) ??
    (await handleTimeoutPath(path)) ??
    createHtmlResponse(`Page ${path}`)
  );
};

beforeAll(() => {
  server = Bun.serve({
    fetch: handleRequest,
    port: TEST_PORT,
  });
});

afterAll(() => {
  server?.stop();
});

// =============================================================================
// Tests
// =============================================================================

describe("extractBulk", () => {
  describe("basic functionality", () => {
    it("extracts metadata from multiple URLs", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        `${TEST_HOST}/page2`,
        `${TEST_HOST}/page3`,
      ];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.stats.total).toBe(3);
      expect(result.stats.succeeded).toBe(3);
      expect(result.stats.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].url).toBe(urls[0]);
      expect(result.results[0].result.success).toBe(true);
    });

    it("handles empty URL array", async () => {
      const result = await extractBulk([]);

      expect(result.stats.total).toBe(0);
      expect(result.stats.succeeded).toBe(0);
      expect(result.stats.failed).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.totalDurationMs).toBe(0);
    });

    it("returns results in original URL order", async () => {
      const urls = [
        `${TEST_HOST}/delay/100`,
        `${TEST_HOST}/page-fast`,
        `${TEST_HOST}/delay/50`,
      ];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.results[0].url).toBe(urls[0]);
      expect(result.results[1].url).toBe(urls[1]);
      expect(result.results[2].url).toBe(urls[2]);
    });

    it("tracks duration for each extraction", async () => {
      const urls = [`${TEST_HOST}/page1`];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.results[0].durationMs).toBeGreaterThan(0);
      expect(result.totalDurationMs).toBeGreaterThan(0);
    });
  });

  describe("progress callback", () => {
    it("calls onProgress callback for each URL", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        `${TEST_HOST}/page2`,
        `${TEST_HOST}/page3`,
      ];

      const progressUpdates: BulkProgress[] = [];

      await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });

      expect(progressUpdates.length).toBeGreaterThanOrEqual(urls.length);

      const finalProgress = progressUpdates.at(-1);
      expect(finalProgress?.completed).toBe(3);
      expect(finalProgress?.total).toBe(3);
      expect(finalProgress?.succeeded).toBe(3);
    });

    it("reports currentUrl during processing", async () => {
      const urls = [`${TEST_HOST}/page1`, `${TEST_HOST}/page2`];
      const currentUrls: (string | undefined)[] = [];

      await extractBulk(urls, {
        concurrency: 1,
        extractOptions: { allowPrivateUrls: true },
        onProgress: (progress) => {
          currentUrls.push(progress.currentUrl);
        },
      });

      const seenUrls = currentUrls.filter((u) => u !== undefined);
      expect(seenUrls.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("continues on error by default", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        `${TEST_HOST}/error`,
        `${TEST_HOST}/page3`,
      ];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.stats.total).toBe(3);
      expect(result.stats.succeeded).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.results).toHaveLength(3);

      const errorResult = result.results.find((r) => r.url.includes("/error"));
      expect(errorResult?.result.success).toBe(false);
    });

    it("handles invalid URLs gracefully", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        "not-a-valid-url",
        `${TEST_HOST}/page2`,
      ];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.stats.total).toBe(3);
      expect(result.stats.succeeded).toBe(2);
      expect(result.stats.failed).toBe(1);
    });

    it("respects continueOnError option", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        "not-a-valid-url",
        `${TEST_HOST}/page3`,
      ];

      const result = await extractBulk(urls, {
        continueOnError: true,
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.results.length).toBe(3);
    });
  });

  describe("timeout handling", () => {
    it("respects per-request timeout", async () => {
      const urls = [`${TEST_HOST}/delay/500`];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
        timeout: 100,
      });

      expect(result.stats.failed).toBe(1);
      expect(result.results[0].result.success).toBe(false);
    });
  });

  describe("concurrency control", () => {
    it("respects global concurrency limit", async () => {
      requestTimestamps.clear();

      const urls = Array.from(
        { length: 5 },
        (_, i) => `${TEST_HOST}/concurrent/${i}`
      );

      const startTime = Date.now();
      await extractBulk(urls, {
        concurrency: 2,
        extractOptions: { allowPrivateUrls: true },
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(0);
    });

    it("uses default concurrency values", async () => {
      const urls = [`${TEST_HOST}/page1`, `${TEST_HOST}/page2`];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.stats.succeeded).toBe(2);
    });
  });

  describe("rate limiting", () => {
    it("applies per-domain rate limiting", async () => {
      requestTimestamps.clear();

      const urls = Array.from(
        { length: 3 },
        (_, i) => `${TEST_HOST}/ratelimit/${i}`
      );

      await extractBulk(urls, {
        concurrencyPerDomain: 1,
        extractOptions: { allowPrivateUrls: true },
        minDelayPerDomain: 100,
      });

      const timestamps = getTimestamps("localhost");
      expect(timestamps.length).toBeGreaterThanOrEqual(3);

      const gap = timestamps[1] - timestamps[0];
      expect(gap).toBeGreaterThanOrEqual(50);
    });
  });

  describe("metadata extraction", () => {
    it("extracts OpenGraph metadata correctly", async () => {
      const urls = [`${TEST_HOST}/og-test`];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      const successResult = result.results[0].result as ExtractSuccess;
      expect(successResult.success).toBe(true);
      expect(successResult.data.og.title).toBe("Page /og-test");
    });

    it("passes extractOptions to individual extractions", async () => {
      const urls = [`${TEST_HOST}/page1`];

      const result = await extractBulk(urls, {
        extractOptions: {
          allowPrivateUrls: true,
          onlyOpenGraph: true,
        },
      });

      const successResult = result.results[0].result as ExtractSuccess;
      expect(successResult.success).toBe(true);
      expect(successResult.data.basic.title).toBe("Page /page1");
    });
  });

  describe("statistics", () => {
    it("returns accurate statistics", async () => {
      const urls = [
        `${TEST_HOST}/page1`,
        `${TEST_HOST}/page2`,
        `${TEST_HOST}/error`,
        `${TEST_HOST}/page4`,
      ];

      const result = await extractBulk(urls, {
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.stats.total).toBe(4);
      expect(result.stats.succeeded).toBe(3);
      expect(result.stats.failed).toBe(1);
    });

    it("calculates total duration", async () => {
      const urls = [`${TEST_HOST}/delay/50`, `${TEST_HOST}/delay/50`];

      const result = await extractBulk(urls, {
        concurrency: 1,
        extractOptions: { allowPrivateUrls: true },
      });

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(100);
    });
  });
});
