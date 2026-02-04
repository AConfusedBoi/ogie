import { describe, expect, it } from "bun:test";

import {
  extractFromHtml,
  type ExtractSuccess,
  type JsonLdPerson,
} from "../src";
import { realWorldFixtures } from "./data/real-world";

// =============================================================================
// YouTube Video
// =============================================================================

describe("Real-World: YouTube Video", () => {
  const result = extractFromHtml(realWorldFixtures.youtubeVideo, {
    baseUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  describe("OpenGraph data", () => {
    it("extracts og:type as video.other", () => {
      expect(result.data.og.type).toBe("video.other");
    });

    it("extracts og:title", () => {
      expect(result.data.og.title).toBe("Amazing Video");
    });

    it("extracts og:site_name", () => {
      expect(result.data.og.siteName).toBe("YouTube");
    });

    it("extracts og:image", () => {
      expect(result.data.og.images).toHaveLength(1);
      expect(result.data.og.images[0].url).toContain("ytimg.com");
      expect(result.data.og.images[0].width).toBe(1280);
      expect(result.data.og.images[0].height).toBe(720);
    });

    it("extracts og:video with embed URL", () => {
      expect(result.data.og.videos).toBeDefined();
      expect(result.data.og.videos?.length).toBeGreaterThanOrEqual(1);
      expect(result.data.og.videos?.[0]?.url).toContain("youtube.com/embed");
    });
  });

  describe("Twitter data", () => {
    it("extracts twitter:card as player", () => {
      expect(result.data.twitter.card).toBe("player");
    });

    it("extracts twitter:site", () => {
      expect(result.data.twitter.site).toBe("@youtube");
    });

    it("extracts twitter:player", () => {
      expect(result.data.twitter.player).toBeDefined();
      expect(result.data.twitter.player?.url).toContain("youtube.com/embed");
      expect(result.data.twitter.player?.width).toBe(1280);
      expect(result.data.twitter.player?.height).toBe(720);
    });
  });

  describe("JSON-LD data", () => {
    it("extracts JSON-LD VideoObject", () => {
      expect(result.data.jsonLd).toBeDefined();
      expect(result.data.jsonLd?.items).toHaveLength(1);
      expect(result.data.jsonLd?.items?.[0]?.type).toBe("VideoObject");
    });

    it("extracts JSON-LD author", () => {
      const author = result.data.jsonLd?.items?.[0]?.author as
        | JsonLdPerson
        | undefined;
      expect(author).toBeDefined();
      expect(author?.name).toBe("Test Channel");
    });
  });

  it("extracts oEmbed discovery with JSON URL", () => {
    expect(result.data.oEmbedDiscovery).toBeDefined();
    expect(result.data.oEmbedDiscovery?.jsonUrl).toContain("oembed");
  });

  it("extracts theme-color", () => {
    expect(result.data.basic.themeColor).toBe("#ff0000");
  });

  it("does not detect RSS/Atom feeds", () => {
    expect(result.data.feeds).toBeUndefined();
  });

  it("extracts canonical URL", () => {
    expect(result.data.basic.canonical).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
  });
});

// =============================================================================
// Twitter/X Tweet
// =============================================================================

describe("Real-World: Twitter/X Tweet", () => {
  const result = extractFromHtml(realWorldFixtures.twitterTweet, {
    baseUrl: "https://x.com/testuser/status/1234567890",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as article", () => {
    expect(result.data.og.type).toBe("article");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("@testuser on X");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("X (formerly Twitter)");
  });

  it("extracts twitter:card as summary_large_image", () => {
    expect(result.data.twitter.card).toBe("summary_large_image");
  });

  it("extracts twitter:creator", () => {
    expect(result.data.twitter.creator).toBe("@testuser");
  });

  it("extracts twitter:site", () => {
    expect(result.data.twitter.site).toBe("@x");
  });

  it("extracts robots meta with max-image-preview", () => {
    expect(result.data.basic.robots).toBeDefined();
    expect(result.data.basic.robots).toContain("max-image-preview");
  });

  it("extracts canonical URL", () => {
    expect(result.data.basic.canonical).toBe(
      "https://x.com/testuser/status/1234567890"
    );
  });
});

// =============================================================================
// GitHub Repository
// =============================================================================

describe("Real-World: GitHub Repository", () => {
  const result = extractFromHtml(realWorldFixtures.githubRepo, {
    baseUrl: "https://github.com/dobroslavradosavljevic/ogie",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as object", () => {
    expect(result.data.og.type).toBe("object");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("dobroslavradosavljevic/ogie");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("GitHub");
  });

  it("extracts twitter:card as summary_large_image", () => {
    expect(result.data.twitter.card).toBe("summary_large_image");
  });

  it("extracts twitter:site", () => {
    expect(result.data.twitter.site).toBe("@github");
  });

  it("discovers atom feed", () => {
    expect(result.data.feeds).toBeDefined();
    expect(result.data.feeds?.feeds?.length).toBeGreaterThanOrEqual(1);
    expect(result.data.feeds?.feeds?.[0]?.type).toBe("atom");
  });

  it("extracts theme-color", () => {
    expect(result.data.basic.themeColor).toBe("#1e2327");
  });

  it("extracts favicon", () => {
    expect(result.data.basic.favicon).toBeDefined();
  });
});

// =============================================================================
// Medium Article
// =============================================================================

describe("Real-World: Medium Article", () => {
  const result = extractFromHtml(realWorldFixtures.mediumArticle, {
    baseUrl:
      "https://medium.com/@janeauthor/how-to-build-metadata-extractor-abc123",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as article", () => {
    expect(result.data.og.type).toBe("article");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("How to Build a Metadata Extractor");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("Medium");
  });

  describe("Article data", () => {
    it("extracts article:published_time", () => {
      expect(result.data.article).toBeDefined();
      expect(result.data.article?.publishedTime).toBe(
        "2024-03-15T10:00:00.000Z"
      );
    });

    it("extracts article:modified_time", () => {
      expect(result.data.article?.modifiedTime).toBe(
        "2024-03-16T14:30:00.000Z"
      );
    });

    it("extracts article tags including TypeScript", () => {
      expect(result.data.article?.tags).toBeDefined();
      expect(result.data.article?.tags).toContain("TypeScript");
      expect(result.data.article?.tags).toContain("Web Scraping");
      expect(result.data.article?.tags).toContain("Open Source");
    });

    it("extracts article section", () => {
      expect(result.data.article?.section).toBe("Programming");
    });
  });

  it("extracts JSON-LD with Article type", () => {
    expect(result.data.jsonLd).toBeDefined();
    expect(result.data.jsonLd?.items).toHaveLength(1);
    expect(result.data.jsonLd?.items?.[0]?.type).toBe("Article");
  });

  it("extracts twitter:creator", () => {
    expect(result.data.twitter.creator).toBe("@janeauthor");
  });

  it("extracts twitter:card", () => {
    expect(result.data.twitter.card).toBe("summary_large_image");
  });
});

// =============================================================================
// Wikipedia Page
// =============================================================================

describe("Real-World: Wikipedia Page", () => {
  const result = extractFromHtml(realWorldFixtures.wikipediaPage, {
    baseUrl: "https://en.wikipedia.org/wiki/OpenGraph_protocol",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("OpenGraph protocol");
  });

  it("extracts og:type as website", () => {
    expect(result.data.og.type).toBe("website");
  });

  describe("Dublin Core data", () => {
    it("extracts Dublin Core metadata", () => {
      expect(result.data.dublinCore).toBeDefined();
      expect(result.data.dublinCore?.title).toBe("OpenGraph protocol");
    });

    it("extracts Dublin Core creator", () => {
      expect(result.data.dublinCore?.creator).toBe("Wikipedia contributors");
    });

    it("extracts Dublin Core subject", () => {
      expect(result.data.dublinCore?.subject).toBe("Web standards");
    });

    it("extracts DCTERMS.created as date", () => {
      expect(result.data.dublinCore?.date).toBe("2010-04-21");
    });
  });

  it("discovers atom feed", () => {
    expect(result.data.feeds).toBeDefined();
    expect(result.data.feeds?.feeds?.length).toBeGreaterThanOrEqual(1);
    expect(result.data.feeds?.feeds?.[0]?.type).toBe("atom");
    expect(result.data.feeds?.feeds?.[0]?.title).toBe("Wikipedia Atom Feed");
  });

  it("extracts JSON-LD with Article type", () => {
    expect(result.data.jsonLd).toBeDefined();
    expect(result.data.jsonLd?.items).toHaveLength(1);
    expect(result.data.jsonLd?.items?.[0]?.type).toBe("Article");
  });
});

// =============================================================================
// Amazon Product
// =============================================================================

describe("Real-World: Amazon Product", () => {
  const result = extractFromHtml(realWorldFixtures.amazonProduct, {
    baseUrl: "https://www.amazon.com/dp/B0EXAMPLE",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as product", () => {
    expect(result.data.og.type).toBe("product");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("Wireless Bluetooth Headphones");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("Amazon.com");
  });

  it("extracts twitter:card as summary", () => {
    expect(result.data.twitter.card).toBe("summary");
  });

  it("extracts JSON-LD Product with offers", () => {
    expect(result.data.jsonLd).toBeDefined();
    expect(result.data.jsonLd?.items).toHaveLength(1);
    expect(result.data.jsonLd?.items?.[0]?.type).toBe("Product");
    expect(result.data.jsonLd?.items?.[0]?.offers).toBeDefined();
  });

  it("extracts JSON-LD Product offers details", () => {
    const offers = result.data.jsonLd?.items?.[0]?.offers as Record<
      string,
      unknown
    >;
    expect(offers).toBeDefined();
    expect(offers.price).toBe("79.99");
    expect(offers.priceCurrency).toBe("USD");
  });

  it("extracts JSON-LD Product aggregateRating", () => {
    const rating = result.data.jsonLd?.items?.[0]?.aggregateRating as
      | Record<string, unknown>
      | undefined;
    expect(rating).toBeDefined();
    expect(rating?.ratingValue).toBe("4.3");
  });

  it("extracts canonical URL", () => {
    expect(result.data.basic.canonical).toBe(
      "https://www.amazon.com/dp/B0EXAMPLE"
    );
  });
});

// =============================================================================
// Spotify Track
// =============================================================================

describe("Real-World: Spotify Track", () => {
  const result = extractFromHtml(realWorldFixtures.spotifyTrack, {
    baseUrl: "https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as music.song", () => {
    expect(result.data.og.type).toBe("music.song");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe("Bohemian Rhapsody");
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("Spotify");
  });

  describe("Audio and music data", () => {
    it("extracts og:audio", () => {
      expect(result.data.og.audio).toBeDefined();
      expect(result.data.og.audio?.length).toBeGreaterThanOrEqual(1);
      expect(result.data.og.audio?.[0]?.url).toContain("scdn.co");
    });

    it("extracts music duration", () => {
      expect(result.data.music).toBeDefined();
      expect(result.data.music?.duration).toBe(354);
    });
  });

  it("extracts music album", () => {
    expect(result.data.music?.albums).toBeDefined();
    expect(result.data.music?.albums?.length).toBeGreaterThanOrEqual(1);
    expect(result.data.music?.albums?.[0]?.url).toContain("spotify.com/album");
    expect(result.data.music?.albums?.[0]?.disc).toBe(1);
    expect(result.data.music?.albums?.[0]?.track).toBe(11);
  });

  it("extracts music musician", () => {
    expect(result.data.music?.musicians).toBeDefined();
    expect(result.data.music?.musicians?.length).toBeGreaterThanOrEqual(1);
    expect(result.data.music?.musicians?.[0]).toContain("spotify.com/artist");
  });

  describe("App Links", () => {
    it("extracts App Links for iOS", () => {
      expect(result.data.appLinks).toBeDefined();
      expect(result.data.appLinks?.ios).toBeDefined();
      expect(result.data.appLinks?.ios?.length).toBeGreaterThanOrEqual(1);
      expect(result.data.appLinks?.ios?.[0]?.appStoreId).toBe("324684580");
      expect(result.data.appLinks?.ios?.[0]?.appName).toBe("Spotify");
      expect(result.data.appLinks?.ios?.[0]?.url).toBe(
        "spotify://track/4u7EnebtmKWzUH433cf5Qv"
      );
    });

    it("extracts App Links for Android", () => {
      expect(result.data.appLinks?.android).toBeDefined();
      expect(result.data.appLinks?.android?.length).toBeGreaterThanOrEqual(1);
      expect(result.data.appLinks?.android?.[0]?.package).toBe(
        "com.spotify.music"
      );
      expect(result.data.appLinks?.android?.[0]?.appName).toBe("Spotify");
      expect(result.data.appLinks?.android?.[0]?.url).toBe(
        "spotify://track/4u7EnebtmKWzUH433cf5Qv"
      );
    });
  });

  it("extracts twitter:card as summary", () => {
    expect(result.data.twitter.card).toBe("summary");
  });
});

// =============================================================================
// New York Times Article
// =============================================================================

describe("Real-World: NYTimes Article", () => {
  const result = extractFromHtml(realWorldFixtures.nytimesArticle, {
    baseUrl:
      "https://www.nytimes.com/2024/03/15/science/climate-discovery.html",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts og:type as article", () => {
    expect(result.data.og.type).toBe("article");
  });

  it("extracts og:title", () => {
    expect(result.data.og.title).toBe(
      "Breaking: Major Discovery in Climate Science"
    );
  });

  it("extracts og:site_name", () => {
    expect(result.data.og.siteName).toBe("The New York Times");
  });

  describe("Article data", () => {
    it("extracts article:published_time", () => {
      expect(result.data.article).toBeDefined();
      expect(result.data.article?.publishedTime).toBe(
        "2024-03-15T08:00:00.000Z"
      );
    });

    it("extracts article with multiple authors", () => {
      expect(result.data.article?.author).toBeDefined();
      expect(Array.isArray(result.data.article?.author)).toBe(true);
      const authors = result.data.article?.author as string[];
      expect(authors).toHaveLength(2);
      expect(authors).toContain("https://www.nytimes.com/by/john-reporter");
      expect(authors).toContain("https://www.nytimes.com/by/jane-scientist");
    });

    it("extracts article section", () => {
      expect(result.data.article?.section).toBe("Science");
    });

    it("extracts article tags", () => {
      expect(result.data.article?.tags).toBeDefined();
      expect(result.data.article?.tags).toContain("Climate Change");
      expect(result.data.article?.tags).toContain("Research");
    });
  });

  describe("JSON-LD data", () => {
    it("extracts JSON-LD NewsArticle", () => {
      expect(result.data.jsonLd).toBeDefined();
      expect(result.data.jsonLd?.items).toHaveLength(1);
      expect(result.data.jsonLd?.items?.[0]?.type).toBe("NewsArticle");
    });

    it("extracts JSON-LD multiple authors", () => {
      const authors = result.data.jsonLd?.items?.[0]?.author as
        | JsonLdPerson[]
        | undefined;
      expect(Array.isArray(authors)).toBe(true);
      expect(authors).toHaveLength(2);
      expect(authors?.[0]?.name).toBe("John Reporter");
      expect(authors?.[1]?.name).toBe("Jane Scientist");
    });
  });

  describe("Twitter and basic metadata", () => {
    it("extracts twitter:card as summary_large_image", () => {
      expect(result.data.twitter.card).toBe("summary_large_image");
    });

    it("extracts twitter:creator", () => {
      expect(result.data.twitter.creator).toBe("@johnreporter");
    });

    it("extracts robots meta", () => {
      expect(result.data.basic.robots).toContain("max-image-preview");
    });

    it("extracts basic author meta", () => {
      expect(result.data.basic.author).toBe("John Reporter and Jane Scientist");
    });
  });
});
