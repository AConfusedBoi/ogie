import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseVideo } from "../../src/parsers/video";

describe("parseVideo - basic metadata extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="video:duration" content="7200" />
      <meta property="video:release_date" content="2024-06-15T12:00:00Z" />
      <meta property="video:tag" content="Action" />
      <meta property="video:tag" content="Thriller" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts duration as number", () => {
    expect(result.duration).toBe(7200);
  });

  it("extracts release date", () => {
    expect(result.releaseDate).toBe("2024-06-15T12:00:00Z");
  });

  it("extracts multiple tags as array", () => {
    expect(result.tags).toEqual(["Action", "Thriller"]);
  });
});

describe("parseVideo - actors with roles", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="video:actor" content="https://example.com/actor/john" />
      <meta property="video:actor:role" content="John Smith" />
      <meta property="video:actor" content="https://example.com/actor/jane" />
      <meta property="video:actor:role" content="Jane Doe" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts actors with their roles", () => {
    expect(result.actors).toEqual([
      { role: "John Smith", url: "https://example.com/actor/john" },
      { role: "Jane Doe", url: "https://example.com/actor/jane" },
    ]);
  });
});

describe("parseVideo - actors without roles", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="video:actor" content="https://example.com/actor/john" />
      <meta property="video:actor" content="https://example.com/actor/jane" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts actors without roles", () => {
    expect(result.actors).toEqual([
      { url: "https://example.com/actor/john" },
      { url: "https://example.com/actor/jane" },
    ]);
  });
});

describe("parseVideo - multiple directors and writers", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="video:director" content="https://example.com/director/spielberg" />
      <meta property="video:director" content="https://example.com/director/nolan" />
      <meta property="video:writer" content="https://example.com/writer/alice" />
      <meta property="video:writer" content="https://example.com/writer/bob" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts multiple directors", () => {
    expect(result.directors).toEqual([
      "https://example.com/director/spielberg",
      "https://example.com/director/nolan",
    ]);
  });

  it("extracts multiple writers", () => {
    expect(result.writers).toEqual([
      "https://example.com/writer/alice",
      "https://example.com/writer/bob",
    ]);
  });
});

describe("parseVideo - duration parsing", () => {
  it("parses valid integer duration", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="video:duration" content="3600" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseVideo($);
    expect(result.duration).toBe(3600);
  });

  it("returns undefined for zero duration", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="video:duration" content="0" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseVideo($);
    expect(result.duration).toBeUndefined();
  });

  it("returns undefined for negative duration", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="video:duration" content="-100" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseVideo($);
    expect(result.duration).toBeUndefined();
  });

  it("returns undefined for non-numeric duration", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="video:duration" content="not-a-number" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseVideo($);
    expect(result.duration).toBeUndefined();
  });

  it("parses duration with decimal (truncates to integer)", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="video:duration" content="3600.5" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseVideo($);
    expect(result.duration).toBe(3600);
  });
});

describe("parseVideo - series for episodes", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:type" content="video.episode" />
      <meta property="video:series" content="https://example.com/series/breaking-bad" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts series URL", () => {
    expect(result.series).toBe("https://example.com/series/breaking-bad");
  });
});

describe("parseVideo - empty/missing fields", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>No video metadata</title>
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("returns undefined for missing actors", () => {
    expect(result.actors).toBeUndefined();
  });

  it("returns undefined for missing directors", () => {
    expect(result.directors).toBeUndefined();
  });

  it("returns undefined for missing writers", () => {
    expect(result.writers).toBeUndefined();
  });

  it("returns undefined for missing duration", () => {
    expect(result.duration).toBeUndefined();
  });

  it("returns undefined for missing release date", () => {
    expect(result.releaseDate).toBeUndefined();
  });

  it("returns undefined for missing tags", () => {
    expect(result.tags).toBeUndefined();
  });

  it("returns undefined for missing series", () => {
    expect(result.series).toBeUndefined();
  });
});

describe("parseVideo - og:video prefix support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:video:duration" content="5400" />
      <meta property="og:video:release_date" content="2024-01-01T00:00:00Z" />
      <meta property="og:video:tag" content="Drama" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts duration with og:video prefix", () => {
    expect(result.duration).toBe(5400);
  });

  it("extracts release date with og:video prefix", () => {
    expect(result.releaseDate).toBe("2024-01-01T00:00:00Z");
  });

  it("extracts tags with og:video prefix", () => {
    expect(result.tags).toEqual(["Drama"]);
  });
});

describe("parseVideo - mixed actors with and without roles", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="video:actor" content="https://example.com/actor/main" />
      <meta property="video:actor:role" content="Lead Role" />
      <meta property="video:actor" content="https://example.com/actor/supporting" />
      <meta property="video:actor" content="https://example.com/actor/cameo" />
      <meta property="video:actor:role" content="Cameo Appearance" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("correctly associates roles with their actors", () => {
    expect(result.actors).toEqual([
      { role: "Lead Role", url: "https://example.com/actor/main" },
      { url: "https://example.com/actor/supporting" },
      { role: "Cameo Appearance", url: "https://example.com/actor/cameo" },
    ]);
  });
});

describe("parseVideo - full video metadata", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:type" content="video.movie" />
      <meta property="video:actor" content="https://example.com/actor/keanu" />
      <meta property="video:actor:role" content="Neo" />
      <meta property="video:director" content="https://example.com/director/wachowski" />
      <meta property="video:writer" content="https://example.com/writer/wachowski" />
      <meta property="video:duration" content="8160" />
      <meta property="video:release_date" content="1999-03-31T00:00:00Z" />
      <meta property="video:tag" content="Sci-Fi" />
      <meta property="video:tag" content="Action" />
      <meta property="video:tag" content="Cyberpunk" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts all video metadata", () => {
    expect(result).toEqual({
      actors: [{ role: "Neo", url: "https://example.com/actor/keanu" }],
      directors: ["https://example.com/director/wachowski"],
      duration: 8160,
      releaseDate: "1999-03-31T00:00:00Z",
      series: undefined,
      tags: ["Sci-Fi", "Action", "Cyberpunk"],
      writers: ["https://example.com/writer/wachowski"],
    });
  });
});

describe("parseVideo - name attribute support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="video:duration" content="1800" />
      <meta name="video:release_date" content="2024-12-25T00:00:00Z" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseVideo($);

  it("extracts metadata using name attribute", () => {
    expect(result.duration).toBe(1800);
    expect(result.releaseDate).toBe("2024-12-25T00:00:00Z");
  });
});
