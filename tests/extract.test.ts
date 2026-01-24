import { describe, expect, it } from "bun:test";

import {
  extract,
  extractFromHtml,
  isFetchError,
  isOgieError,
  isParseError,
  type ExtractFailure,
  type ExtractSuccess,
} from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - OpenGraph", () => {
  const result = extractFromHtml(fixtures.opengraph, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("Test Title");
  });

  it("extracts og:description", () => {
    expect(result.data.og.description).toBe("Test Description");
  });

  it("extracts og:type", () => {
    expect(result.data.og.type).toBe("website");
  });

  it("extracts og:url", () => {
    expect(result.data.og.url).toBe("https://example.com");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("Example Site");
  });

  it("extracts og:image with dimensions", () => {
    expect(result.data.og.images).toHaveLength(1);
    expect(result.data.og.images[0].url).toBe("https://example.com/image.png");
    expect(result.data.og.images[0].width).toBe(1200);
    expect(result.data.og.images[0].height).toBe(630);
  });
});

describe("extractFromHtml - Twitter Card", () => {
  const result = extractFromHtml(fixtures.twitter, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts twitter:card", () => {
    expect(result.data.twitter.card).toBe("summary_large_image");
  });

  it("extracts twitter:site and creator", () => {
    expect(result.data.twitter.site).toBe("@example");
    expect(result.data.twitter.creator).toBe("@author");
  });

  it("extracts twitter:site:id", () => {
    expect(result.data.twitter.siteId).toBe("12345678");
  });

  it("extracts twitter:creator:id", () => {
    expect(result.data.twitter.creatorId).toBe("87654321");
  });

  it("extracts twitter:title and description", () => {
    expect(result.data.twitter.title).toBe("Twitter Title");
    expect(result.data.twitter.description).toBe("Twitter Description");
  });

  it("extracts twitter:image", () => {
    expect(result.data.twitter.image?.url).toBe(
      "https://example.com/twitter.png"
    );
  });
});

describe("extractFromHtml - Twitter Player Card", () => {
  const result = extractFromHtml(fixtures.twitterPlayer, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts twitter:card as player", () => {
    expect(result.data.twitter.card).toBe("player");
  });

  it("extracts twitter:player url", () => {
    expect(result.data.twitter.player?.url).toBe(
      "https://example.com/player.html"
    );
  });

  it("extracts twitter:player dimensions", () => {
    expect(result.data.twitter.player?.width).toBe(640);
    expect(result.data.twitter.player?.height).toBe(360);
  });

  it("extracts twitter:player:stream", () => {
    expect(result.data.twitter.player?.stream).toBe(
      "https://example.com/video.mp4"
    );
  });

  it("extracts twitter:player:stream:content_type", () => {
    expect(result.data.twitter.player?.streamContentType).toBe("video/mp4");
  });
});

describe("extractFromHtml - Twitter App Card", () => {
  const result = extractFromHtml(fixtures.twitterApp, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts twitter:card as app", () => {
    expect(result.data.twitter.card).toBe("app");
  });

  it("extracts iphone app metadata", () => {
    expect(result.data.twitter.app?.iphone?.id).toBe("123456789");
    expect(result.data.twitter.app?.iphone?.url).toBe("myapp://page");
    expect(result.data.twitter.app?.iphone?.name).toBe("My App");
  });

  it("extracts ipad app metadata", () => {
    expect(result.data.twitter.app?.ipad?.id).toBe("987654321");
    expect(result.data.twitter.app?.ipad?.url).toBe("myapp://tablet");
    expect(result.data.twitter.app?.ipad?.name).toBe("My App HD");
  });

  it("extracts googleplay app metadata", () => {
    expect(result.data.twitter.app?.googleplay?.id).toBe("com.example.myapp");
    expect(result.data.twitter.app?.googleplay?.url).toBe(
      "https://play.google.com/store/apps/details?id=com.example.myapp"
    );
    expect(result.data.twitter.app?.googleplay?.name).toBe(
      "My App for Android"
    );
  });

  it("extracts twitter:app:country", () => {
    expect(result.data.twitter.app?.country).toBe("US");
  });
});

describe("extractFromHtml - OpenGraph Extended", () => {
  const result = extractFromHtml(fixtures.opengraphExtended, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:locale", () => {
    expect(result.data.og.locale).toBe("en_US");
  });

  it("extracts og:locale:alternate as array", () => {
    expect(result.data.og.localeAlternate).toEqual(["es_ES", "fr_FR", "de_DE"]);
  });

  it("extracts og:determiner", () => {
    expect(result.data.og.determiner).toBe("the");
  });
});

describe("extractFromHtml - Basic Meta", () => {
  const result = extractFromHtml(fixtures.basic, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts title", () => {
    expect(result.data.basic.title).toBe("Page Title");
  });

  it("extracts description", () => {
    expect(result.data.basic.description).toBe("Page Description");
  });

  it("extracts author and keywords", () => {
    expect(result.data.basic.author).toBe("John Doe");
    expect(result.data.basic.keywords).toBe("test, example");
  });

  it("extracts charset", () => {
    expect(result.data.basic.charset).toBe("utf8");
  });

  it("extracts canonical and favicon with URL resolution", () => {
    expect(result.data.basic.canonical).toBe("https://example.com/page");
    expect(result.data.basic.favicon).toBe("https://example.com/favicon.ico");
  });
});

describe("extractFromHtml - Basic Meta Extended", () => {
  const result = extractFromHtml(fixtures.basicExtended, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts generator", () => {
    expect(result.data.basic.generator).toBe("WordPress 6.0");
  });

  it("extracts application-name", () => {
    expect(result.data.basic.applicationName).toBe("My Web App");
  });

  it("extracts referrer", () => {
    expect(result.data.basic.referrer).toBe("no-referrer-when-downgrade");
  });
});

describe("extractFromHtml - Fallbacks", () => {
  it("applies fallback from basic to OG", () => {
    const result = extractFromHtml(fixtures.fallback, {
      baseUrl: "https://example.com",
    }) as ExtractSuccess;

    expect(result.data.og.title).toBe("Basic Title");
    expect(result.data.og.description).toBe("Basic Description");
  });

  it("respects onlyOpenGraph option", () => {
    const result = extractFromHtml(fixtures.fallback, {
      baseUrl: "https://example.com",
      onlyOpenGraph: true,
    }) as ExtractSuccess;

    expect(result.data.og.title).toBeUndefined();
    expect(result.data.og.description).toBeUndefined();
  });
});

describe("extract - URL validation", () => {
  it("returns INVALID_URL error for invalid URLs", async () => {
    const result = (await extract("not-a-valid-url")) as ExtractFailure;

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_URL");
    expect(isOgieError(result.error)).toBe(true);
  });

  it("returns INVALID_URL error for non-HTTP URLs", async () => {
    const result = (await extract("ftp://example.com")) as ExtractFailure;

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_URL");
  });
});

describe("type guards", () => {
  it("exports type guards", () => {
    expect(typeof isOgieError).toBe("function");
    expect(typeof isFetchError).toBe("function");
    expect(typeof isParseError).toBe("function");
  });
});
