import type { CheerioAPI } from "cheerio";

/**
 * Reference to a music album with optional disc and track numbers.
 * @see https://ogp.me/#type_music.song
 */
export interface MusicAlbumRef {
  /** URL to the album */
  url: string;
  /** Disc number (integer >= 1) */
  disc?: number;
  /** Track number (integer >= 1) */
  track?: number;
}

/**
 * Reference to a music song with optional disc and track numbers.
 * @see https://ogp.me/#type_music.album
 */
export interface MusicSongRef {
  /** URL to the song */
  url: string;
  /** Disc number (integer >= 1) */
  disc?: number;
  /** Track number (integer >= 1) */
  track?: number;
}

/**
 * OpenGraph Music metadata.
 * Supports music.song, music.album, music.playlist, and music.radio_station types.
 * @see https://ogp.me/#type_music
 */
export interface MusicData {
  /** Song duration in seconds (integer >= 1). For music.song type. */
  duration?: number;
  /** Album references with disc/track info. For music.song type. */
  albums?: MusicAlbumRef[];
  /** URLs to musician profiles. For music.song and music.album types. */
  musicians?: string[];
  /** Song references with disc/track info. For music.album and music.playlist types. */
  songs?: MusicSongRef[];
  /** URL to creator profile. For music.playlist and music.radio_station types. */
  creator?: string;
  /** ISO 8601 datetime for album release. For music.album type. */
  releaseDate?: string;
}

interface MusicTag {
  property: string;
  content: string;
}

interface MusicRef {
  url: string;
  disc?: number;
  track?: number;
}

const extractMusicTags = ($: CheerioAPI): MusicTag[] => {
  const tags: MusicTag[] = [];
  $('meta[property^="music:"], meta[name^="music:"]').each((_, el) => {
    const property =
      $(el).attr("property")?.trim() || $(el).attr("name")?.trim();
    const content = $(el).attr("content")?.trim();
    if (property && content) {
      tags.push({ content, property });
    }
  });
  return tags;
};

const getMusicContent = ($: CheerioAPI, name: string): string | undefined => {
  const content =
    $(`meta[property="music:${name}"]`).attr("content")?.trim() ||
    $(`meta[name="music:${name}"]`).attr("content")?.trim();
  return content || undefined;
};

const parsePositiveInt = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) || num < 1 ? undefined : num;
};

const getAllMusicContents = ($: CheerioAPI, name: string): string[] => {
  const values: string[] = [];
  const selectors = [
    `meta[property="music:${name}"]`,
    `meta[name="music:${name}"]`,
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const content = $(el).attr("content")?.trim();
      if (content && !values.includes(content)) {
        values.push(content);
      }
    });
  }

  return values;
};

const isUrlProperty = (property: string, prefix: string): boolean =>
  property === `music:${prefix}` || property === `music:${prefix}:url`;

const applyDiscOrTrack = (
  current: MusicRef,
  property: string,
  content: string,
  prefix: string
): void => {
  if (property === `music:${prefix}:disc`) {
    const disc = parsePositiveInt(content);
    if (disc !== undefined) {
      current.disc = disc;
    }
  } else if (property === `music:${prefix}:track`) {
    const track = parsePositiveInt(content);
    if (track !== undefined) {
      current.track = track;
    }
  }
};

const processRefTag = (
  tag: MusicTag,
  prefix: string,
  current: MusicRef | undefined,
  refs: MusicRef[]
): MusicRef | undefined => {
  const { property, content } = tag;

  if (isUrlProperty(property, prefix)) {
    if (current) {
      refs.push(current);
    }
    return { url: content };
  }

  if (current) {
    applyDiscOrTrack(current, property, content, prefix);
  }

  return current;
};

/**
 * Parse structured references (album or song) from music tags.
 * Handles structured properties where disc and track attach to the preceding URL.
 */
const parseRefs = <T extends MusicRef>(
  tags: MusicTag[],
  prefix: string
): T[] => {
  const refs: MusicRef[] = [];
  let current: MusicRef | undefined;

  for (const tag of tags) {
    current = processRefTag(tag, prefix, current, refs);
  }

  if (current) {
    refs.push(current);
  }

  return refs as T[];
};

/**
 * Parse OpenGraph music metadata.
 * Supports music.song, music.album, music.playlist, and music.radio_station types.
 * @see https://ogp.me/#type_music
 */
export const parseMusic = ($: CheerioAPI): MusicData => {
  const tags = extractMusicTags($);
  const duration = parsePositiveInt(getMusicContent($, "duration"));
  const albums = parseRefs<MusicAlbumRef>(tags, "album");
  const songs = parseRefs<MusicSongRef>(tags, "song");
  const musicians = getAllMusicContents($, "musician");
  const creator = getMusicContent($, "creator");
  const releaseDate = getMusicContent($, "release_date");

  return {
    albums: albums.length > 0 ? albums : undefined,
    creator,
    duration,
    musicians: musicians.length > 0 ? musicians : undefined,
    releaseDate,
    songs: songs.length > 0 ? songs : undefined,
  };
};
