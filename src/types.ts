/**
 * Ogie - TypeScript interfaces for OpenGraph/Metadata extraction
 */

import type { MetadataCache } from "./cache";
import type { OgieError } from "./errors";
import type { AppLinksData } from "./parsers/app-links";
import type { ArticleData } from "./parsers/article";
import type { BookData } from "./parsers/book";
import type { DublinCoreData } from "./parsers/dublin-core";
import type { JsonLdData } from "./parsers/jsonld";
import type { MusicData } from "./parsers/music";
import type { ProfileData } from "./parsers/profile";
import type { VideoData } from "./parsers/video";

// =============================================================================
// oEmbed Types
// =============================================================================

/**
 * oEmbed resource type
 * @see https://oembed.com/
 */
export type OEmbedType = "photo" | "video" | "link" | "rich";

/**
 * Base oEmbed response fields (common to all types)
 */
export interface OEmbedBase {
  /** oEmbed version (always "1.0") */
  version: string;

  /** Resource type */
  type: OEmbedType;

  /** Title of the resource */
  title?: string;

  /** Name of the author/owner */
  authorName?: string;

  /** URL of the author/owner */
  authorUrl?: string;

  /** Name of the provider */
  providerName?: string;

  /** URL of the provider */
  providerUrl?: string;

  /** Suggested cache lifetime in seconds */
  cacheAge?: number;

  /** Thumbnail URL */
  thumbnailUrl?: string;

  /** Thumbnail width */
  thumbnailWidth?: number;

  /** Thumbnail height */
  thumbnailHeight?: number;
}

/**
 * oEmbed photo response
 */
export interface OEmbedPhoto extends OEmbedBase {
  type: "photo";
  /** Source URL of the image */
  url: string;
  /** Width of the image in pixels */
  width: number;
  /** Height of the image in pixels */
  height: number;
}

/**
 * oEmbed video response
 */
export interface OEmbedVideo extends OEmbedBase {
  type: "video";
  /** HTML embed code */
  html: string;
  /** Width of the video player */
  width: number;
  /** Height of the video player */
  height: number;
}

/**
 * oEmbed rich content response
 */
export interface OEmbedRich extends OEmbedBase {
  type: "rich";
  /** HTML embed code */
  html: string;
  /** Width of the widget */
  width: number;
  /** Height of the widget */
  height: number;
}

/**
 * oEmbed link response (generic URL)
 */
export interface OEmbedLink extends OEmbedBase {
  type: "link";
}

/**
 * Union type for all oEmbed response types
 */
export type OEmbedData = OEmbedPhoto | OEmbedVideo | OEmbedRich | OEmbedLink;

/**
 * oEmbed discovery links found in HTML
 */
export interface OEmbedDiscovery {
  /** JSON oEmbed endpoint URL */
  jsonUrl?: string;
  /** XML oEmbed endpoint URL */
  xmlUrl?: string;
}

// =============================================================================
// Result Types (Discriminated Union)
// =============================================================================

/**
 * Success result containing extracted metadata
 */
export interface ExtractSuccess {
  success: true;
  data: Metadata;
}

/**
 * Failure result containing error information
 */
export interface ExtractFailure {
  success: false;
  error: OgieError;
}

/**
 * Discriminated union result type for extraction operations
 */
export type ExtractResult = ExtractSuccess | ExtractFailure;

// =============================================================================
// Options
// =============================================================================

/**
 * Configuration options for metadata extraction
 */
export interface ExtractOptions {
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Custom HTTP headers to send with the request */
  headers?: Record<string, string>;

  /** Maximum number of redirects to follow (default: 5) */
  maxRedirects?: number;

  /** Custom User-Agent string for the request */
  userAgent?: string;

  /** Base URL for resolving relative URLs when parsing HTML strings */
  baseUrl?: string;

  /** If true, skip fallback parsing (Twitter, basic meta) and only extract OpenGraph */
  onlyOpenGraph?: boolean;

  /** Allow fetching from private/internal IP ranges (default: false) */
  allowPrivateUrls?: boolean;

  /** Fetch oEmbed data from discovered endpoints (default: false) */
  fetchOEmbed?: boolean;

  /** Enable charset detection and conversion to UTF-8 (default: false) */
  convertCharset?: boolean;

  /** Cache instance to use for storing results, or false to disable caching */
  cache?: MetadataCache | false;

  /** Bypass cache and force a fresh fetch (result will still be cached) */
  bypassCache?: boolean;
}

// =============================================================================
// OpenGraph Types
// =============================================================================

/**
 * OpenGraph image metadata
 */
export interface OpenGraphImage {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * OpenGraph video metadata
 */
export interface OpenGraphVideo {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
}

/**
 * OpenGraph audio metadata
 */
export interface OpenGraphAudio {
  url: string;
  secureUrl?: string;
  type?: string;
}

/**
 * Complete OpenGraph metadata structure
 * @see https://ogp.me/
 */
export interface OpenGraphData {
  /** og:title - The title of the object */
  title?: string;

  /** og:type - The type of object (e.g., website, article, video) */
  type?: string;

  /** og:url - The canonical URL of the object */
  url?: string;

  /** og:description - A description of the object */
  description?: string;

  /** og:site_name - The name of the overall site */
  siteName?: string;

  /** og:locale - The locale of the content (e.g., en_US) */
  locale?: string;

  /** og:locale:alternate - Array of alternate locales this content is available in */
  localeAlternate?: string[];

  /** og:determiner - The word that appears before the object's title (a, an, the, "", auto) */
  determiner?: string;

  /** og:image - Array of image objects */
  images: OpenGraphImage[];

  /** og:video - Array of video objects */
  videos?: OpenGraphVideo[];

  /** og:audio - Array of audio objects */
  audio?: OpenGraphAudio[];
}

// =============================================================================
// Twitter Card Types
// =============================================================================

/**
 * Twitter Card types
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
 */
export type TwitterCardType =
  | "summary"
  | "summary_large_image"
  | "app"
  | "player";

/**
 * Twitter Card image metadata
 */
export interface TwitterImage {
  url: string;
  alt?: string;
}

/**
 * Twitter Card player metadata for video/audio content
 */
export interface TwitterPlayer {
  url: string;
  width?: number;
  height?: number;
  stream?: string;
  streamContentType?: string;
}

/**
 * Twitter Card app metadata for a single platform
 */
export interface TwitterAppPlatform {
  id?: string;
  url?: string;
  name?: string;
}

/**
 * Twitter Card app metadata for mobile applications
 */
export interface TwitterApp {
  iphone?: TwitterAppPlatform;
  ipad?: TwitterAppPlatform;
  googleplay?: TwitterAppPlatform;
  country?: string;
}

/**
 * Twitter Card metadata structure
 */
export interface TwitterCardData {
  /** twitter:card - The card type */
  card?: TwitterCardType;

  /** twitter:site - The username of the website (e.g., "@example") */
  site?: string;

  /** twitter:site:id - The numeric user ID of the website */
  siteId?: string;

  /** twitter:creator - The username of the content creator (e.g., "@author") */
  creator?: string;

  /** twitter:creator:id - The numeric user ID of the content creator */
  creatorId?: string;

  /** twitter:title - Title of the content */
  title?: string;

  /** twitter:description - Description of the content */
  description?: string;

  /** twitter:image - Image for the card */
  image?: TwitterImage;

  /** twitter:player - Player card metadata for video/audio content */
  player?: TwitterPlayer;

  /** twitter:app - App card metadata for mobile applications */
  app?: TwitterApp;
}

// =============================================================================
// Basic Meta Types
// =============================================================================

/**
 * Basic HTML meta tags and document information
 */
/**
 * Favicon metadata with size and type information
 */
export interface FaviconData {
  /** URL to the favicon */
  url: string;

  /** Relationship type (icon, shortcut icon, apple-touch-icon, etc.) */
  rel: string;

  /** MIME type (image/png, image/svg+xml, image/x-icon) */
  type?: string;

  /** Size specification (e.g., "32x32", "48x48 96x96", "any") */
  sizes?: string;

  /** Color for mask-icon SVG favicons */
  color?: string;
}

export interface BasicMetaData {
  /** Document title from <title> tag */
  title?: string;

  /** Meta description */
  description?: string;

  /** Canonical URL from <link rel="canonical"> */
  canonical?: string;

  /** Favicon URL from <link rel="icon"> or <link rel="shortcut icon"> (first match) */
  favicon?: string;

  /** All discovered favicons with metadata */
  favicons?: FaviconData[];

  /** Web manifest URL from <link rel="manifest"> */
  manifestUrl?: string;

  /** Author meta tag */
  author?: string;

  /** Document charset (e.g., utf-8) */
  charset?: string;

  /** Keywords meta tag */
  keywords?: string;

  /** Robots meta tag (e.g., index, follow) */
  robots?: string;

  /** Viewport meta tag */
  viewport?: string;

  /** Theme color meta tag */
  themeColor?: string;

  /** Generator meta tag (e.g., "WordPress 6.0") */
  generator?: string;

  /** Application name meta tag */
  applicationName?: string;

  /** Referrer policy meta tag */
  referrer?: string;
}

// =============================================================================
// Main Metadata Structure
// =============================================================================

/**
 * Complete extracted metadata from a URL or HTML document
 */
export interface Metadata {
  /** The originally requested URL */
  requestUrl: string;

  /** The final URL after redirects */
  finalUrl: string;

  /** OpenGraph metadata */
  og: OpenGraphData;

  /** Twitter Card metadata */
  twitter: TwitterCardData;

  /** Basic HTML meta tags */
  basic: BasicMetaData;

  /** App Links metadata */
  appLinks?: AppLinksData;

  /** Article metadata (for og:type="article") */
  article?: ArticleData;

  /** Book metadata (for og:type="book") */
  book?: BookData;

  /** Dublin Core metadata */
  dublinCore?: DublinCoreData;

  /** Music metadata (for og:type="music.*") */
  music?: MusicData;

  /** Profile metadata (for og:type="profile") */
  profile?: ProfileData;

  /** Video metadata (for og:type="video.*") */
  video?: VideoData;

  /** JSON-LD structured data */
  jsonLd?: JsonLdData;

  /** oEmbed discovery links found in HTML */
  oEmbedDiscovery?: OEmbedDiscovery;

  /** oEmbed data (only populated if fetchOEmbed option is true) */
  oEmbed?: OEmbedData;

  /** HTTP status code from the response */
  statusCode?: number;

  /** Content-Type header from the response */
  contentType?: string;

  /** Detected charset (only populated if convertCharset option is true) */
  charset?: string;
}
