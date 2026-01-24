import { describe, expect, it } from "bun:test";

import {
  extractFromHtml,
  type ExtractSuccess,
  type OEmbedPhoto,
  type OEmbedRich,
  type OEmbedVideo,
} from "../src";
import { parseOEmbedResponse } from "../src/parsers/oembed";
import { isPrivateUrl, isValidUrl } from "../src/utils/url";
import { fixtures } from "./data";

describe("extractFromHtml - oEmbed Discovery", () => {
  const result = extractFromHtml(fixtures.oEmbed, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("discovers JSON oEmbed endpoint", () => {
    expect(result.data.oEmbedDiscovery?.jsonUrl).toBe(
      "https://example.com/oembed?url=https%3A%2F%2Fexample.com%2Fvideo%2F123&format=json"
    );
  });

  it("discovers XML oEmbed endpoint", () => {
    expect(result.data.oEmbedDiscovery?.xmlUrl).toBe(
      "https://example.com/oembed?url=https%3A%2F%2Fexample.com%2Fvideo%2F123&format=xml"
    );
  });
});

describe("extractFromHtml - No oEmbed Discovery", () => {
  const html = `
    <!doctype html>
    <html>
    <head><title>No oEmbed</title></head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined oEmbedDiscovery when no links present", () => {
    expect(result.data.oEmbedDiscovery).toBeUndefined();
  });
});

describe("parseOEmbedResponse - Photo type", () => {
  const json = {
    author_name: "John Doe",
    author_url: "https://example.com/john",
    cache_age: 3600,
    height: 600,
    provider_name: "Example",
    provider_url: "https://example.com",
    thumbnail_height: 150,
    thumbnail_url: "https://example.com/thumb.jpg",
    thumbnail_width: 200,
    title: "Test Photo",
    type: "photo",
    url: "https://example.com/photo.jpg",
    version: "1.0",
    width: 800,
  };

  const result = parseOEmbedResponse(json);

  it("parses photo type", () => {
    expect(result?.type).toBe("photo");
  });

  it("extracts required photo fields", () => {
    expect(result?.type).toBe("photo");
    const photo = result as OEmbedPhoto;
    expect(photo.url).toBe("https://example.com/photo.jpg");
    expect(photo.width).toBe(800);
    expect(photo.height).toBe(600);
  });

  it("extracts base fields", () => {
    expect(result?.title).toBe("Test Photo");
    expect(result?.authorName).toBe("John Doe");
    expect(result?.authorUrl).toBe("https://example.com/john");
    expect(result?.providerName).toBe("Example");
    expect(result?.providerUrl).toBe("https://example.com");
    expect(result?.cacheAge).toBe(3600);
  });

  it("extracts thumbnail fields", () => {
    expect(result?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result?.thumbnailWidth).toBe(200);
    expect(result?.thumbnailHeight).toBe(150);
  });
});

describe("parseOEmbedResponse - Video type", () => {
  const json = {
    height: 360,
    html: '<iframe src="https://youtube.com/embed/xyz"></iframe>',
    provider_name: "YouTube",
    title: "Test Video",
    type: "video",
    version: "1.0",
    width: 640,
  };

  const result = parseOEmbedResponse(json);

  it("parses video type", () => {
    expect(result?.type).toBe("video");
  });

  it("extracts required video fields", () => {
    expect(result?.type).toBe("video");
    const video = result as OEmbedVideo;
    expect(video.html).toBe(
      '<iframe src="https://youtube.com/embed/xyz"></iframe>'
    );
    expect(video.width).toBe(640);
    expect(video.height).toBe(360);
  });
});

describe("parseOEmbedResponse - Rich type", () => {
  const json = {
    height: 300,
    html: '<div class="embed">Content</div>',
    type: "rich",
    version: "1.0",
    width: 500,
  };

  const result = parseOEmbedResponse(json);

  it("parses rich type", () => {
    expect(result?.type).toBe("rich");
  });

  it("extracts required rich fields", () => {
    expect(result?.type).toBe("rich");
    const rich = result as OEmbedRich;
    expect(rich.html).toBe('<div class="embed">Content</div>');
    expect(rich.width).toBe(500);
    expect(rich.height).toBe(300);
  });
});

describe("parseOEmbedResponse - Link type", () => {
  const json = {
    author_name: "Jane",
    provider_name: "Example Blog",
    title: "Example Article",
    type: "link",
    version: "1.0",
  };

  const result = parseOEmbedResponse(json);

  it("parses link type", () => {
    expect(result?.type).toBe("link");
  });

  it("extracts base fields for link", () => {
    expect(result?.title).toBe("Example Article");
    expect(result?.authorName).toBe("Jane");
    expect(result?.providerName).toBe("Example Blog");
  });
});

describe("parseOEmbedResponse - Invalid responses", () => {
  it("returns undefined for null", () => {
    expect(parseOEmbedResponse(null)).toBeUndefined();
  });

  it("returns undefined for non-object", () => {
    expect(parseOEmbedResponse("string")).toBeUndefined();
  });

  it("returns undefined for invalid type", () => {
    expect(
      parseOEmbedResponse({ type: "invalid", version: "1.0" })
    ).toBeUndefined();
  });

  it("returns undefined for photo without url", () => {
    expect(
      parseOEmbedResponse({
        height: 600,
        type: "photo",
        version: "1.0",
        width: 800,
      })
    ).toBeUndefined();
  });

  it("returns undefined for video without html", () => {
    expect(
      parseOEmbedResponse({
        height: 360,
        type: "video",
        version: "1.0",
        width: 640,
      })
    ).toBeUndefined();
  });

  it("returns undefined for photo without dimensions", () => {
    expect(
      parseOEmbedResponse({
        type: "photo",
        url: "https://example.com/photo.jpg",
        version: "1.0",
      })
    ).toBeUndefined();
  });
});

describe("parseOEmbedResponse - String number parsing", () => {
  const json = {
    cache_age: "3600",
    height: "600",
    type: "photo",
    url: "https://example.com/photo.jpg",
    version: "1.0",
    width: "800",
  };

  const result = parseOEmbedResponse(json);

  it("parses string numbers correctly", () => {
    expect(result?.type).toBe("photo");
    const photo = result as OEmbedPhoto;
    expect(photo.width).toBe(800);
    expect(photo.height).toBe(600);
    expect(photo.cacheAge).toBe(3600);
  });
});

describe("parseOEmbedResponse - Missing version field", () => {
  it("defaults version to 1.0 when missing", () => {
    const json = {
      height: 600,
      type: "photo",
      url: "https://example.com/photo.jpg",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.version).toBe("1.0");
  });
});

describe("parseOEmbedResponse - Empty object", () => {
  it("returns undefined for empty object", () => {
    expect(parseOEmbedResponse({})).toBeUndefined();
  });
});

describe("parseOEmbedResponse - Non-string type field", () => {
  it("returns undefined when type is a number", () => {
    expect(parseOEmbedResponse({ type: 123, version: "1.0" })).toBeUndefined();
  });

  it("returns undefined when type is null", () => {
    expect(parseOEmbedResponse({ type: null, version: "1.0" })).toBeUndefined();
  });

  it("returns undefined when type is an object", () => {
    expect(
      parseOEmbedResponse({ type: { name: "photo" }, version: "1.0" })
    ).toBeUndefined();
  });
});

describe("parseOEmbedResponse - Thumbnail all-or-nothing validation", () => {
  it("includes all thumbnail fields when all are present", () => {
    const json = {
      height: 600,
      thumbnail_height: 150,
      thumbnail_url: "https://example.com/thumb.jpg",
      thumbnail_width: 200,
      type: "photo",
      url: "https://example.com/photo.jpg",
      version: "1.0",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result?.thumbnailWidth).toBe(200);
    expect(result?.thumbnailHeight).toBe(150);
  });

  it("excludes all thumbnail fields when only thumbnail_url is present", () => {
    const json = {
      height: 600,
      thumbnail_url: "https://example.com/thumb.jpg",
      type: "photo",
      url: "https://example.com/photo.jpg",
      version: "1.0",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBeUndefined();
    expect(result?.thumbnailWidth).toBeUndefined();
    expect(result?.thumbnailHeight).toBeUndefined();
  });

  it("excludes all thumbnail fields when only thumbnail_url and thumbnail_width are present", () => {
    const json = {
      height: 600,
      thumbnail_url: "https://example.com/thumb.jpg",
      thumbnail_width: 200,
      type: "photo",
      url: "https://example.com/photo.jpg",
      version: "1.0",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBeUndefined();
    expect(result?.thumbnailWidth).toBeUndefined();
    expect(result?.thumbnailHeight).toBeUndefined();
  });

  it("excludes all thumbnail fields when only thumbnail_height is present", () => {
    const json = {
      height: 600,
      thumbnail_height: 150,
      type: "photo",
      url: "https://example.com/photo.jpg",
      version: "1.0",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBeUndefined();
    expect(result?.thumbnailWidth).toBeUndefined();
    expect(result?.thumbnailHeight).toBeUndefined();
  });

  it("excludes all thumbnail fields when thumbnail_width and thumbnail_height are present but no url", () => {
    const json = {
      height: 600,
      thumbnail_height: 150,
      thumbnail_width: 200,
      type: "photo",
      url: "https://example.com/photo.jpg",
      version: "1.0",
      width: 800,
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBeUndefined();
    expect(result?.thumbnailWidth).toBeUndefined();
    expect(result?.thumbnailHeight).toBeUndefined();
  });

  it("includes thumbnail fields for link type when all are present", () => {
    const json = {
      thumbnail_height: 150,
      thumbnail_url: "https://example.com/thumb.jpg",
      thumbnail_width: 200,
      title: "Example Link",
      type: "link",
      version: "1.0",
    };
    const result = parseOEmbedResponse(json);
    expect(result?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result?.thumbnailWidth).toBe(200);
    expect(result?.thumbnailHeight).toBe(150);
  });
});

describe("extractFromHtml - Multiple oEmbed links", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>Multiple oEmbed</title>
      <link rel="alternate" type="application/json+oembed" href="https://example.com/oembed/first.json">
      <link rel="alternate" type="application/json+oembed" href="https://example.com/oembed/second.json">
      <link rel="alternate" type="text/xml+oembed" href="https://example.com/oembed/first.xml">
      <link rel="alternate" type="text/xml+oembed" href="https://example.com/oembed/second.xml">
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("takes first JSON oEmbed link", () => {
    expect(result.data.oEmbedDiscovery?.jsonUrl).toBe(
      "https://example.com/oembed/first.json"
    );
  });

  it("takes first XML oEmbed link", () => {
    expect(result.data.oEmbedDiscovery?.xmlUrl).toBe(
      "https://example.com/oembed/first.xml"
    );
  });
});

describe("extractFromHtml - Alternative XML MIME type", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <title>Alternative XML MIME</title>
      <link rel="alternate" type="application/xml+oembed" href="https://example.com/oembed.xml">
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(html, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("discovers XML oEmbed endpoint with application/xml+oembed type", () => {
    expect(result.data.oEmbedDiscovery?.xmlUrl).toBe(
      "https://example.com/oembed.xml"
    );
  });
});

// SSRF Protection Tests - validates URL validation used for oEmbed endpoints
describe("oEmbed endpoint URL validation - SSRF protection", () => {
  describe("isValidUrl - scheme validation", () => {
    it("accepts http:// URLs", () => {
      expect(isValidUrl("http://example.com/oembed")).toBe(true);
    });

    it("accepts https:// URLs", () => {
      expect(isValidUrl("https://example.com/oembed")).toBe(true);
    });

    it("rejects file:// URLs", () => {
      expect(isValidUrl("file:///etc/passwd")).toBe(false);
    });

    it("rejects javascript: URLs", () => {
      // Using template literal to avoid linter error for javascript: URL
      expect(isValidUrl(`${"javascript"}:alert(1)`)).toBe(false);
    });

    it("rejects data: URLs", () => {
      expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
    });

    it("rejects ftp:// URLs", () => {
      expect(isValidUrl("ftp://example.com/file")).toBe(false);
    });

    it("rejects invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });
  });

  describe("isPrivateUrl - private/internal URL rejection", () => {
    it("detects localhost as private", () => {
      expect(isPrivateUrl("http://localhost/oembed")).toBe(true);
    });

    it("detects 127.0.0.1 as private", () => {
      expect(isPrivateUrl("http://127.0.0.1/oembed")).toBe(true);
    });

    it("detects 10.x.x.x range as private", () => {
      expect(isPrivateUrl("http://10.0.0.1/oembed")).toBe(true);
      expect(isPrivateUrl("http://10.255.255.255/oembed")).toBe(true);
    });

    it("detects 192.168.x.x range as private", () => {
      expect(isPrivateUrl("http://192.168.0.1/oembed")).toBe(true);
      expect(isPrivateUrl("http://192.168.1.100/oembed")).toBe(true);
    });

    it("detects 172.16-31.x.x range as private", () => {
      expect(isPrivateUrl("http://172.16.0.1/oembed")).toBe(true);
      expect(isPrivateUrl("http://172.31.255.255/oembed")).toBe(true);
    });

    it("detects 169.254.x.x (link-local) as private", () => {
      expect(isPrivateUrl("http://169.254.1.1/oembed")).toBe(true);
    });

    it("detects 0.0.0.0 as private", () => {
      expect(isPrivateUrl("http://0.0.0.0/oembed")).toBe(true);
    });

    it("detects .local TLD as private", () => {
      expect(isPrivateUrl("http://myserver.local/oembed")).toBe(true);
    });

    it("detects .internal TLD as private", () => {
      expect(isPrivateUrl("http://api.internal/oembed")).toBe(true);
    });

    it("allows public URLs", () => {
      expect(isPrivateUrl("https://example.com/oembed")).toBe(false);
      expect(isPrivateUrl("https://youtube.com/oembed")).toBe(false);
    });
  });
});
