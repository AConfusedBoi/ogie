import type { CheerioAPI } from "cheerio";

import type { OEmbedData, OEmbedDiscovery, OEmbedType } from "../types";

const OEMBED_JSON_TYPE = "application/json+oembed";
const OEMBED_XML_TYPES = new Set(["text/xml+oembed", "application/xml+oembed"]);
const VALID_OEMBED_TYPES = new Set<OEmbedType>([
  "photo",
  "video",
  "link",
  "rich",
]);

/**
 * Parse oEmbed discovery links from HTML
 * Discovers <link rel="alternate" type="application/json+oembed" href="...">
 */
export const parseOEmbedDiscovery = ($: CheerioAPI): OEmbedDiscovery => {
  let jsonUrl: string | undefined;
  let xmlUrl: string | undefined;

  $('link[rel="alternate"]').each((_, el) => {
    const type = $(el).attr("type")?.trim().toLowerCase();
    const href = $(el).attr("href")?.trim();

    if (!href) {
      return;
    }

    if (type === OEMBED_JSON_TYPE && !jsonUrl) {
      jsonUrl = href;
    } else if (type && OEMBED_XML_TYPES.has(type) && !xmlUrl) {
      xmlUrl = href;
    }
  });

  return {
    ...(jsonUrl && { jsonUrl }),
    ...(xmlUrl && { xmlUrl }),
  };
};

/**
 * Check if discovery object has any URLs
 */
export const hasOEmbedDiscovery = (discovery: OEmbedDiscovery): boolean =>
  Boolean(discovery.jsonUrl ?? discovery.xmlUrl);

/**
 * Validate oEmbed type
 */
const isValidOEmbedType = (type: unknown): type is OEmbedType =>
  typeof type === "string" && VALID_OEMBED_TYPES.has(type as OEmbedType);

/**
 * Parse optional string field
 */
const parseString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Parse optional number field
 */
const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const num = Number.parseInt(value, 10);
    return Number.isNaN(num) ? undefined : num;
  }
  return undefined;
};

/**
 * Extract base oEmbed fields common to all types
 */
const extractBaseFields = (
  json: Record<string, unknown>
): Omit<OEmbedData, "type" | "url" | "html" | "width" | "height"> => ({
  authorName: parseString(json.author_name),
  authorUrl: parseString(json.author_url),
  cacheAge: parseNumber(json.cache_age),
  providerName: parseString(json.provider_name),
  providerUrl: parseString(json.provider_url),
  thumbnailHeight: parseNumber(json.thumbnail_height),
  thumbnailUrl: parseString(json.thumbnail_url),
  thumbnailWidth: parseNumber(json.thumbnail_width),
  title: parseString(json.title),
  version: parseString(json.version) ?? "1.0",
});

/**
 * Parse photo-type oEmbed response
 */
const parsePhotoResponse = (
  obj: Record<string, unknown>,
  baseFields: ReturnType<typeof extractBaseFields>
): OEmbedData | undefined => {
  const url = parseString(obj.url);
  const width = parseNumber(obj.width);
  const height = parseNumber(obj.height);

  if (!url || width === undefined || height === undefined) {
    return undefined;
  }

  return { ...baseFields, height, type: "photo", url, width };
};

/**
 * Parse video or rich-type oEmbed response
 */
const parseEmbedResponse = (
  obj: Record<string, unknown>,
  baseFields: ReturnType<typeof extractBaseFields>,
  type: "video" | "rich"
): OEmbedData | undefined => {
  const html = parseString(obj.html);
  const width = parseNumber(obj.width);
  const height = parseNumber(obj.height);

  if (!html || width === undefined || height === undefined) {
    return undefined;
  }

  return { ...baseFields, height, html, type, width };
};

/**
 * Route to appropriate parser based on oEmbed type
 */
const parseByType = (
  obj: Record<string, unknown>,
  type: OEmbedType,
  baseFields: ReturnType<typeof extractBaseFields>
): OEmbedData | undefined => {
  if (type === "photo") {
    return parsePhotoResponse(obj, baseFields);
  }
  if (type === "video" || type === "rich") {
    return parseEmbedResponse(obj, baseFields, type);
  }
  return { ...baseFields, type };
};

/**
 * Parse and validate oEmbed JSON response
 * Returns undefined if the response is invalid
 */
export const parseOEmbedResponse = (json: unknown): OEmbedData | undefined => {
  if (typeof json !== "object" || json === null) {
    return undefined;
  }

  const obj = json as Record<string, unknown>;
  const { type } = obj;

  if (!isValidOEmbedType(type)) {
    return undefined;
  }

  return parseByType(obj, type, extractBaseFields(obj));
};
