import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseBook } from "../src/parsers/book";

describe("parseBook", () => {
  describe("with all fields", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="book" />
        <meta property="book:author" content="https://example.com/author/john" />
        <meta property="book:isbn" content="978-3-16-148410-0" />
        <meta property="book:release_date" content="2024-06-15T00:00:00Z" />
        <meta property="book:tag" content="fiction" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("extracts author", () => {
      expect(result.authors).toEqual(["https://example.com/author/john"]);
    });

    it("extracts isbn", () => {
      expect(result.isbn).toBe("978-3-16-148410-0");
    });

    it("extracts release_date", () => {
      expect(result.releaseDate).toBe("2024-06-15T00:00:00Z");
    });

    it("extracts tags", () => {
      expect(result.tags).toEqual(["fiction"]);
    });
  });

  describe("with multiple authors", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="book" />
        <meta property="book:author" content="https://example.com/author/john" />
        <meta property="book:author" content="https://example.com/author/jane" />
        <meta property="book:author" content="https://example.com/author/bob" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("extracts multiple authors as array", () => {
      expect(result.authors).toEqual([
        "https://example.com/author/john",
        "https://example.com/author/jane",
        "https://example.com/author/bob",
      ]);
    });
  });

  describe("with multiple tags", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="book" />
        <meta property="book:tag" content="fiction" />
        <meta property="book:tag" content="thriller" />
        <meta property="book:tag" content="mystery" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("extracts multiple tags as array", () => {
      expect(result.tags).toEqual(["fiction", "thriller", "mystery"]);
    });
  });

  describe("with og:book prefix", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="book" />
        <meta property="og:book:author" content="https://example.com/author/alice" />
        <meta property="og:book:isbn" content="978-0-12-345678-9" />
        <meta property="og:book:release_date" content="2023-01-01T12:00:00Z" />
        <meta property="og:book:tag" content="non-fiction" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("extracts author with og:book prefix", () => {
      expect(result.authors).toEqual(["https://example.com/author/alice"]);
    });

    it("extracts isbn with og:book prefix", () => {
      expect(result.isbn).toBe("978-0-12-345678-9");
    });

    it("extracts release_date with og:book prefix", () => {
      expect(result.releaseDate).toBe("2023-01-01T12:00:00Z");
    });

    it("extracts tags with og:book prefix", () => {
      expect(result.tags).toEqual(["non-fiction"]);
    });
  });

  describe("isbn extraction", () => {
    it("extracts ISBN-13 format", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="book:isbn" content="978-3-16-148410-0" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseBook($);
      expect(result.isbn).toBe("978-3-16-148410-0");
    });

    it("extracts ISBN-10 format", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="book:isbn" content="0-306-40615-2" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseBook($);
      expect(result.isbn).toBe("0-306-40615-2");
    });

    it("extracts ISBN without dashes", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="book:isbn" content="9783161484100" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseBook($);
      expect(result.isbn).toBe("9783161484100");
    });
  });

  describe("with missing/empty fields", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <title>No book metadata</title>
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("returns undefined for authors when not present", () => {
      expect(result.authors).toBeUndefined();
    });

    it("returns undefined for isbn when not present", () => {
      expect(result.isbn).toBeUndefined();
    });

    it("returns undefined for releaseDate when not present", () => {
      expect(result.releaseDate).toBeUndefined();
    });

    it("returns undefined for tags when not present", () => {
      expect(result.tags).toBeUndefined();
    });
  });

  describe("with empty content values", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:isbn" content="" />
        <meta property="book:author" content="   " />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("ignores empty isbn", () => {
      expect(result.isbn).toBeUndefined();
    });

    it("ignores whitespace-only author", () => {
      expect(result.authors).toBeUndefined();
    });
  });

  describe("with name attribute instead of property", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta name="book:isbn" content="978-1-23-456789-0" />
        <meta name="book:author" content="https://example.com/author/sam" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("extracts isbn from name attribute", () => {
      expect(result.isbn).toBe("978-1-23-456789-0");
    });

    it("extracts author from name attribute", () => {
      expect(result.authors).toEqual(["https://example.com/author/sam"]);
    });
  });

  describe("deduplication", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:author" content="https://example.com/author/john" />
        <meta name="book:author" content="https://example.com/author/john" />
        <meta property="book:tag" content="fiction" />
        <meta name="book:tag" content="fiction" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);

    it("deduplicates authors", () => {
      expect(result.authors).toEqual(["https://example.com/author/john"]);
    });

    it("deduplicates tags", () => {
      expect(result.tags).toEqual(["fiction"]);
    });
  });
});
