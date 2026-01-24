import type { CheerioAPI } from "cheerio";

import { getMetaContentAny } from "./utils";

/**
 * OpenGraph Video actor metadata.
 * Represents a person who appears in the video.
 */
export interface VideoActor {
  /** URL to the actor's profile page */
  url: string;
  /** The role the actor played in the video */
  role?: string;
}

/**
 * OpenGraph Video type metadata.
 * @see https://ogp.me/#type_video
 */
export interface VideoData {
  /** Actors appearing in the video with optional roles */
  actors?: VideoActor[];
  /** Directors of the video */
  directors?: string[];
  /** Writers of the video */
  writers?: string[];
  /** Length of the video in seconds (integer >= 1) */
  duration?: number;
  /** ISO 8601 datetime when the video was released */
  releaseDate?: string;
  /** Tag words associated with this video */
  tags?: string[];
  /** URL to the series this episode belongs to (for video.episode type) */
  series?: string;
}

const getVideoContent = ($: CheerioAPI, name: string): string | undefined =>
  getMetaContentAny($, `video:${name}`) ??
  getMetaContentAny($, `og:video:${name}`);

interface MetaElement {
  property: string;
  content: string;
}

/**
 * Extract all video meta tags in document order.
 * This preserves the order needed to associate actor:role with the preceding actor.
 */
const extractVideoMetaTags = ($: CheerioAPI): MetaElement[] => {
  const tags: MetaElement[] = [];
  const selectors = [
    'meta[property^="video:"]',
    'meta[name^="video:"]',
    'meta[property^="og:video:"]',
    'meta[name^="og:video:"]',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const property =
        $(el).attr("property")?.trim() || $(el).attr("name")?.trim();
      const content = $(el).attr("content")?.trim();
      if (property && content) {
        // Normalize to video: prefix
        const normalizedProperty = property.startsWith("og:")
          ? property.slice(3)
          : property;
        tags.push({ content, property: normalizedProperty });
      }
    });
  }

  return tags;
};

/**
 * Parse actors and their roles from meta tags.
 * The actor:role tag applies to the immediately preceding actor tag.
 */
const parseActors = (tags: MetaElement[]): VideoActor[] => {
  const actors: VideoActor[] = [];

  for (const tag of tags) {
    if (tag.property === "video:actor") {
      actors.push({ url: tag.content });
    } else if (tag.property === "video:actor:role" && actors.length > 0) {
      const lastActor = actors.at(-1);
      if (lastActor && !lastActor.role) {
        lastActor.role = tag.content;
      }
    }
  }

  return actors;
};

/**
 * Get all unique values for a given property from meta tags.
 */
const getAllValues = (tags: MetaElement[], property: string): string[] => {
  const values: string[] = [];

  for (const tag of tags) {
    if (tag.property === property && !values.includes(tag.content)) {
      values.push(tag.content);
    }
  }

  return values;
};

/**
 * Parse duration ensuring it's a positive integer.
 */
const parseDuration = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    return undefined;
  }
  return n;
};

export const parseVideo = ($: CheerioAPI): VideoData => {
  const tags = extractVideoMetaTags($);

  const actors = parseActors(tags);
  const directors = getAllValues(tags, "video:director");
  const writers = getAllValues(tags, "video:writer");
  const tagsArray = getAllValues(tags, "video:tag");

  const durationStr = getVideoContent($, "duration");
  const duration = parseDuration(durationStr);
  const releaseDate = getVideoContent($, "release_date");
  const series = getVideoContent($, "series");

  return {
    actors: actors.length > 0 ? actors : undefined,
    directors: directors.length > 0 ? directors : undefined,
    duration,
    releaseDate,
    series,
    tags: tagsArray.length > 0 ? tagsArray : undefined,
    writers: writers.length > 0 ? writers : undefined,
  };
};
