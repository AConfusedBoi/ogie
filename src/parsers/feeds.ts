import type { CheerioAPI } from "cheerio";

import { resolveUrl } from "../utils/url";

/**
 * Feed format type
 */
export type FeedType = "rss" | "atom" | "json";

/**
 * Individual feed link discovered in HTML
 */
export interface FeedLink {
  /** Resolved feed URL */
  url: string;
  /** Feed format type */
  type: FeedType;
  /** Optional title from the title attribute */
  title?: string;
}

/**
 * All discovered feed links from a page
 */
export interface FeedsData {
  /** Array of discovered feed links */
  feeds: FeedLink[];
}

const FEED_MIME_TYPES: Record<string, FeedType> = {
  "application/atom+xml": "atom",
  "application/feed+json": "json",
  "application/rss+xml": "rss",
  "application/x-atom+xml": "atom",
  "application/x-rss+xml": "rss",
  "text/atom+xml": "atom",
  "text/rss+xml": "rss",
};

interface RawFeedAttrs {
  type: string | undefined;
  href: string | undefined;
  title: string | undefined;
}

const createFeedLink = (
  attrs: RawFeedAttrs,
  baseUrl?: string
): FeedLink | undefined => {
  if (!attrs.href || !attrs.type) {
    return undefined;
  }

  const feedType = FEED_MIME_TYPES[attrs.type];
  if (!feedType) {
    return undefined;
  }

  return {
    type: feedType,
    url: resolveUrl(attrs.href, baseUrl),
    ...(attrs.title && { title: attrs.title }),
  };
};

/**
 * Parse RSS/Atom/JSON feed discovery links from HTML
 * Discovers <link rel="alternate" type="application/rss+xml" href="...">
 */
export const parseFeeds = ($: CheerioAPI, baseUrl?: string): FeedsData => {
  const feeds: FeedLink[] = [];
  const seenUrls = new Set<string>();

  $('link[rel="alternate"]').each((_, el) => {
    const $el = $(el);
    const attrs: RawFeedAttrs = {
      href: $el.attr("href")?.trim(),
      title: $el.attr("title")?.trim() || undefined,
      type: $el.attr("type")?.trim().toLowerCase(),
    };
    const feed = createFeedLink(attrs, baseUrl);
    if (!feed || seenUrls.has(feed.url)) {
      return;
    }
    seenUrls.add(feed.url);
    feeds.push(feed);
  });

  return { feeds };
};

/**
 * Check if feeds data has any feeds
 */
export const hasFeeds = (data: FeedsData): boolean => data.feeds.length > 0;
