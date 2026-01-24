import { describe, expect, it } from "bun:test";

import { extractFromHtml, type ExtractSuccess } from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - Dublin Core", () => {
  const result = extractFromHtml(fixtures.dublinCore, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts DC.title", () => {
    expect(result.data.dublinCore?.title).toBe("Dublin Core Test");
  });

  it("extracts DC.creator", () => {
    expect(result.data.dublinCore?.creator).toBe("Jane Doe");
  });

  it("extracts DC.subject", () => {
    expect(result.data.dublinCore?.subject).toBe("Testing");
  });

  it("extracts DCTERMS.created as date", () => {
    expect(result.data.dublinCore?.date).toBe("2024-01-01");
  });

  it("extracts DC.relation from link tag", () => {
    expect(result.data.dublinCore?.relation).toBe(
      "https://example.com/related"
    );
  });
});

describe("extractFromHtml - Dublin Core multi-value fields", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="DC.creator" content="Author One" />
      <meta name="DC.creator" content="Author Two" />
      <meta name="DC.subject" content="Topic A" />
      <meta name="DC.subject" content="Topic B" />
      <meta name="DC.subject" content="Topic C" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns array for multiple creators", () => {
    expect(result.data.dublinCore?.creator).toEqual([
      "Author One",
      "Author Two",
    ]);
  });

  it("returns array for multiple subjects", () => {
    expect(result.data.dublinCore?.subject).toEqual([
      "Topic A",
      "Topic B",
      "Topic C",
    ]);
  });
});

describe("extractFromHtml - Dublin Core case insensitivity", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="dc.title" content="Lowercase Prefix" />
      <meta name="DC.DESCRIPTION" content="Uppercase Field" />
      <meta name="Dc.Publisher" content="Mixed Case" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts dc.title (lowercase prefix)", () => {
    expect(result.data.dublinCore?.title).toBe("Lowercase Prefix");
  });

  it("extracts DC.DESCRIPTION (uppercase field)", () => {
    expect(result.data.dublinCore?.description).toBe("Uppercase Field");
  });

  it("extracts Dc.Publisher (mixed case)", () => {
    expect(result.data.dublinCore?.publisher).toBe("Mixed Case");
  });
});

describe("extractFromHtml - Dublin Core empty data", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>No Dublin Core</title>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined for dublinCore when no DC tags present", () => {
    expect(result.data.dublinCore).toBeUndefined();
  });
});

describe("extractFromHtml - Dublin Core all fields", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="DC.title" content="Full DC Test" />
      <meta name="DC.creator" content="Test Author" />
      <meta name="DC.subject" content="Test Subject" />
      <meta name="DC.description" content="Test Description" />
      <meta name="DC.publisher" content="Test Publisher" />
      <meta name="DC.contributor" content="Test Contributor" />
      <meta name="DC.date" content="2024-06-15" />
      <meta name="DC.type" content="Text" />
      <meta name="DC.format" content="text/html" />
      <meta name="DC.identifier" content="urn:isbn:123456789" />
      <meta name="DC.source" content="Original Source" />
      <meta name="DC.language" content="en" />
      <meta name="DC.relation" content="Related Resource" />
      <meta name="DC.coverage" content="Global" />
      <meta name="DC.rights" content="CC BY 4.0" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  describe("core fields", () => {
    it("extracts title", () => {
      expect(result.data.dublinCore?.title).toBe("Full DC Test");
    });

    it("extracts creator", () => {
      expect(result.data.dublinCore?.creator).toBe("Test Author");
    });

    it("extracts subject", () => {
      expect(result.data.dublinCore?.subject).toBe("Test Subject");
    });

    it("extracts description", () => {
      expect(result.data.dublinCore?.description).toBe("Test Description");
    });

    it("extracts publisher", () => {
      expect(result.data.dublinCore?.publisher).toBe("Test Publisher");
    });
  });

  describe("additional fields", () => {
    it("extracts contributor", () => {
      expect(result.data.dublinCore?.contributor).toBe("Test Contributor");
    });

    it("extracts date", () => {
      expect(result.data.dublinCore?.date).toBe("2024-06-15");
    });

    it("extracts type", () => {
      expect(result.data.dublinCore?.type).toBe("Text");
    });

    it("extracts format", () => {
      expect(result.data.dublinCore?.format).toBe("text/html");
    });

    it("extracts identifier", () => {
      expect(result.data.dublinCore?.identifier).toBe("urn:isbn:123456789");
    });
  });

  describe("optional fields", () => {
    it("extracts source", () => {
      expect(result.data.dublinCore?.source).toBe("Original Source");
    });

    it("extracts language", () => {
      expect(result.data.dublinCore?.language).toBe("en");
    });

    it("extracts relation", () => {
      expect(result.data.dublinCore?.relation).toBe("Related Resource");
    });

    it("extracts coverage", () => {
      expect(result.data.dublinCore?.coverage).toBe("Global");
    });

    it("extracts rights", () => {
      expect(result.data.dublinCore?.rights).toBe("CC BY 4.0");
    });
  });
});
