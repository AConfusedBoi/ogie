import type { CheerioAPI } from "cheerio";

import type {
  OpenGraphAudio,
  OpenGraphData,
  OpenGraphImage,
  OpenGraphVideo,
} from "../types";

import { resolveUrl } from "../utils/url";

interface OgTag {
  property: string;
  content: string;
}
type MediaBuilder<T> = (
  d: Record<string, string>,
  base: string | undefined
) => T | undefined;

const getOgContent = ($: CheerioAPI, prop: string): string | undefined => {
  const c =
    $(`meta[property="${prop}"]`).attr("content")?.trim() ||
    $(`meta[name="${prop}"]`).attr("content")?.trim();
  return c || undefined;
};

const parseNum = (v: string | undefined): number | undefined => {
  if (!v) {
    return undefined;
  }
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

const extractOgTags = ($: CheerioAPI): OgTag[] => {
  const tags: OgTag[] = [];
  $('meta[property^="og:"], meta[name^="og:"]').each((_, el) => {
    const property =
      $(el).attr("property")?.trim() || $(el).attr("name")?.trim();
    const content = $(el).attr("content")?.trim();
    if (property && content) {
      tags.push({ content, property });
    }
  });
  return tags;
};

const finalize = <T extends { url: string }>(
  d: Record<string, string>,
  base: string | undefined,
  build: MediaBuilder<T>,
  out: T[]
): void => {
  if (!d.url) {
    return;
  }
  d.url = base ? resolveUrl(d.url, base) : d.url;
  const o = build(d, base);
  if (o) {
    out.push(o);
  }
};

const process = <T extends { url: string }>(
  t: OgTag,
  pfx: string,
  base: string | undefined,
  build: MediaBuilder<T>,
  cur: Record<string, string>,
  out: T[]
): Record<string, string> => {
  if (!t.property.startsWith(pfx)) {
    return cur;
  }
  const s = t.property.slice(pfx.length);
  if (s === "" || s === ":url") {
    finalize(cur, base, build, out);
    return { url: t.content };
  }
  if (s.startsWith(":")) {
    cur[s.slice(1)] = t.content;
  }
  return cur;
};

const parseMedia = <T extends { url: string }>(
  tags: OgTag[],
  pfx: string,
  base: string | undefined,
  build: MediaBuilder<T>
): T[] => {
  const out: T[] = [];
  let cur: Record<string, string> = {};
  for (const t of tags) {
    cur = process(t, pfx, base, build, cur, out);
  }
  finalize(cur, base, build, out);
  return out;
};

const resolveSecureUrl = (
  secureUrl: string | undefined,
  base: string | undefined
): string | undefined => {
  if (!secureUrl) {
    return undefined;
  }
  return base ? resolveUrl(secureUrl, base) : secureUrl;
};

const buildImg = (
  d: Record<string, string>,
  base: string | undefined
): OpenGraphImage | undefined =>
  d.url
    ? {
        alt: d.alt,
        height: parseNum(d.height),
        secureUrl: resolveSecureUrl(d.secure_url, base),
        type: d.type,
        url: d.url,
        width: parseNum(d.width),
      }
    : undefined;

const buildVid = (
  d: Record<string, string>,
  base: string | undefined
): OpenGraphVideo | undefined =>
  d.url
    ? {
        height: parseNum(d.height),
        secureUrl: resolveSecureUrl(d.secure_url, base),
        type: d.type,
        url: d.url,
        width: parseNum(d.width),
      }
    : undefined;

const buildAud = (
  d: Record<string, string>,
  base: string | undefined
): OpenGraphAudio | undefined =>
  d.url
    ? {
        secureUrl: resolveSecureUrl(d.secure_url, base),
        type: d.type,
        url: d.url,
      }
    : undefined;

const VALID_DETERMINERS = new Set(["a", "an", "the", "", "auto"]);

const getDeterminer = ($: CheerioAPI): string | undefined => {
  const value = getOgContent($, "og:determiner");
  if (!value) {
    return undefined;
  }
  return VALID_DETERMINERS.has(value) ? value : undefined;
};

const getLocaleAlternate = ($: CheerioAPI): string[] | undefined => {
  const alternates: string[] = [];
  $(
    'meta[property="og:locale:alternate"], meta[name="og:locale:alternate"]'
  ).each((_, el) => {
    const content = $(el).attr("content")?.trim();
    if (content) {
      alternates.push(content);
    }
  });
  return alternates.length > 0 ? alternates : undefined;
};

export const parseOpenGraph = (
  $: CheerioAPI,
  baseUrl?: string
): OpenGraphData => {
  const tags = extractOgTags($);
  const rawUrl = getOgContent($, "og:url");
  const images = parseMedia(tags, "og:image", baseUrl, buildImg);
  const videos = parseMedia(tags, "og:video", baseUrl, buildVid);
  const audio = parseMedia(tags, "og:audio", baseUrl, buildAud);
  const localeAlternate = getLocaleAlternate($);
  const determiner = getDeterminer($);

  return {
    audio: audio.length > 0 ? audio : undefined,
    description: getOgContent($, "og:description"),
    ...(determiner && { determiner }),
    images,
    locale: getOgContent($, "og:locale"),
    ...(localeAlternate && { localeAlternate }),
    siteName: getOgContent($, "og:site_name"),
    title: getOgContent($, "og:title"),
    type: getOgContent($, "og:type"),
    url: rawUrl && baseUrl ? resolveUrl(rawUrl, baseUrl) : rawUrl,
    videos: videos.length > 0 ? videos : undefined,
  };
};
