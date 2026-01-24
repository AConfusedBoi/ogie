import type { CheerioAPI } from "cheerio";

import { getMetaContentAny } from "./utils";

/**
 * OpenGraph Article metadata.
 * @see https://ogp.me/#type_article
 */
export interface ArticleData {
  /** ISO 8601 datetime string when the article was first published (e.g., "2024-01-15T10:00:00Z") */
  publishedTime?: string;
  /** ISO 8601 datetime string when the article was last changed (e.g., "2024-01-15T10:00:00Z") */
  modifiedTime?: string;
  /** ISO 8601 datetime string when the article is out of date after (e.g., "2024-01-15T10:00:00Z") */
  expirationTime?: string;
  /** Writers of the article. Can be a single author URL/name or an array of authors. */
  author?: string | string[];
  /** A high-level section name (e.g., "Technology", "Sports") */
  section?: string;
  /** Tag words associated with this article */
  tags?: string[];
  /**
   * Non-standard extension. Not part of the official OpenGraph article spec,
   * but commonly used by publishers.
   */
  publisher?: string;
}

const getArticleContent = ($: CheerioAPI, name: string): string | undefined =>
  getMetaContentAny($, `article:${name}`) ??
  getMetaContentAny($, `og:article:${name}`);

const getAllMetaContents = ($: CheerioAPI, name: string): string[] => {
  const values: string[] = [];
  const selectors = [
    `meta[property="article:${name}"]`,
    `meta[name="article:${name}"]`,
    `meta[property="og:article:${name}"]`,
    `meta[name="og:article:${name}"]`,
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

const normalizeAuthors = (arr: string[]): string | string[] | undefined => {
  if (arr.length === 0) {
    return undefined;
  }
  return arr.length === 1 ? arr[0] : arr;
};

export const parseArticle = ($: CheerioAPI): ArticleData => {
  const publishedTime = getArticleContent($, "published_time");
  const modifiedTime = getArticleContent($, "modified_time");
  const expirationTime = getArticleContent($, "expiration_time");
  const section = getArticleContent($, "section");
  const publisher = getArticleContent($, "publisher");

  const authors = getAllMetaContents($, "author");
  const tags = getAllMetaContents($, "tag");

  const author = normalizeAuthors(authors);

  return {
    author,
    expirationTime,
    modifiedTime,
    publishedTime,
    publisher,
    section,
    tags: tags.length > 0 ? tags : undefined,
  };
};
