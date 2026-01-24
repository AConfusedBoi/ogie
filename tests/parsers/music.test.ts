import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseMusic } from "../../src/parsers/music";

describe("parseMusic", () => {
  describe("music.song type", () => {
    it("parses duration", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.song" />
          <meta property="music:duration" content="215" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBe(215);
    });

    it("ignores invalid duration (zero)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:duration" content="0" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBeUndefined();
    });

    it("ignores invalid duration (negative)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:duration" content="-10" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBeUndefined();
    });

    it("ignores invalid duration (non-numeric)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:duration" content="three minutes" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBeUndefined();
    });

    it("parses album reference with disc and track", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.song" />
          <meta property="music:album" content="https://example.com/album/1" />
          <meta property="music:album:disc" content="1" />
          <meta property="music:album:track" content="5" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.albums).toEqual([
        {
          disc: 1,
          track: 5,
          url: "https://example.com/album/1",
        },
      ]);
    });

    it("parses multiple album references", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.song" />
          <meta property="music:album" content="https://example.com/album/1" />
          <meta property="music:album:track" content="3" />
          <meta property="music:album" content="https://example.com/album/2" />
          <meta property="music:album:track" content="7" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.albums).toEqual([
        {
          track: 3,
          url: "https://example.com/album/1",
        },
        {
          track: 7,
          url: "https://example.com/album/2",
        },
      ]);
    });

    it("parses album with url suffix", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:album:url" content="https://example.com/album/1" />
          <meta property="music:album:disc" content="2" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.albums).toEqual([
        {
          disc: 2,
          url: "https://example.com/album/1",
        },
      ]);
    });

    it("parses multiple musicians", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.song" />
          <meta property="music:musician" content="https://example.com/artist/john" />
          <meta property="music:musician" content="https://example.com/artist/jane" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.musicians).toEqual([
        "https://example.com/artist/john",
        "https://example.com/artist/jane",
      ]);
    });

    it("parses complete song metadata", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.song" />
          <meta property="og:title" content="Bohemian Rhapsody" />
          <meta property="music:duration" content="355" />
          <meta property="music:album" content="https://example.com/album/night-at-opera" />
          <meta property="music:album:disc" content="1" />
          <meta property="music:album:track" content="11" />
          <meta property="music:musician" content="https://example.com/artist/queen" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBe(355);
      expect(result.albums).toEqual([
        {
          disc: 1,
          track: 11,
          url: "https://example.com/album/night-at-opera",
        },
      ]);
      expect(result.musicians).toEqual(["https://example.com/artist/queen"]);
    });
  });

  describe("music.album type", () => {
    it("parses songs with disc and track numbers", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.album" />
          <meta property="music:song" content="https://example.com/song/1" />
          <meta property="music:song:disc" content="1" />
          <meta property="music:song:track" content="1" />
          <meta property="music:song" content="https://example.com/song/2" />
          <meta property="music:song:disc" content="1" />
          <meta property="music:song:track" content="2" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([
        {
          disc: 1,
          track: 1,
          url: "https://example.com/song/1",
        },
        {
          disc: 1,
          track: 2,
          url: "https://example.com/song/2",
        },
      ]);
    });

    it("parses song with url suffix", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:song:url" content="https://example.com/song/1" />
          <meta property="music:song:track" content="5" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([
        {
          track: 5,
          url: "https://example.com/song/1",
        },
      ]);
    });

    it("parses musician for album", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.album" />
          <meta property="music:musician" content="https://example.com/artist/beatles" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.musicians).toEqual(["https://example.com/artist/beatles"]);
    });

    it("parses release date", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.album" />
          <meta property="music:release_date" content="1975-11-21" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.releaseDate).toBe("1975-11-21");
    });

    it("parses complete album metadata", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.album" />
          <meta property="og:title" content="A Night at the Opera" />
          <meta property="music:song" content="https://example.com/song/death-on-two-legs" />
          <meta property="music:song:track" content="1" />
          <meta property="music:song" content="https://example.com/song/bohemian-rhapsody" />
          <meta property="music:song:track" content="11" />
          <meta property="music:musician" content="https://example.com/artist/queen" />
          <meta property="music:release_date" content="1975-11-21" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([
        {
          track: 1,
          url: "https://example.com/song/death-on-two-legs",
        },
        {
          track: 11,
          url: "https://example.com/song/bohemian-rhapsody",
        },
      ]);
      expect(result.musicians).toEqual(["https://example.com/artist/queen"]);
      expect(result.releaseDate).toBe("1975-11-21");
    });
  });

  describe("music.playlist type", () => {
    it("parses songs in playlist", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.playlist" />
          <meta property="music:song" content="https://example.com/song/1" />
          <meta property="music:song" content="https://example.com/song/2" />
          <meta property="music:song" content="https://example.com/song/3" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([
        { url: "https://example.com/song/1" },
        { url: "https://example.com/song/2" },
        { url: "https://example.com/song/3" },
      ]);
    });

    it("parses creator", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.playlist" />
          <meta property="music:creator" content="https://example.com/user/dj-awesome" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.creator).toBe("https://example.com/user/dj-awesome");
    });

    it("parses playlist with songs and creator", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.playlist" />
          <meta property="og:title" content="Summer Vibes" />
          <meta property="music:song" content="https://example.com/song/1" />
          <meta property="music:song:track" content="1" />
          <meta property="music:song" content="https://example.com/song/2" />
          <meta property="music:song:track" content="2" />
          <meta property="music:creator" content="https://example.com/user/dj-awesome" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([
        { track: 1, url: "https://example.com/song/1" },
        { track: 2, url: "https://example.com/song/2" },
      ]);
      expect(result.creator).toBe("https://example.com/user/dj-awesome");
    });
  });

  describe("music.radio_station type", () => {
    it("parses creator for radio station", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="og:type" content="music.radio_station" />
          <meta property="og:title" content="Jazz FM" />
          <meta property="music:creator" content="https://example.com/station/jazz-fm" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.creator).toBe("https://example.com/station/jazz-fm");
    });
  });

  describe("edge cases", () => {
    it("returns empty data when no music metadata present", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <title>No music metadata</title>
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBeUndefined();
      expect(result.albums).toBeUndefined();
      expect(result.musicians).toBeUndefined();
      expect(result.songs).toBeUndefined();
      expect(result.creator).toBeUndefined();
      expect(result.releaseDate).toBeUndefined();
    });

    it("handles disc/track without preceding album", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:album:disc" content="1" />
          <meta property="music:album:track" content="5" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.albums).toBeUndefined();
    });

    it("handles disc/track without preceding song", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:song:disc" content="1" />
          <meta property="music:song:track" content="5" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toBeUndefined();
    });

    it("ignores invalid disc number (zero)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:album" content="https://example.com/album/1" />
          <meta property="music:album:disc" content="0" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.albums).toEqual([{ url: "https://example.com/album/1" }]);
    });

    it("ignores invalid track number (non-numeric)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:song" content="https://example.com/song/1" />
          <meta property="music:song:track" content="first" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.songs).toEqual([{ url: "https://example.com/song/1" }]);
    });

    it("handles meta tags with name attribute instead of property", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta name="music:duration" content="180" />
          <meta name="music:musician" content="https://example.com/artist/1" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBe(180);
      expect(result.musicians).toEqual(["https://example.com/artist/1"]);
    });

    it("deduplicates musicians", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:musician" content="https://example.com/artist/1" />
          <meta name="music:musician" content="https://example.com/artist/1" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.musicians).toEqual(["https://example.com/artist/1"]);
    });

    it("handles whitespace in values", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="music:duration" content="  300  " />
          <meta property="music:album" content="  https://example.com/album/1  " />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseMusic($);

      expect(result.duration).toBe(300);
      expect(result.albums).toEqual([{ url: "https://example.com/album/1" }]);
    });
  });
});
