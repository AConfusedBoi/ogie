# 🔮 Ogie

> Lightweight, production-ready OpenGraph and metadata extraction for Node.js

[![npm version](https://img.shields.io/npm/v/ogie.svg)](https://www.npmjs.com/package/ogie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Ogie** extracts rich metadata from any webpage — OpenGraph, Twitter Cards, JSON-LD, Dublin Core, and more. Built with TypeScript, zero-config, and blazing fast.

## ✨ Features

- 🎯 **Comprehensive Extraction** — OpenGraph, Twitter Cards, JSON-LD, Dublin Core, Article metadata, App Links, oEmbed
- 🚀 **High Performance** — LRU caching with TTL, bulk extraction with rate limiting
- 🔒 **Secure by Default** — SSRF protection, private IP blocking, URL validation
- 📦 **Minimal Dependencies** — Just 4 production deps (cheerio, quick-lru, bottleneck, iconv-lite)
- 🎨 **TypeScript First** — Full type safety with exported interfaces
- ⚡ **Smart Fallbacks** — Automatically fills missing OG data from Twitter Cards and meta tags

## 📥 Installation

```bash
# npm
npm install ogie

# yarn
yarn add ogie

# pnpm
pnpm add ogie

# bun
bun add ogie
```

## 🚀 Quick Start

```typescript
import { extract } from "ogie";

const result = await extract("https://github.com");

if (result.success) {
  console.log(result.data.og.title); // "GitHub: Let's build from here"
  console.log(result.data.og.description); // "GitHub is where..."
  console.log(result.data.og.images[0]); // { url: "https://..." }
}
```

## 📖 API

### `extract(url, options?)`

Fetches a URL and extracts all metadata.

```typescript
import { extract } from "ogie";

const result = await extract("https://example.com", {
  timeout: 10000, // Request timeout (ms)
  maxRedirects: 5, // Max redirects to follow
  userAgent: "MyBot/1.0", // Custom User-Agent
  fetchOEmbed: true, // Fetch oEmbed endpoint
  convertCharset: true, // Auto-detect and convert charset
});

if (result.success) {
  const { data } = result;
  // Access metadata...
} else {
  console.error(result.error.code); // "INVALID_URL", "FETCH_ERROR", etc.
}
```

### `extractFromHtml(html, options?)`

Extracts metadata from an HTML string (no network request).

```typescript
import { extractFromHtml } from "ogie";

const html = `
  <html>
  <head>
    <meta property="og:title" content="My Page">
    <meta property="og:image" content="https://example.com/image.jpg">
  </head>
  </html>
`;

const result = extractFromHtml(html, {
  baseUrl: "https://example.com", // For resolving relative URLs
});
```

### `extractBulk(urls, options?)`

Extracts metadata from multiple URLs with rate limiting.

```typescript
import { extractBulk } from "ogie";

const urls = [
  "https://github.com",
  "https://twitter.com",
  "https://youtube.com",
];

const result = await extractBulk(urls, {
  concurrency: 10, // Max parallel requests
  concurrencyPerDomain: 3, // Max parallel per domain
  minDelayPerDomain: 200, // Min ms between same-domain requests
  requestsPerMinute: 600, // Global rate limit
  continueOnError: true, // Don't stop on failures
  onProgress: (p) => {
    console.log(`${p.completed}/${p.total} done`);
  },
});

console.log(`✅ ${result.stats.succeeded} succeeded`);
console.log(`❌ ${result.stats.failed} failed`);
console.log(`⏱️ ${result.totalDurationMs}ms total`);
```

### `createCache(options?)`

Creates a reusable LRU cache for extraction results.

```typescript
import { extract, createCache } from "ogie";

const cache = createCache({
  maxSize: 100, // Max cached items
  ttl: 300_000, // 5 minutes TTL
  onEviction: (key, value) => {
    console.log(`Evicted: ${key}`);
  },
});

// First call fetches from network
const result1 = await extract("https://github.com", { cache });

// Second call returns cached result instantly
const result2 = await extract("https://github.com", { cache });

// Force fresh fetch (but still cache the result)
const result3 = await extract("https://github.com", {
  cache,
  bypassCache: true,
});
```

## 📊 Extracted Metadata

Ogie extracts metadata from **8 different sources**:

### 🌐 OpenGraph (`data.og`)

```typescript
{
  title: "Page Title",
  description: "Page description",
  type: "website",
  url: "https://example.com",
  siteName: "Example",
  locale: "en_US",
  images: [{ url, width, height, alt }],
  videos: [{ url, width, height, type }],
  audio: [{ url, type }],
}
```

### 🐦 Twitter Cards (`data.twitter`)

```typescript
{
  card: "summary_large_image",
  site: "@example",
  creator: "@author",
  title: "Tweet Title",
  description: "Tweet description",
  image: { url, alt },
  player: { url, width, height },
  app: { iphone, ipad, googleplay },
}
```

### 📝 Basic Meta (`data.basic`)

```typescript
{
  title: "Document Title",
  description: "Meta description",
  canonical: "https://example.com/page",
  favicon: "https://example.com/favicon.ico",
  favicons: [{ url, rel, sizes, type }],
  author: "John Doe",
  keywords: "tag1, tag2",
  themeColor: "#ffffff",
  viewport: "width=device-width",
}
```

### 📰 Article (`data.article`)

```typescript
{
  publishedTime: "2024-01-15T10:00:00Z",
  modifiedTime: "2024-01-16T12:00:00Z",
  author: ["Jane Doe"],
  section: "Technology",
  tags: ["javascript", "web"],
}
```

### 🔗 JSON-LD (`data.jsonLd`)

```typescript
{
  items: [{
    type: "Article",
    name: "Article Title",
    author: { type: "Person", name: "Jane" },
    datePublished: "2024-01-15",
  }],
  raw: [/* original parsed objects */],
}
```

### 📚 Dublin Core (`data.dublinCore`)

```typescript
{
  title: "Document Title",
  creator: ["Author Name"],
  subject: ["Topic"],
  publisher: "Publisher Name",
  date: "2024-01-15",
  language: "en",
  rights: "CC BY 4.0",
}
```

### 📱 App Links (`data.appLinks`)

```typescript
{
  ios: [{ url, appStoreId, appName }],
  android: [{ url, package, appName }],
  web: [{ url, shouldFallback }],
}
```

### 🎬 oEmbed (`data.oEmbed`)

```typescript
{
  type: "video",
  title: "Video Title",
  html: "<iframe ...></iframe>",
  width: 640,
  height: 360,
  providerName: "YouTube",
  thumbnailUrl: "https://...",
}
```

## ⚙️ Options Reference

### ExtractOptions

| Option             | Type                     | Default    | Description                 |
| ------------------ | ------------------------ | ---------- | --------------------------- |
| `timeout`          | `number`                 | `10000`    | Request timeout in ms       |
| `maxRedirects`     | `number`                 | `5`        | Max redirects to follow     |
| `userAgent`        | `string`                 | `ogie/1.0` | Custom User-Agent           |
| `headers`          | `Record<string, string>` | `{}`       | Custom HTTP headers         |
| `baseUrl`          | `string`                 | —          | Base URL for relative URLs  |
| `onlyOpenGraph`    | `boolean`                | `false`    | Skip fallback parsing       |
| `allowPrivateUrls` | `boolean`                | `false`    | Allow localhost/private IPs |
| `fetchOEmbed`      | `boolean`                | `false`    | Fetch oEmbed endpoint       |
| `convertCharset`   | `boolean`                | `false`    | Auto charset conversion     |
| `cache`            | `MetadataCache \| false` | —          | Cache instance              |
| `bypassCache`      | `boolean`                | `false`    | Force fresh fetch           |

### BulkOptions

| Option                 | Type       | Default | Description                    |
| ---------------------- | ---------- | ------- | ------------------------------ |
| `concurrency`          | `number`   | `10`    | Max parallel requests          |
| `concurrencyPerDomain` | `number`   | `3`     | Max parallel per domain        |
| `minDelayPerDomain`    | `number`   | `200`   | Min ms between domain requests |
| `requestsPerMinute`    | `number`   | `600`   | Global rate limit              |
| `timeout`              | `number`   | `30000` | Timeout per request            |
| `continueOnError`      | `boolean`  | `true`  | Continue on failures           |
| `onProgress`           | `function` | —       | Progress callback              |

### CacheOptions

| Option       | Type       | Default  | Description       |
| ------------ | ---------- | -------- | ----------------- |
| `maxSize`    | `number`   | `100`    | Max cached items  |
| `ttl`        | `number`   | `300000` | TTL in ms (5 min) |
| `onEviction` | `function` | —        | Eviction callback |

## 🛡️ Error Handling

Ogie uses a discriminated union result type for type-safe error handling:

```typescript
import { extract, isFetchError, isParseError } from "ogie";

const result = await extract(url);

if (!result.success) {
  const { error } = result;

  switch (error.code) {
    case "INVALID_URL":
      console.log("Invalid URL format");
      break;
    case "FETCH_ERROR":
      console.log("Network error");
      break;
    case "TIMEOUT":
      console.log("Request timed out");
      break;
    case "PARSE_ERROR":
      console.log("Failed to parse HTML");
      break;
  }

  // Or use type guards
  if (isFetchError(error)) {
    console.log(`HTTP ${error.statusCode}`);
  }
}
```

## 🔐 Security

Ogie includes built-in security protections:

- **SSRF Protection** — Blocks requests to private/internal IP ranges by default
- **URL Validation** — Only allows HTTP/HTTPS protocols
- **Redirect Limits** — Configurable max redirects (default: 5)
- **oEmbed Validation** — Validates oEmbed endpoints before fetching

To allow private URLs (for testing):

```typescript
await extract("http://localhost:3000", {
  allowPrivateUrls: true,
});
```

## 📦 Bundle Size

| Dependency | Size (gzip) |
| ---------- | ----------- |
| cheerio    | ~70 KB      |
| quick-lru  | ~0.5 KB     |
| bottleneck | ~12 KB      |
| iconv-lite | ~45 KB      |
| **Total**  | ~130 KB     |

## 🧪 Testing

```bash
# Run tests
bun test

# Run with coverage
bun test --coverage
```

## 📄 License

MIT © [Dobroslav Radosavljevic](https://github.com/dobroslavradosavljevic)

---

<p align="center">
  Made with ❤️ for the web scraping community
</p>
