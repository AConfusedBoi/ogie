import type { CheerioAPI } from "cheerio";

import type { BasicMetaData } from "../types";

import { resolveUrl } from "../utils/url";
import { getPrimaryFavicon, parseFavicons } from "./favicon";
import { getMetaContent } from "./utils";

const getCharset = ($: CheerioAPI): string | undefined => {
  const charset = $("meta[charset]").attr("charset")?.trim();
  if (charset) {
    return charset;
  }

  const contentType = $('meta[http-equiv="Content-Type"]').attr("content");
  if (contentType) {
    const match = /charset=([^\s;]+)/i.exec(contentType);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
};

const getDocumentMeta = (
  $: CheerioAPI,
  baseUrl?: string
): Pick<
  BasicMetaData,
  "title" | "canonical" | "favicon" | "favicons" | "manifestUrl" | "charset"
> => {
  const title = $("title").text().trim() || undefined;
  const canonicalHref = $('link[rel="canonical"]').attr("href")?.trim();
  const canonical = canonicalHref
    ? resolveUrl(canonicalHref, baseUrl)
    : undefined;
  const charset = getCharset($);

  // Parse all favicons with metadata
  const { favicons, manifestUrl } = parseFavicons($, baseUrl);
  const favicon = getPrimaryFavicon(favicons);

  return {
    ...(title && { title }),
    ...(canonical && { canonical }),
    ...(favicon && { favicon }),
    ...(favicons.length > 0 && { favicons }),
    ...(manifestUrl && { manifestUrl }),
    ...(charset && { charset }),
  };
};

const getMetaTags = (
  $: CheerioAPI
): Omit<BasicMetaData, "title" | "canonical" | "favicon" | "charset"> => {
  const description = getMetaContent($, "description");
  const author = getMetaContent($, "author");
  const keywords = getMetaContent($, "keywords");
  const robots = getMetaContent($, "robots");
  const viewport = getMetaContent($, "viewport");
  const themeColor = getMetaContent($, "theme-color");
  const generator = getMetaContent($, "generator");
  const applicationName = getMetaContent($, "application-name");
  const referrer = getMetaContent($, "referrer");

  return {
    ...(description && { description }),
    ...(author && { author }),
    ...(keywords && { keywords }),
    ...(robots && { robots }),
    ...(viewport && { viewport }),
    ...(themeColor && { themeColor }),
    ...(generator && { generator }),
    ...(applicationName && { applicationName }),
    ...(referrer && { referrer }),
  };
};

/** Parse basic HTML meta tags from a document */
export const parseBasicMeta = (
  $: CheerioAPI,
  baseUrl?: string
): BasicMetaData => ({
  ...getDocumentMeta($, baseUrl),
  ...getMetaTags($),
});
