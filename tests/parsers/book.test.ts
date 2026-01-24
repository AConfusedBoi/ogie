import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseBook } from "../../src/parsers/book";

describe("parseBook - basic metadata extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:isbn" content="978-3-16-148410-0" />
      <meta property="book:release_date" content="2024-01-15" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts ISBN", () => {
    expect(result.isbn).toBe("978-3-16-148410-0");
  });

  it("extracts release date", () => {
    expect(result.releaseDate).toBe("2024-01-15");
  });
});

describe("parseBook - multiple authors", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:author" content="https://example.com/author/alice" />
      <meta property="book:author" content="https://example.com/author/bob" />
      <meta property="book:author" content="https://example.com/author/charlie" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts multiple authors as array", () => {
    expect(result.authors).toEqual([
      "https://example.com/author/alice",
      "https://example.com/author/bob",
      "https://example.com/author/charlie",
    ]);
  });
});

describe("parseBook - multiple tags", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:tag" content="Fiction" />
      <meta property="book:tag" content="Science Fiction" />
      <meta property="book:tag" content="Dystopian" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts multiple tags as array", () => {
    expect(result.tags).toEqual(["Fiction", "Science Fiction", "Dystopian"]);
  });
});

describe("parseBook - complete metadata", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:author" content="https://example.com/author/jane" />
      <meta property="book:isbn" content="978-0-06-112008-4" />
      <meta property="book:release_date" content="1960-07-11" />
      <meta property="book:tag" content="Classic" />
      <meta property="book:tag" content="Literature" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts all metadata fields", () => {
    expect(result).toEqual({
      authors: ["https://example.com/author/jane"],
      isbn: "978-0-06-112008-4",
      releaseDate: "1960-07-11",
      tags: ["Classic", "Literature"],
    });
  });
});

describe("parseBook - og:book prefix support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:book:isbn" content="978-1-234-56789-0" />
      <meta property="og:book:release_date" content="2023-05-20" />
      <meta property="og:book:author" content="https://example.com/author/john" />
      <meta property="og:book:tag" content="Mystery" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts ISBN with og:book prefix", () => {
    expect(result.isbn).toBe("978-1-234-56789-0");
  });

  it("extracts release date with og:book prefix", () => {
    expect(result.releaseDate).toBe("2023-05-20");
  });

  it("extracts authors with og:book prefix", () => {
    expect(result.authors).toEqual(["https://example.com/author/john"]);
  });

  it("extracts tags with og:book prefix", () => {
    expect(result.tags).toEqual(["Mystery"]);
  });
});

describe("parseBook - name attribute support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="book:isbn" content="978-9-87-654321-0" />
      <meta name="book:author" content="https://example.com/author/mary" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("extracts ISBN from name attribute", () => {
    expect(result.isbn).toBe("978-9-87-654321-0");
  });

  it("extracts authors from name attribute", () => {
    expect(result.authors).toEqual(["https://example.com/author/mary"]);
  });
});

describe("parseBook - empty or missing fields", () => {
  it("returns undefined for missing ISBN", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:release_date" content="2024-01-01" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);
    expect(result.isbn).toBeUndefined();
  });

  it("returns undefined for missing release date", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:isbn" content="978-0-00-000000-0" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);
    expect(result.releaseDate).toBeUndefined();
  });

  it("returns undefined for missing authors", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:isbn" content="978-0-00-000000-0" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);
    expect(result.authors).toBeUndefined();
  });

  it("returns undefined for missing tags", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="book:isbn" content="978-0-00-000000-0" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);
    expect(result.tags).toBeUndefined();
  });

  it("returns all undefined for empty head", () => {
    const html = `
      <!doctype html>
      <html>
      <head></head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseBook($);
    expect(result).toEqual({
      authors: undefined,
      isbn: undefined,
      releaseDate: undefined,
      tags: undefined,
    });
  });
});

describe("parseBook - deduplication", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:author" content="https://example.com/author/jane" />
      <meta property="book:author" content="https://example.com/author/jane" />
      <meta property="book:tag" content="Fiction" />
      <meta property="book:tag" content="Fiction" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("deduplicates authors", () => {
    expect(result.authors).toEqual(["https://example.com/author/jane"]);
  });

  it("deduplicates tags", () => {
    expect(result.tags).toEqual(["Fiction"]);
  });
});

describe("parseBook - whitespace handling", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="book:isbn" content="  978-0-00-000000-0  " />
      <meta property="book:author" content="  https://example.com/author/jane  " />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseBook($);

  it("trims whitespace from ISBN", () => {
    expect(result.isbn).toBe("978-0-00-000000-0");
  });

  it("trims whitespace from authors", () => {
    expect(result.authors).toEqual(["https://example.com/author/jane"]);
  });
});
