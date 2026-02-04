# 🔮 ogie

> Lightweight, production-ready OpenGraph and metadata extraction for Node.js

[![npm version](https://img.shields.io/npm/v/ogie.svg)](https://www.npmjs.com/package/ogie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A comprehensive metadata extraction library that pulls OpenGraph, Twitter Cards, JSON-LD, Dublin Core, and more from any webpage. Built with TypeScript, secure by default, and optimized for production use.

## ✨ Features

- 🎯 **Comprehensive Extraction** — OpenGraph, Twitter Cards, JSON-LD, Dublin Core, Article, Video, Music, Book, Profile, App Links, oEmbed, RSS/Atom Feeds
- 🚀 **High Performance** — LRU caching with TTL, bulk extraction with smart rate limiting
- 🔒 **Secure by Default** — SSRF protection, private IP blocking, URL validation
- 📦 **Minimal Dependencies** — Just 4 production deps (cheerio, quick-lru, bottleneck, iconv-lite)
- 🎨 **TypeScript First** — Full type safety with exported interfaces and type guards
- ⚡ **Smart Fallbacks** — Automatically fills missing OG data from Twitter Cards and meta tags
- 🌐 **Charset Detection** — Auto-detect and convert non-UTF-8 pages
- 📊 **Bulk Processing** — Process hundreds of URLs with per-domain rate limiting
- 🔤 **Case-Insensitive Parsing** — Handles meta tags regardless of attribute casing

## 🤖 AI Agent Skill

This package is available as an [Agent Skill](https://skills.sh/) for AI coding assistants like Claude Code, Cursor, Copilot, and more.

```bash
npx skills add dobroslavradosavljevic/ogie
```

Once installed, your AI agent will know how to extract OpenGraph, Twitter Cards, and metadata from URLs or HTML.

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

// Extract metadata from a URL
const result = await extract("https://github.com");

if (result.success) {
  console.log(result.data.og.title); // "GitHub: Let's build from here"
  console.log(result.data.og.description); // "GitHub is where..."
  console.log(result.data.og.images[0]?.url); // "https://github.githubassets.com/..."
} else {
  console.error(result.error.code); // "FETCH_ERROR", "INVALID_URL", etc.
}
```

## 📖 API Reference

### `extract(url, options?)` 🌐

Extract metadata from a URL by fetching and parsing the page.

```typescript
import { extract } from "ogie";

const result = await extract("https://example.com");

// With options
const result = await extract("https://example.com", {
  timeout: 10000, // Request timeout (ms)
  maxRedirects: 5, // Max redirects to follow
  userAgent: "MyBot/1.0", // Custom User-Agent
  fetchOEmbed: true, // Also fetch oEmbed endpoint
  convertCharset: true, // Auto-detect and convert charset
});

if (result.success) {
  console.log(result.data.og.title);
  console.log(result.data.twitter.card);
  console.log(result.data.basic.favicon);
}
```

**Returns:** `Promise<ExtractResult>`

---

### `extractFromHtml(html, options?)` 📄

Extract metadata from an HTML string without making network requests.

```typescript
import { extractFromHtml } from "ogie";

const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta property="og:title" content="My Page">
    <meta property="og:image" content="/images/hero.jpg">
    <title>My Page Title</title>
  </head>
  </html>
`;

const result = extractFromHtml(html, {
  baseUrl: "https://example.com", // Required for resolving relative URLs
});

if (result.success) {
  console.log(result.data.og.title); // "My Page"
  console.log(result.data.og.images[0]?.url); // "https://example.com/images/hero.jpg"
}
```

**Returns:** `ExtractResult`

---

### `extractBulk(urls, options?)` 📦

Extract metadata from multiple URLs with built-in rate limiting and concurrency control.

```typescript
import { extractBulk } from "ogie";

const urls = [
  "https://github.com",
  "https://twitter.com",
  "https://youtube.com",
  "https://medium.com",
];

const result = await extractBulk(urls, {
  concurrency: 10, // Max parallel requests globally
  concurrencyPerDomain: 3, // Max parallel per domain
  minDelayPerDomain: 200, // Min ms between same-domain requests
  requestsPerMinute: 600, // Global rate limit
  timeout: 30000, // Timeout per request
  continueOnError: true, // Don't stop on failures
  onProgress: (progress) => {
    console.log(`${progress.completed}/${progress.total} done`);
    console.log(`✅ ${progress.succeeded} | ❌ ${progress.failed}`);
  },
});

// Access results
console.log(`Total time: ${result.totalDurationMs}ms`);
console.log(`Succeeded: ${result.stats.succeeded}`);
console.log(`Failed: ${result.stats.failed}`);

// Iterate results (maintains input order)
for (const item of result.results) {
  console.log(`${item.url}: ${item.durationMs}ms`);
  if (item.result.success) {
    console.log(`  Title: ${item.result.data.og.title}`);
  } else {
    console.log(`  Error: ${item.result.error.code}`);
  }
}
```

**Returns:** `Promise<BulkResult>`

---

### `createCache(options?)` 💾

Create an LRU cache instance for storing extraction results.

```typescript
import { extract, createCache } from "ogie";

const cache = createCache({
  maxSize: 100, // Max cached items (default: 100)
  ttl: 300_000, // Time-to-live in ms (default: 5 minutes)
  onEviction: (key, value) => {
    console.log(`Evicted: ${key}`);
  },
});

// First call fetches from network
const result1 = await extract("https://github.com", { cache });

// Second call returns cached result instantly
const result2 = await extract("https://github.com", { cache });

// Force fresh fetch (result still gets cached)
const result3 = await extract("https://github.com", {
  cache,
  bypassCache: true,
});

// Cache utilities
console.log(`Cache size: ${cache.size}`);
cache.clear(); // Clear all entries
```

**Returns:** `MetadataCache` (QuickLRU instance)

---

### `generateCacheKey(url, options?)` 🔑

Generate a cache key for a URL and options combination.

```typescript
import { generateCacheKey } from "ogie";

const key1 = generateCacheKey("https://example.com");
const key2 = generateCacheKey("https://example.com/"); // Same key (normalized)

// Different options produce different keys
const key3 = generateCacheKey("https://example.com", { fetchOEmbed: true });
console.log(key1 === key3); // false
```

**Returns:** `string`

## 📊 Extracted Metadata

Ogie extracts metadata from **13 different sources**:

### 🌐 OpenGraph (`data.og`)

Core OpenGraph metadata for any page type.

```typescript
{
  title: "Page Title",
  description: "Page description",
  type: "website", // website, article, video.movie, music.song, book, profile, etc.
  url: "https://example.com",
  siteName: "Example",
  locale: "en_US",
  localeAlternate: ["es_ES", "fr_FR"],
  determiner: "the",
  images: [
    { url: "https://...", width: 1200, height: 630, alt: "...", secureUrl: "https://...", type: "image/jpeg" }
  ],
  videos: [
    { url: "https://...", width: 1280, height: 720, type: "video/mp4", secureUrl: "https://..." }
  ],
  audio: [
    { url: "https://...", type: "audio/mpeg", secureUrl: "https://..." }
  ],
}
```

### 🐦 Twitter Cards (`data.twitter`)

Twitter/X card metadata with full support for all card types.

```typescript
{
  card: "summary_large_image", // summary, summary_large_image, app, player
  site: "@github",
  siteId: "13334762",          // Numeric user ID
  creator: "@username",
  creatorId: "12345678",       // Numeric user ID
  title: "Card Title",
  description: "Card description",
  image: { url: "https://...", alt: "Image description" },
  player: {
    url: "https://...",
    width: 640,
    height: 360,
    stream: "https://...",
    streamContentType: "video/mp4"
  },
  app: {
    iphone: { id: "123456", url: "app://...", name: "App Name" },
    ipad: { id: "123456", url: "app://..." },
    googleplay: { id: "com.example", url: "app://..." },
    country: "US"
  },
}
```

### 📝 Basic Meta (`data.basic`)

Standard HTML meta tags and document information.

```typescript
{
  title: "Document Title",        // <title> tag
  description: "Meta description",
  canonical: "https://example.com/page",
  favicon: "https://example.com/favicon.ico",
  favicons: [
    { url: "...", rel: "icon", sizes: "32x32", type: "image/png" },
    { url: "...", rel: "apple-touch-icon", sizes: "180x180" },
    { url: "...", rel: "mask-icon", color: "#000000" }
  ],
  manifestUrl: "https://example.com/manifest.json",
  author: "John Doe",
  charset: "utf-8",
  keywords: "web, metadata, scraping",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#ffffff",
  generator: "Next.js",
  applicationName: "My App",
  referrer: "origin-when-cross-origin",
}
```

### 📰 Article (`data.article`)

Article-specific metadata for `og:type="article"` pages.

```typescript
{
  publishedTime: "2024-01-15T10:00:00Z",
  modifiedTime: "2024-01-16T12:00:00Z",
  expirationTime: "2025-01-15T10:00:00Z",
  author: ["https://example.com/author/jane"],
  section: "Technology",
  tags: ["javascript", "typescript", "web"],
  publisher: "Tech Blog", // Non-standard but commonly used
}
```

### 🎬 Video (`data.video`)

Video metadata for `og:type="video.*"` pages (movie, episode, tv_show, other).

```typescript
{
  actors: [
    { url: "https://example.com/actor/john", role: "John Smith" },
    { url: "https://example.com/actor/jane", role: "Jane Doe" }
  ],
  directors: ["https://example.com/director/spielberg"],
  writers: ["https://example.com/writer/alice"],
  duration: 7200,              // Length in seconds (integer >= 1)
  releaseDate: "2024-06-15",   // ISO 8601 datetime
  tags: ["Action", "Thriller"],
  series: "https://example.com/series/breaking-bad", // For video.episode
}
```

### 🎵 Music (`data.music`)

Music metadata for `og:type="music.*"` pages (song, album, playlist, radio_station).

```typescript
// For music.song:
{
  duration: 245,               // Length in seconds (integer >= 1)
  albums: [
    { url: "https://example.com/album/1", disc: 1, track: 5 }
  ],
  musicians: ["https://example.com/artist/beatles"],
}

// For music.album:
{
  songs: [
    { url: "https://example.com/song/1", disc: 1, track: 1 },
    { url: "https://example.com/song/2", disc: 1, track: 2 }
  ],
  musicians: ["https://example.com/artist/beatles"],
  releaseDate: "1969-09-26",
}

// For music.playlist or music.radio_station:
{
  songs: [{ url: "https://example.com/song/1" }],
  creator: "https://example.com/user/john",
}
```

### 📚 Book (`data.book`)

Book metadata for `og:type="book"` pages.

```typescript
{
  authors: ["https://example.com/author/harper-lee"],
  isbn: "978-0-06-112008-4",
  releaseDate: "1960-07-11",
  tags: ["Classic", "Literature", "Fiction"],
}
```

### 👤 Profile (`data.profile`)

Profile metadata for `og:type="profile"` pages.

```typescript
{
  firstName: "Jane",
  lastName: "Doe",
  username: "janedoe",
  gender: "female",  // Only "male" or "female" per OpenGraph spec
}
```

### 🔗 JSON-LD (`data.jsonLd`)

Structured data with full @id reference resolution.

```typescript
{
  items: [
    {
      type: "Article",
      name: "Article Title",
      description: "Article description",
      url: "https://example.com/article",
      datePublished: "2024-01-15",
      dateModified: "2024-01-16",
      author: {
        type: "Person",
        name: "Jane Doe",
        url: "https://example.com/author/jane"
      },
      publisher: {
        type: "Organization",
        name: "Tech Blog",
        logo: "https://example.com/logo.png"
      },
      image: "https://example.com/image.jpg",
      // All other properties preserved
    }
  ],
  raw: [/* Original parsed JSON-LD objects */],
}
```

**🔄 @id Reference Resolution:** Ogie automatically resolves JSON-LD references:

```html
<script type="application/ld+json">
  {
    "@graph": [
      { "@id": "#author", "@type": "Person", "name": "Jane Doe" },
      { "@type": "Article", "author": { "@id": "#author" } }
    ]
  }
</script>
```

The `author` reference is automatically resolved to the full Person object.

### 📜 Dublin Core (`data.dublinCore`)

Dublin Core Metadata Element Set (DCMES 1.1) plus DCTERMS extensions.

```typescript
{
  // Core DCMES 1.1 elements
  title: "Document Title",
  creator: ["Author Name"],
  subject: ["Topic 1", "Topic 2"],
  description: "Document description",
  publisher: "Publisher Name",
  contributor: ["Contributor 1"],
  date: "2024-01-15",
  type: "Text",
  format: "text/html",
  identifier: "ISBN:1234567890",
  source: "https://original-source.com",
  language: "en",
  relation: "https://related-document.com",
  coverage: "Global",
  rights: "CC BY 4.0",

  // DCTERMS extension
  audience: "General Public",
}
```

### 📱 App Links (`data.appLinks`)

Facebook App Links for deep linking to mobile apps.

```typescript
{
  ios: [
    { url: "app://...", appStoreId: "123456", appName: "My App" }
  ],
  iphone: [
    { url: "app://...", appStoreId: "123456" }
  ],
  ipad: [
    { url: "app://...", appStoreId: "123456" }
  ],
  android: [
    { url: "app://...", package: "com.example.app", appName: "My App", class: "MainActivity" }
  ],
  windows: [
    { url: "app://...", appId: "App.Id", appName: "My App" }
  ],
  web: [
    { url: "https://...", shouldFallback: true }
  ],
}
```

### 🎞️ oEmbed (`data.oEmbed`)

oEmbed data (populated when `fetchOEmbed: true`). Thumbnail fields use all-or-nothing validation per spec.

```typescript
// Photo type
{
  type: "photo",
  version: "1.0",
  title: "Photo Title",
  url: "https://example.com/photo.jpg",
  width: 1200,
  height: 800,
  authorName: "Photographer",
  authorUrl: "https://...",
  providerName: "Flickr",
  providerUrl: "https://flickr.com",
  thumbnailUrl: "https://...",      // All three must be present
  thumbnailWidth: 150,              // or none will be included
  thumbnailHeight: 100,
  cacheAge: 86400,
}

// Video type
{
  type: "video",
  version: "1.0",
  title: "Video Title",
  html: "<iframe ...></iframe>",
  width: 640,
  height: 360,
  authorName: "Channel Name",
  authorUrl: "https://...",
  providerName: "YouTube",
  providerUrl: "https://youtube.com",
}

// Rich type
{
  type: "rich",
  version: "1.0",
  html: "<blockquote>...</blockquote>",
  width: 550,
  height: 200,
}

// Link type
{
  type: "link",
  version: "1.0",
  title: "Link Title",
}
```

### 🔍 oEmbed Discovery (`data.oEmbedDiscovery`)

Discovered oEmbed endpoints (always populated, fetch controlled by `fetchOEmbed` option).

```typescript
{
  jsonUrl: "https://example.com/oembed?url=...&format=json",
  xmlUrl: "https://example.com/oembed?url=...&format=xml",
}
```

### 📡 RSS/Atom Feeds (`data.feeds`)

Discovered RSS, Atom, and JSON Feed links from the page.

```typescript
{
  feeds: [
    {
      url: "https://example.com/feed.xml",
      type: "rss", // "rss" | "atom" | "json"
      title: "Blog RSS Feed",
    },
    {
      url: "https://example.com/atom.xml",
      type: "atom",
      title: "Blog Atom Feed",
    },
    {
      url: "https://example.com/feed.json",
      type: "json", // title is optional
    },
  ];
}
```

**Supported MIME types:**

| MIME Type                | Feed Type |
| ------------------------ | --------- |
| `application/rss+xml`    | `rss`     |
| `application/x-rss+xml`  | `rss`     |
| `text/rss+xml`           | `rss`     |
| `application/atom+xml`   | `atom`    |
| `application/x-atom+xml` | `atom`    |
| `text/atom+xml`          | `atom`    |
| `application/feed+json`  | `json`    |

## ⚙️ Options Reference

### ExtractOptions

| Option             | Type                     | Default    | Description                     |
| ------------------ | ------------------------ | ---------- | ------------------------------- |
| `timeout`          | `number`                 | `10000`    | Request timeout in ms           |
| `maxRedirects`     | `number`                 | `5`        | Max redirects to follow         |
| `userAgent`        | `string`                 | `ogie/1.0` | Custom User-Agent string        |
| `headers`          | `Record<string, string>` | `{}`       | Custom HTTP headers             |
| `baseUrl`          | `string`                 | —          | Base URL for resolving relative |
| `onlyOpenGraph`    | `boolean`                | `false`    | Skip fallback parsing           |
| `allowPrivateUrls` | `boolean`                | `false`    | Allow localhost/private IPs     |
| `fetchOEmbed`      | `boolean`                | `false`    | Fetch oEmbed endpoint           |
| `convertCharset`   | `boolean`                | `false`    | Auto charset detection          |
| `cache`            | `MetadataCache \| false` | —          | Cache instance                  |
| `bypassCache`      | `boolean`                | `false`    | Force fresh fetch               |

### BulkOptions

| Option                 | Type       | Default | Description                    |
| ---------------------- | ---------- | ------- | ------------------------------ |
| `concurrency`          | `number`   | `10`    | Max parallel requests globally |
| `concurrencyPerDomain` | `number`   | `3`     | Max parallel per domain        |
| `minDelayPerDomain`    | `number`   | `200`   | Min ms between domain requests |
| `requestsPerMinute`    | `number`   | `600`   | Global rate limit              |
| `timeout`              | `number`   | `30000` | Timeout per request            |
| `continueOnError`      | `boolean`  | `true`  | Continue on failures           |
| `onProgress`           | `function` | —       | Progress callback              |
| `extractOptions`       | `object`   | —       | Options passed to each extract |

### CacheOptions

| Option       | Type       | Default  | Description       |
| ------------ | ---------- | -------- | ----------------- |
| `maxSize`    | `number`   | `100`    | Max cached items  |
| `ttl`        | `number`   | `300000` | TTL in ms (5 min) |
| `onEviction` | `function` | —        | Eviction callback |

## 🛡️ Error Handling

Ogie uses a discriminated union result type for type-safe error handling:

```typescript
import {
  extract,
  OgieError,
  FetchError,
  ParseError,
  isFetchError,
  isParseError,
  isOgieError,
} from "ogie";

const result = await extract(url);

if (!result.success) {
  const { error } = result;

  // Check error code
  switch (error.code) {
    case "INVALID_URL":
      console.log("Invalid URL format");
      break;
    case "FETCH_ERROR":
      console.log("Network request failed");
      break;
    case "TIMEOUT":
      console.log("Request timed out");
      break;
    case "PARSE_ERROR":
      console.log("Failed to parse HTML");
      break;
    case "NO_HTML":
      console.log("Response was not HTML");
      break;
    case "REDIRECT_LIMIT":
      console.log("Too many redirects");
      break;
  }

  // Use static type guards (cross-realm safe, uses duck-typing instead of instanceof)
  if (FetchError.is(error)) {
    console.log(`HTTP Status: ${error.statusCode}`);
  }

  if (ParseError.is(error)) {
    console.log(`Parse failed: ${error.message}`);
  }

  // Standalone type guard functions also work
  if (isFetchError(error)) {
    console.log(`HTTP Status: ${error.statusCode}`);
  }

  // Serialize error to plain object
  console.log(JSON.stringify(error.toJSON()));
}
```

### Error Types

| Error Class  | Description         | Properties                     |
| ------------ | ------------------- | ------------------------------ |
| `OgieError`  | Base error class    | `code`, `url`, `cause`, `_tag` |
| `FetchError` | Network/HTTP errors | `statusCode`, `_tag`           |
| `ParseError` | HTML parsing errors | `_tag`                         |

Each error class provides:

- **`_tag`** — Discriminant property for cross-realm type identification (`"OgieError"`, `"FetchError"`, `"ParseError"`)
- **`static is(error)`** — Cross-realm type guard using duck-typing (e.g., `FetchError.is(err)`)
- **`toJSON()`** — Serializes the error to a plain object

## 📦 Exported Types

All types are exported for use in your TypeScript code:

```typescript
import type {
  // Core types
  Metadata,
  ExtractResult,
  ExtractSuccess,
  ExtractFailure,
  ExtractOptions,

  // OpenGraph types
  OpenGraphData,
  OpenGraphImage,
  OpenGraphVideo,
  OpenGraphAudio,

  // Twitter Card types
  TwitterCardData,
  TwitterCardType,
  TwitterImage,
  TwitterPlayer,
  TwitterApp,
  TwitterAppPlatform,

  // Basic meta types
  BasicMetaData,
  FaviconData,

  // Type-specific metadata
  ArticleData,
  VideoData,
  VideoActor,
  MusicData,
  MusicAlbumRef,
  MusicSongRef,
  BookData,
  ProfileData,
  ProfileGender,

  // Structured data types
  JsonLdData,
  JsonLdItem,
  JsonLdPerson,
  JsonLdOrganization,
  DublinCoreData,

  // App Links types
  AppLinksData,
  AppLinkPlatform,
  AppLinksWeb,

  // oEmbed types
  OEmbedBase,
  OEmbedData,
  OEmbedType,
  OEmbedPhoto,
  OEmbedVideo,
  OEmbedRich,
  OEmbedLink,
  OEmbedDiscovery,

  // Feed types
  FeedsData,
  FeedLink,
  FeedType,

  // Cache types
  MetadataCache,
  CacheOptions,

  // Bulk types
  BulkOptions,
  BulkResult,
  BulkResultItem,
  BulkProgress,

  // Error types
  ErrorCode,
} from "ogie";
```

## 🔐 Security

Ogie includes built-in security protections:

- 🛡️ **SSRF Protection** — Blocks requests to private/internal IP ranges by default
- 🔗 **URL Validation** — Only allows HTTP/HTTPS protocols
- 🔄 **Redirect Limits** — Configurable max redirects (default: 5)
- ✅ **oEmbed Validation** — Validates oEmbed endpoints before fetching
- 🚫 **Header Injection Protection** — Blocks headers containing `\r` or `\n` characters
- 🔒 **HTTPS Downgrade Protection** — Prevents HTTPS→HTTP protocol downgrade during redirects
- 🔃 **Redirect Loop Detection** — Detects and blocks circular redirect chains
- 📏 **Response Size Limits** — Caps response size at 10MB to prevent memory exhaustion
- ⚙️ **Options Validation** — Validates `timeout` (positive number) and `maxRedirects` (non-negative integer)

```typescript
// Allow private URLs (for testing/development only)
await extract("http://localhost:3000", {
  allowPrivateUrls: true,
});
```

## 🧪 Testing

Comprehensive test suite with 28+ test files covering edge cases, real-world site scenarios (YouTube, GitHub, Medium, NYTimes, Reddit, etc.), security (XSS, SSRF), encoding, URL handling, JSON-LD, OpenGraph, Twitter Cards, Dublin Core, App Links, structured types (music, video, book, profile), feeds/oEmbed, favicons, and fallback behavior.

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test suites
bun test tests/security.test.ts
bun test tests/real-world-1.test.ts
bun test tests/opengraph-edge-cases.test.ts
bun test tests/jsonld-edge-cases.test.ts
```

## 📄 License

MIT © [Dobroslav Radosavljevic](https://github.com/dobroslavradosavljevic)

---

Made with ❤️ for the web scraping community
