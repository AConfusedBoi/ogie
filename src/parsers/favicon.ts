import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";

import type { FaviconData } from "../types";

import { resolveUrl } from "../utils/url";

/**
 * Favicon link relationship types to extract
 * Order matters: more specific patterns must come first for correct matching
 */
const FAVICON_RELS = [
  "apple-touch-icon-precomposed",
  "apple-touch-icon",
  "shortcut icon",
  "mask-icon",
  "icon",
] as const;

/**
 * Invalid href patterns that should be rejected
 */
const INVALID_HREF_PATTERNS = [
  /^javascript:/i,
  /^vbscript:/i,
  /^data:text\/html/i,
  /^#/,
  /^\s*$/,
];

export interface FaviconParseResult {
  favicons: FaviconData[];
  manifestUrl?: string;
}

/**
 * Normalize rel attribute value for comparison
 */
const normalizeRel = (rel: string): string =>
  rel.toLowerCase().trim().replaceAll(/\s+/g, " ");

/**
 * Check if multi-token rel matches consecutively in the rel tokens
 */
const matchesMultiTokenRel = (
  relTokens: string[],
  faviconTokens: string[]
): boolean => {
  for (let i = 0; i <= relTokens.length - faviconTokens.length; i += 1) {
    const slice = relTokens.slice(i, i + faviconTokens.length);
    if (slice.every((token, idx) => token === faviconTokens[idx])) {
      return true;
    }
  }
  return false;
};

/**
 * Check if a rel value matches any favicon type using word boundary matching
 * to avoid false positives like "not-icon" matching "icon"
 */
const matchesFaviconRel = (normalizedRel: string): string | undefined => {
  const relTokens = normalizedRel.split(" ");

  for (const faviconRel of FAVICON_RELS) {
    const faviconTokens = faviconRel.split(" ");
    const isMatch =
      faviconTokens.length === 1
        ? relTokens.includes(faviconRel)
        : matchesMultiTokenRel(relTokens, faviconTokens);

    if (isMatch) {
      return faviconRel;
    }
  }

  return undefined;
};

/**
 * Check if a href value is valid for a favicon
 */
const isValidHref = (href: string): boolean => {
  if (!href) {
    return false;
  }
  return !INVALID_HREF_PATTERNS.some((pattern) => pattern.test(href));
};

/**
 * Extract optional attributes from a favicon link element
 */
const extractOptionalAttrs = (
  $el: Cheerio<Element>
): Pick<FaviconData, "color" | "sizes" | "type"> => {
  const type = $el.attr("type")?.trim();
  const sizes = $el.attr("sizes")?.trim();
  const color = $el.attr("color")?.trim();

  return {
    ...(color && { color }),
    ...(sizes && { sizes }),
    ...(type && { type }),
  };
};

/**
 * Parse a single link element into FaviconData
 */
const parseFaviconLink = (
  $: CheerioAPI,
  el: Element,
  faviconRel: string,
  baseUrl?: string
): FaviconData | undefined => {
  const $el = $(el);
  const href = $el.attr("href")?.trim();

  if (!href || !isValidHref(href)) {
    return undefined;
  }

  return {
    rel: faviconRel,
    url: resolveUrl(href, baseUrl),
    ...extractOptionalAttrs($el),
  };
};

/**
 * Try to extract manifest URL from a link element
 */
const tryExtractManifest = (
  $el: Cheerio<Element>,
  normalizedRel: string,
  baseUrl?: string
): string | undefined => {
  if (normalizedRel !== "manifest") {
    return undefined;
  }
  const href = $el.attr("href")?.trim();
  return href && isValidHref(href) ? resolveUrl(href, baseUrl) : undefined;
};

/**
 * Process a single link element during traversal
 */
const processLinkElement = (
  $: CheerioAPI,
  el: Element,
  baseUrl?: string
): { favicon?: FaviconData; manifestUrl?: string } => {
  const $el = $(el);
  const rel = $el.attr("rel") ?? "";
  const normalizedRel = normalizeRel(rel);

  const manifestUrl = tryExtractManifest($el, normalizedRel, baseUrl);
  if (manifestUrl) {
    return { manifestUrl };
  }

  const faviconRel = matchesFaviconRel(normalizedRel);
  const favicon = faviconRel
    ? parseFaviconLink($, el, faviconRel, baseUrl)
    : undefined;

  return { favicon };
};

/**
 * Parse all favicon links from the document
 * Optimized to extract manifest URL during the main traversal to avoid double DOM traversal
 */
export const parseFavicons = (
  $: CheerioAPI,
  baseUrl?: string
): FaviconParseResult => {
  const favicons: FaviconData[] = [];
  let manifestUrl: string | undefined;

  $("link[rel][href]").each((_, el) => {
    const result = processLinkElement($, el, baseUrl);
    if (result.manifestUrl && !manifestUrl) {
      ({ manifestUrl } = result);
    } else if (result.favicon) {
      favicons.push(result.favicon);
    }
  });

  return { favicons, ...(manifestUrl && { manifestUrl }) };
};

/**
 * Get the first/primary favicon URL (for backward compatibility)
 */
export const getPrimaryFavicon = (
  favicons: FaviconData[]
): string | undefined => favicons[0]?.url;
