import { describe, expect, it } from "bun:test";

import { extractFromHtml, type ExtractSuccess } from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - Article", () => {
  const result = extractFromHtml(fixtures.article, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts article:published_time", () => {
    expect(result.data.article?.publishedTime).toBe("2024-01-15T10:00:00Z");
  });

  it("extracts article:modified_time", () => {
    expect(result.data.article?.modifiedTime).toBe("2024-01-16T15:30:00Z");
  });

  it("extracts article:author as single string", () => {
    expect(result.data.article?.author).toBe("https://example.com/author/john");
  });

  it("extracts article:section", () => {
    expect(result.data.article?.section).toBe("Technology");
  });

  it("extracts multiple article:tag as array", () => {
    expect(result.data.article?.tags).toEqual(["JavaScript", "TypeScript"]);
  });
});

describe("extractFromHtml - Article with multiple authors", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="article:author" content="https://example.com/author/john" />
      <meta property="article:author" content="https://example.com/author/jane" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts multiple authors as array", () => {
    expect(result.data.article?.author).toEqual([
      "https://example.com/author/john",
      "https://example.com/author/jane",
    ]);
  });
});

describe("extractFromHtml - Article with expiration and publisher", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="article:expiration_time" content="2025-12-31T23:59:59Z" />
      <meta property="article:publisher" content="https://example.com" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts article:expiration_time", () => {
    expect(result.data.article?.expirationTime).toBe("2025-12-31T23:59:59Z");
  });

  it("extracts article:publisher", () => {
    expect(result.data.article?.publisher).toBe("https://example.com");
  });
});

describe("extractFromHtml - Article with og:article prefix", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:article:published_time" content="2024-02-01T08:00:00Z" />
      <meta property="og:article:section" content="Science" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts og:article:published_time", () => {
    expect(result.data.article?.publishedTime).toBe("2024-02-01T08:00:00Z");
  });

  it("extracts og:article:section", () => {
    expect(result.data.article?.section).toBe("Science");
  });
});

describe("extractFromHtml - Empty article metadata", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>No article metadata</title>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined for article when no metadata present", () => {
    expect(result.data.article).toBeUndefined();
  });
});
