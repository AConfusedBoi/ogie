import type { CheerioAPI } from "cheerio";

import type {
  TwitterApp,
  TwitterAppPlatform,
  TwitterCardData,
  TwitterCardType,
  TwitterImage,
  TwitterPlayer,
} from "../types";

import { resolveUrl } from "../utils/url";
import { getMetaContentAny } from "./utils";

const VALID_CARD_TYPES = new Set<TwitterCardType>([
  "summary",
  "summary_large_image",
  "app",
  "player",
]);

const isValidCardType = (value: string): value is TwitterCardType =>
  VALID_CARD_TYPES.has(value as TwitterCardType);

const parseCardType = ($: CheerioAPI): TwitterCardType | undefined => {
  const cardType = getMetaContentAny($, "twitter:card");
  return cardType && isValidCardType(cardType) ? cardType : undefined;
};

const parseImage = (
  $: CheerioAPI,
  baseUrl?: string
): TwitterImage | undefined => {
  const imageUrl = getMetaContentAny($, "twitter:image");
  if (!imageUrl) {
    return undefined;
  }

  const resolvedUrl = resolveUrl(imageUrl, baseUrl);
  const imageAlt = getMetaContentAny($, "twitter:image:alt");

  return { url: resolvedUrl, ...(imageAlt && { alt: imageAlt }) };
};

const parseNum = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
};

const parsePlayer = (
  $: CheerioAPI,
  baseUrl?: string
): TwitterPlayer | undefined => {
  const playerUrl = getMetaContentAny($, "twitter:player");

  if (!playerUrl) {
    return undefined;
  }

  const width = getMetaContentAny($, "twitter:player:width");
  const height = getMetaContentAny($, "twitter:player:height");
  const stream = getMetaContentAny($, "twitter:player:stream");
  const streamContentType = getMetaContentAny(
    $,
    "twitter:player:stream:content_type"
  );

  const parsedWidth = width ? parseNum(width) : undefined;
  const parsedHeight = height ? parseNum(height) : undefined;

  return {
    url: resolveUrl(playerUrl, baseUrl),
    ...(parsedWidth !== undefined && { width: parsedWidth }),
    ...(parsedHeight !== undefined && { height: parsedHeight }),
    ...(stream && { stream: resolveUrl(stream, baseUrl) }),
    ...(streamContentType && { streamContentType }),
  };
};

const parseAppPlatform = (
  $: CheerioAPI,
  platform: "iphone" | "ipad" | "googleplay"
): TwitterAppPlatform | undefined => {
  const id = getMetaContentAny($, `twitter:app:id:${platform}`);
  const url = getMetaContentAny($, `twitter:app:url:${platform}`);
  const name = getMetaContentAny($, `twitter:app:name:${platform}`);

  if (!id && !url && !name) {
    return undefined;
  }

  return {
    ...(id && { id }),
    ...(url && { url }),
    ...(name && { name }),
  };
};

const parseApp = ($: CheerioAPI): TwitterApp | undefined => {
  const iphone = parseAppPlatform($, "iphone");
  const ipad = parseAppPlatform($, "ipad");
  const googleplay = parseAppPlatform($, "googleplay");
  const country = getMetaContentAny($, "twitter:app:country");

  if (!iphone && !ipad && !googleplay && !country) {
    return undefined;
  }

  return {
    ...(iphone && { iphone }),
    ...(ipad && { ipad }),
    ...(googleplay && { googleplay }),
    ...(country && { country }),
  };
};

interface SiteCreatorData {
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
}

const parseSiteAndCreator = ($: CheerioAPI): SiteCreatorData => {
  const site = getMetaContentAny($, "twitter:site");
  const siteId = getMetaContentAny($, "twitter:site:id");
  const creator = getMetaContentAny($, "twitter:creator");
  const creatorId = getMetaContentAny($, "twitter:creator:id");

  return {
    ...(site && { site }),
    ...(siteId && { siteId }),
    ...(creator && { creator }),
    ...(creatorId && { creatorId }),
  };
};

/**
 * Parse Twitter Card metadata from HTML
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup
 */
export const parseTwitterCard = (
  $: CheerioAPI,
  baseUrl?: string
): TwitterCardData => {
  const card = parseCardType($);
  const siteCreator = parseSiteAndCreator($);
  const title = getMetaContentAny($, "twitter:title");
  const description = getMetaContentAny($, "twitter:description");
  const image = parseImage($, baseUrl);
  const player = parsePlayer($, baseUrl);
  const app = parseApp($);

  return {
    ...(card && { card }),
    ...siteCreator,
    ...(title && { title }),
    ...(description && { description }),
    ...(image && { image }),
    ...(player && { player }),
    ...(app && { app }),
  };
};
