/**
 * Ogie - OpenGraph and metadata extraction library
 */

// Main extraction functions
export { extract, extractFromHtml } from "./extract";

// Bulk extraction
export { extractBulk } from "./bulk";
export type {
  BulkOptions,
  BulkProgress,
  BulkResult,
  BulkResultItem,
} from "./bulk";

// Cache utilities
export {
  createCache,
  generateCacheKey,
  type CacheOptions,
  type MetadataCache,
} from "./cache";

// Types
export type {
  ExtractResult,
  ExtractSuccess,
  ExtractFailure,
  ExtractOptions,
  Metadata,
  OpenGraphData,
  OpenGraphImage,
  OpenGraphVideo,
  OpenGraphAudio,
  TwitterCardData,
  TwitterCardType,
  TwitterImage,
  TwitterPlayer,
  TwitterApp,
  TwitterAppPlatform,
  BasicMetaData,
  FaviconData,
  OEmbedType,
  OEmbedBase,
  OEmbedPhoto,
  OEmbedVideo,
  OEmbedRich,
  OEmbedLink,
  OEmbedData,
  OEmbedDiscovery,
} from "./types";

export type {
  AppLinksData,
  AppLinkPlatform,
  AppLinksWeb,
} from "./parsers/app-links";

export type { ArticleData } from "./parsers/article";

export type { BookData } from "./parsers/book";

export type { DublinCoreData } from "./parsers/dublin-core";

export type { MusicAlbumRef, MusicData, MusicSongRef } from "./parsers/music";

export type { ProfileData, ProfileGender } from "./parsers/profile";

export type { VideoActor, VideoData } from "./parsers/video";

export type { FeedLink, FeedsData, FeedType } from "./parsers/feeds";

export type {
  JsonLdData,
  JsonLdItem,
  JsonLdOrganization,
  JsonLdPerson,
} from "./parsers/jsonld";

// Error classes, types, and type guards
export type { ErrorCode } from "./errors";
export {
  OgieError,
  FetchError,
  ParseError,
  isOgieError,
  isFetchError,
  isParseError,
} from "./errors";
