import type { CheerioAPI } from "cheerio";

import { getMetaContentAny } from "./utils";

/**
 * OpenGraph Book metadata.
 * @see https://ogp.me/#type_book
 */
export interface BookData {
  /** Profile URLs of authors */
  authors?: string[];
  /** ISBN number */
  isbn?: string;
  /** ISO 8601 datetime when the book was released */
  releaseDate?: string;
  /** Tag words associated with this book */
  tags?: string[];
}

const getBookContent = ($: CheerioAPI, name: string): string | undefined =>
  getMetaContentAny($, `book:${name}`) ??
  getMetaContentAny($, `og:book:${name}`);

const getAllMetaContents = ($: CheerioAPI, name: string): string[] => {
  const values: string[] = [];
  const selectors = [
    `meta[property="book:${name}"]`,
    `meta[name="book:${name}"]`,
    `meta[property="og:book:${name}"]`,
    `meta[name="og:book:${name}"]`,
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

export const parseBook = ($: CheerioAPI): BookData => {
  const isbn = getBookContent($, "isbn");
  const releaseDate = getBookContent($, "release_date");

  const authors = getAllMetaContents($, "author");
  const tags = getAllMetaContents($, "tag");

  return {
    authors: authors.length > 0 ? authors : undefined,
    isbn,
    releaseDate,
    tags: tags.length > 0 ? tags : undefined,
  };
};
