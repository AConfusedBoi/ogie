import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { hasFeeds, parseFeeds } from "../../src/parsers/feeds";

describe("parseFeeds - RSS feed extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="RSS Feed" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("extracts RSS feed URL", () => {
    expect(result.feeds[0].url).toBe("https://example.com/feed.xml");
  });

  it("extracts RSS feed type", () => {
    expect(result.feeds[0].type).toBe("rss");
  });

  it("extracts RSS feed title", () => {
    expect(result.feeds[0].title).toBe("RSS Feed");
  });
});

describe("parseFeeds - Atom feed extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Atom Feed" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("extracts Atom feed URL", () => {
    expect(result.feeds[0].url).toBe("https://example.com/atom.xml");
  });

  it("extracts Atom feed type", () => {
    expect(result.feeds[0].type).toBe("atom");
  });

  it("extracts Atom feed title", () => {
    expect(result.feeds[0].title).toBe("Atom Feed");
  });
});

describe("parseFeeds - JSON Feed extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="application/feed+json" href="/feed.json" title="JSON Feed" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("extracts JSON feed URL", () => {
    expect(result.feeds[0].url).toBe("https://example.com/feed.json");
  });

  it("extracts JSON feed type", () => {
    expect(result.feeds[0].type).toBe("json");
  });

  it("extracts JSON feed title", () => {
    expect(result.feeds[0].title).toBe("JSON Feed");
  });
});

describe("parseFeeds - multiple feeds", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="application/rss+xml" href="/rss.xml" title="RSS" />
      <link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Atom" />
      <link rel="alternate" type="application/feed+json" href="/feed.json" title="JSON" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("extracts all feeds", () => {
    expect(result.feeds).toHaveLength(3);
  });

  it("preserves order of feeds", () => {
    expect(result.feeds[0].type).toBe("rss");
    expect(result.feeds[1].type).toBe("atom");
    expect(result.feeds[2].type).toBe("json");
  });

  it("extracts complete feed data", () => {
    expect(result.feeds).toEqual([
      { title: "RSS", type: "rss", url: "https://example.com/rss.xml" },
      { title: "Atom", type: "atom", url: "https://example.com/atom.xml" },
      { title: "JSON", type: "json", url: "https://example.com/feed.json" },
    ]);
  });
});

describe("parseFeeds - MIME type variations", () => {
  it("handles application/x-rss+xml", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/x-rss+xml" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].type).toBe("rss");
  });

  it("handles text/rss+xml", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="text/rss+xml" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].type).toBe("rss");
  });

  it("handles application/x-atom+xml", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/x-atom+xml" href="/atom.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].type).toBe("atom");
  });

  it("handles text/atom+xml", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="text/atom+xml" href="/atom.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].type).toBe("atom");
  });

  it("handles case-insensitive MIME types", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="APPLICATION/RSS+XML" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].type).toBe("rss");
  });
});

describe("parseFeeds - URL resolution", () => {
  it("resolves relative URLs", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="/blog/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com/page");
    expect(result.feeds[0].url).toBe("https://example.com/blog/feed.xml");
  });

  it("resolves protocol-relative URLs", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="//cdn.example.com/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].url).toBe("https://cdn.example.com/feed.xml");
  });

  it("keeps absolute URLs unchanged", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="https://feeds.example.com/rss.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].url).toBe("https://feeds.example.com/rss.xml");
  });

  it("handles missing base URL", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($);
    expect(result.feeds[0].url).toBe("https://example.com/feed.xml");
  });
});

describe("parseFeeds - deduplication", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="First" />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="Duplicate" />
      <link rel="alternate" type="application/atom+xml" href="/feed.xml" title="Same URL Different Type" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("deduplicates feeds by URL", () => {
    expect(result.feeds).toHaveLength(1);
  });

  it("keeps first occurrence", () => {
    expect(result.feeds[0].title).toBe("First");
    expect(result.feeds[0].type).toBe("rss");
  });
});

describe("parseFeeds - missing or invalid attributes", () => {
  it("ignores links without href", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" title="No href" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(0);
  });

  it("ignores links without type", () => {
    const html = `
      <html><head>
        <link rel="alternate" href="/feed.xml" title="No type" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(0);
  });

  it("ignores links with empty href", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(0);
  });

  it("ignores links with empty type", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(0);
  });

  it("ignores links with unrecognized type", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="text/html" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(0);
  });
});

describe("parseFeeds - non-feed alternate links", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" hreflang="es" href="/es/" />
      <link rel="alternate" hreflang="fr" href="/fr/" type="text/html" />
      <link rel="alternate" media="print" href="/print.css" type="text/css" />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("ignores hreflang alternate links", () => {
    expect(result.feeds).toHaveLength(1);
  });

  it("only extracts feed links", () => {
    expect(result.feeds[0].url).toBe("https://example.com/feed.xml");
  });
});

describe("parseFeeds - optional title", () => {
  it("includes title when present", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="My Feed" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0].title).toBe("My Feed");
  });

  it("omits title property when not present", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds[0]).toEqual({
      type: "rss",
      url: "https://example.com/feed.xml",
    });
    expect("title" in result.feeds[0]).toBe(false);
  });

  it("omits title property when empty string", () => {
    const html = `
      <html><head>
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="" />
      </head></html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect("title" in result.feeds[0]).toBe(false);
  });
});

describe("parseFeeds - whitespace handling", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <link rel="alternate" type="  application/rss+xml  " href="  /feed.xml  " title="  My Feed  " />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseFeeds($, "https://example.com");

  it("trims whitespace from type", () => {
    expect(result.feeds[0].type).toBe("rss");
  });

  it("trims whitespace from href", () => {
    expect(result.feeds[0].url).toBe("https://example.com/feed.xml");
  });

  it("trims whitespace from title", () => {
    expect(result.feeds[0].title).toBe("My Feed");
  });
});

describe("parseFeeds - empty document", () => {
  it("returns empty feeds array for empty head", () => {
    const html = `
      <!doctype html>
      <html>
      <head></head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result).toEqual({ feeds: [] });
  });

  it("returns empty feeds array for no alternate links", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <link rel="stylesheet" href="/style.css" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result).toEqual({ feeds: [] });
  });
});

describe("hasFeeds helper", () => {
  it("returns true when feeds exist", () => {
    const data = {
      feeds: [{ type: "rss" as const, url: "https://example.com/feed.xml" }],
    };
    expect(hasFeeds(data)).toBe(true);
  });

  it("returns false when feeds array is empty", () => {
    const data = { feeds: [] };
    expect(hasFeeds(data)).toBe(false);
  });

  it("returns true for multiple feeds", () => {
    const data = {
      feeds: [
        { type: "rss" as const, url: "https://example.com/rss.xml" },
        { type: "atom" as const, url: "https://example.com/atom.xml" },
      ],
    };
    expect(hasFeeds(data)).toBe(true);
  });
});

describe("parseFeeds - real-world scenarios", () => {
  it("handles WordPress feed pattern", () => {
    const html = `
      <html>
      <head>
        <link rel="alternate" type="application/rss+xml" title="My Blog » Feed" href="https://myblog.com/feed/" />
        <link rel="alternate" type="application/rss+xml" title="My Blog » Comments Feed" href="https://myblog.com/comments/feed/" />
      </head>
      </html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://myblog.com");
    expect(result.feeds).toHaveLength(2);
    expect(result.feeds[0].title).toBe("My Blog » Feed");
    expect(result.feeds[1].title).toBe("My Blog » Comments Feed");
  });

  it("handles GitHub repository feed", () => {
    const html = `
      <html>
      <head>
        <link rel="alternate" type="application/atom+xml" title="Recent Commits to repo:main" href="/owner/repo/commits/main.atom" />
      </head>
      </html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://github.com");
    expect(result.feeds[0]).toEqual({
      title: "Recent Commits to repo:main",
      type: "atom",
      url: "https://github.com/owner/repo/commits/main.atom",
    });
  });

  it("handles multiple feed formats for same content", () => {
    const html = `
      <html>
      <head>
        <link rel="alternate" type="application/rss+xml" title="RSS 2.0" href="/feed/rss" />
        <link rel="alternate" type="application/atom+xml" title="Atom 1.0" href="/feed/atom" />
        <link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed/json" />
      </head>
      </html>
    `;
    const $ = load(html);
    const result = parseFeeds($, "https://example.com");
    expect(result.feeds).toHaveLength(3);
    expect(result.feeds.map((f) => f.type)).toEqual(["rss", "atom", "json"]);
  });
});
