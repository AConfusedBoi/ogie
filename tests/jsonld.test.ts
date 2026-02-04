import { describe, expect, it } from "bun:test";

import {
  extractFromHtml,
  type ExtractSuccess,
  type JsonLdOrganization,
  type JsonLdPerson,
} from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - JSON-LD basic extraction", () => {
  const result = extractFromHtml(fixtures.jsonLd, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts JSON-LD items", () => {
    expect(result.data.jsonLd).toBeDefined();
    expect(result.data.jsonLd?.items).toHaveLength(1);
  });

  it("extracts type", () => {
    expect(result.data.jsonLd?.items[0].type).toBe("Article");
  });

  it("extracts name", () => {
    expect(result.data.jsonLd?.items[0].name).toBe("Test Article");
  });
});

describe("extractFromHtml - JSON-LD content fields", () => {
  const result = extractFromHtml(fixtures.jsonLd, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts description", () => {
    expect(result.data.jsonLd?.items[0].description).toBe(
      "This is a test article description"
    );
  });

  it("extracts url", () => {
    expect(result.data.jsonLd?.items[0].url).toBe(
      "https://example.com/article"
    );
  });

  it("extracts datePublished", () => {
    expect(result.data.jsonLd?.items[0].datePublished).toBe("2024-01-15");
  });

  it("extracts dateModified", () => {
    expect(result.data.jsonLd?.items[0].dateModified).toBe("2024-01-20");
  });

  it("extracts image", () => {
    expect(result.data.jsonLd?.items[0].image).toBe(
      "https://example.com/image.jpg"
    );
  });
});

describe("extractFromHtml - JSON-LD author extraction", () => {
  const result = extractFromHtml(fixtures.jsonLd, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts author", () => {
    const author = result.data.jsonLd?.items[0].author as
      | JsonLdPerson
      | undefined;
    expect(author).toBeDefined();
    expect(author?.type).toBe("Person");
    expect(author?.name).toBe("John Doe");
    expect(author?.url).toBe("https://example.com/john");
  });
});

describe("extractFromHtml - JSON-LD publisher extraction", () => {
  const result = extractFromHtml(fixtures.jsonLd, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts publisher", () => {
    const publisher = result.data.jsonLd?.items[0].publisher;
    expect(publisher).toBeDefined();
    expect(publisher?.type).toBe("Organization");
    expect(publisher?.name).toBe("Example Publisher");
    expect(publisher?.url).toBe("https://example.com");
    expect((publisher as JsonLdOrganization)?.logo).toBe(
      "https://example.com/logo.png"
    );
  });

  it("stores raw JSON-LD", () => {
    expect(result.data.jsonLd?.raw).toHaveLength(1);
  });
});

describe("extractFromHtml - JSON-LD with @graph", () => {
  const htmlWithGraph = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "name": "My Website", "url": "https://example.com" },
          { "@type": "Article", "name": "Article Title" }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithGraph, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts items from @graph", () => {
    expect(result.data.jsonLd?.items).toHaveLength(2);
  });

  it("extracts first graph item", () => {
    expect(result.data.jsonLd?.items[0].type).toBe("WebSite");
    expect(result.data.jsonLd?.items[0].name).toBe("My Website");
  });

  it("extracts second graph item", () => {
    expect(result.data.jsonLd?.items[1].type).toBe("Article");
    expect(result.data.jsonLd?.items[1].name).toBe("Article Title");
  });
});

describe("extractFromHtml - JSON-LD with multiple scripts", () => {
  const htmlWithMultiple = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      { "@type": "Organization", "name": "Org 1" }
      </script>
      <script type="application/ld+json">
      { "@type": "Person", "name": "Person 1" }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultiple, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts items from multiple scripts", () => {
    expect(result.data.jsonLd?.items).toHaveLength(2);
  });

  it("stores all raw JSON-LD objects", () => {
    expect(result.data.jsonLd?.raw).toHaveLength(2);
  });
});

describe("extractFromHtml - JSON-LD with invalid JSON", () => {
  const htmlWithInvalid = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      { invalid json }
      </script>
      <script type="application/ld+json">
      { "@type": "Article", "name": "Valid Article" }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithInvalid, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("skips invalid JSON and extracts valid", () => {
    expect(result.data.jsonLd?.items).toHaveLength(1);
    expect(result.data.jsonLd?.items[0].name).toBe("Valid Article");
  });
});

describe("extractFromHtml - no JSON-LD", () => {
  const htmlWithoutJsonLd = `
    <!doctype html>
    <html>
    <head><title>No JSON-LD</title></head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithoutJsonLd, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined when no JSON-LD present", () => {
    expect(result.data.jsonLd).toBeUndefined();
  });
});

describe("extractFromHtml - JSON-LD with multiple authors", () => {
  const htmlWithMultipleAuthors = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@type": "Article",
        "name": "Collaborative Article",
        "author": [
          { "@type": "Person", "name": "Author One" },
          { "@type": "Person", "name": "Author Two" }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultipleAuthors, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts multiple authors", () => {
    const authors = result.data.jsonLd?.items[0].author as JsonLdPerson[];
    expect(Array.isArray(authors)).toBe(true);
    expect(authors).toHaveLength(2);
    expect(authors[0].name).toBe("Author One");
    expect(authors[1].name).toBe("Author Two");
  });
});

describe("extractFromHtml - JSON-LD with string author", () => {
  const htmlWithStringAuthor = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@type": "Article",
        "name": "Simple Article",
        "author": "Jane Smith"
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithStringAuthor, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("normalizes string author to Person", () => {
    const author = result.data.jsonLd?.items[0].author as
      | JsonLdPerson
      | undefined;
    expect(author?.type).toBe("Person");
    expect(author?.name).toBe("Jane Smith");
  });
});

describe("extractFromHtml - JSON-LD with image array", () => {
  const htmlWithImageArray = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@type": "Article",
        "name": "Article with Images",
        "image": [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg"
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithImageArray, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts image array", () => {
    const images = result.data.jsonLd?.items[0].image as string[];
    expect(Array.isArray(images)).toBe(true);
    expect(images).toHaveLength(2);
    expect(images[0]).toBe("https://example.com/image1.jpg");
    expect(images[1]).toBe("https://example.com/image2.jpg");
  });
});

describe("extractFromHtml - JSON-LD @id reference resolution for author", () => {
  const htmlWithAuthorRef = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@id": "#author", "@type": "Person", "name": "Jane Doe", "url": "https://example.com/jane" },
          { "@type": "Article", "headline": "Test Article", "author": { "@id": "#author" } }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithAuthorRef, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("resolves author @id reference", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    const author = article?.author as JsonLdPerson | undefined;
    expect(author).toBeDefined();
    expect(author?.type).toBe("Person");
    expect(author?.name).toBe("Jane Doe");
    expect(author?.url).toBe("https://example.com/jane");
  });
});

describe("extractFromHtml - JSON-LD @id reference resolution for publisher", () => {
  const htmlWithPublisherRef = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@id": "#org", "@type": "Organization", "name": "Example Corp", "url": "https://example.com", "logo": "https://example.com/logo.png" },
          { "@type": "Article", "headline": "Test Article", "publisher": { "@id": "#org" } }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithPublisherRef, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("resolves publisher @id reference", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    const publisher = article?.publisher as JsonLdOrganization | undefined;
    expect(publisher).toBeDefined();
    expect(publisher?.type).toBe("Organization");
    expect(publisher?.name).toBe("Example Corp");
    expect(publisher?.url).toBe("https://example.com");
    expect(publisher?.logo).toBe("https://example.com/logo.png");
  });
});

describe("extractFromHtml - JSON-LD with multiple @id references", () => {
  const htmlWithMultipleRefs = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@id": "#author1", "@type": "Person", "name": "Author One" },
          { "@id": "#author2", "@type": "Person", "name": "Author Two" },
          { "@id": "#publisher", "@type": "Organization", "name": "Publisher Org" },
          { "@type": "Article", "headline": "Multi-Author Article", "author": [{ "@id": "#author1" }, { "@id": "#author2" }], "publisher": { "@id": "#publisher" } }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultipleRefs, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("resolves multiple author @id references", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    const authors = article?.author as JsonLdPerson[];
    expect(Array.isArray(authors)).toBe(true);
    expect(authors).toHaveLength(2);
    expect(authors[0].name).toBe("Author One");
    expect(authors[1].name).toBe("Author Two");
  });

  it("resolves publisher @id reference alongside author references", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    const publisher = article?.publisher as JsonLdOrganization | undefined;
    expect(publisher?.name).toBe("Publisher Org");
  });
});

describe("extractFromHtml - JSON-LD with unresolved @id reference", () => {
  const htmlWithUnresolvedRef = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", "headline": "Test Article", "author": { "@id": "#nonexistent" } }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithUnresolvedRef, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined for unresolved author reference", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    // Author should be undefined since the reference cannot be resolved
    // and the remaining object has no name
    expect(article?.author).toBeUndefined();
  });
});

describe("extractFromHtml - JSON-LD with full URL @id reference", () => {
  const htmlWithFullUrlRef = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@id": "https://example.com/#author", "@type": "Person", "name": "Full URL Author" },
          { "@type": "Article", "headline": "Test Article", "author": { "@id": "https://example.com/#author" } }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithFullUrlRef, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("resolves full URL @id reference", () => {
    const article = result.data.jsonLd?.items.find(
      (item) => item.type === "Article"
    );
    const author = article?.author as JsonLdPerson | undefined;
    expect(author).toBeDefined();
    expect(author?.name).toBe("Full URL Author");
  });
});

describe("extractFromHtml - JSON-LD with nested @graph containing references", () => {
  const htmlWithNestedGraph = `
    <!doctype html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#website",
            "@type": "WebSite",
            "name": "My Website"
          },
          {
            "@id": "#person",
            "@type": "Person",
            "name": "Website Author",
            "url": "https://example.com/author"
          },
          {
            "@type": "BlogPosting",
            "headline": "Blog Post Title",
            "author": { "@id": "#person" }
          }
        ]
      }
      </script>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithNestedGraph, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("resolves references in nested @graph", () => {
    const blogPost = result.data.jsonLd?.items.find(
      (item) => item.type === "BlogPosting"
    );
    const author = blogPost?.author as JsonLdPerson | undefined;
    expect(author).toBeDefined();
    expect(author?.name).toBe("Website Author");
    expect(author?.url).toBe("https://example.com/author");
  });

  it("extracts all items from nested @graph", () => {
    expect(result.data.jsonLd?.items).toHaveLength(3);
  });
});
