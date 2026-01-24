import { describe, expect, it } from "bun:test";

import { extractFromHtml, type ExtractSuccess } from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - Favicon", () => {
  const result = extractFromHtml(fixtures.favicon, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("extracts favicon (backward compatible - first match)", () => {
    expect(result.data.basic.favicon).toBe("https://example.com/favicon.ico");
  });

  it("extracts all favicons as array", () => {
    expect(result.data.basic.favicons).toBeDefined();
    expect(result.data.basic.favicons?.length).toBe(7);
  });

  it("extracts icon with type and sizes", () => {
    const icon32 = result.data.basic.favicons?.find(
      (f) => f.url === "https://example.com/favicon-32.png"
    );
    expect(icon32).toBeDefined();
    expect(icon32?.rel).toBe("icon");
    expect(icon32?.type).toBe("image/png");
    expect(icon32?.sizes).toBe("32x32");
  });

  it("extracts shortcut icon", () => {
    const shortcut = result.data.basic.favicons?.find(
      (f) => f.rel === "shortcut icon"
    );
    expect(shortcut).toBeDefined();
    expect(shortcut?.url).toBe("https://example.com/shortcut.ico");
  });

  it("extracts apple-touch-icon with sizes", () => {
    const appleIcon = result.data.basic.favicons?.find(
      (f) => f.rel === "apple-touch-icon"
    );
    expect(appleIcon).toBeDefined();
    expect(appleIcon?.url).toBe("https://example.com/apple-touch-icon.png");
    expect(appleIcon?.sizes).toBe("180x180");
  });

  it("extracts apple-touch-icon-precomposed", () => {
    const precomposed = result.data.basic.favicons?.find(
      (f) => f.rel === "apple-touch-icon-precomposed"
    );
    expect(precomposed).toBeDefined();
    expect(precomposed?.url).toBe(
      "https://example.com/apple-touch-icon-precomposed.png"
    );
    expect(precomposed?.sizes).toBe("152x152");
  });

  it("extracts mask-icon with color", () => {
    const maskIcon = result.data.basic.favicons?.find(
      (f) => f.rel === "mask-icon"
    );
    expect(maskIcon).toBeDefined();
    expect(maskIcon?.url).toBe("https://example.com/safari-pinned-tab.svg");
    expect(maskIcon?.color).toBe("#5bbad5");
  });

  it("extracts manifest URL", () => {
    expect(result.data.basic.manifestUrl).toBe(
      "https://example.com/manifest.json"
    );
  });
});

describe("extractFromHtml - Favicon edge cases", () => {
  describe("basic behavior", () => {
    it("handles no favicons gracefully", () => {
      const html = `
        <!doctype html>
        <html>
        <head><title>No favicons</title></head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicon).toBeUndefined();
      expect(result.data.basic.favicons).toBeUndefined();
    });

    it("resolves relative favicon URLs", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="/icons/favicon.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicon).toBe(
        "https://example.com/icons/favicon.png"
      );
    });

    it("returns relative URLs as-is when no baseUrl is provided", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="/icons/favicon.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html) as ExtractSuccess;

      expect(result.data.basic.favicon).toBe("/icons/favicon.png");
    });
  });

  describe("SVG and special formats", () => {
    it("handles SVG favicons", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      const svgIcon = result.data.basic.favicons?.[0];
      expect(svgIcon?.url).toBe("https://example.com/icon.svg");
      expect(svgIcon?.type).toBe("image/svg+xml");
    });

    it("handles multiple sizes in one link", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="/multi.png" sizes="48x48 96x96 192x192" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      const icon = result.data.basic.favicons?.[0];
      expect(icon?.sizes).toBe("48x48 96x96 192x192");
    });

    it("handles 'any' size for SVG", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      const icon = result.data.basic.favicons?.[0];
      expect(icon?.sizes).toBe("any");
    });

    it("handles protocol-relative URLs", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="//cdn.example.com/icon.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicon).toBe(
        "https://cdn.example.com/icon.png"
      );
    });
  });

  describe("rel attribute handling", () => {
    it("handles case-insensitive rel attributes", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="ICON" href="/uppercase.png" />
          <link rel="Apple-Touch-Icon" href="/mixed-case.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(2);
      expect(result.data.basic.favicons?.[0]?.rel).toBe("icon");
      expect(result.data.basic.favicons?.[0]?.url).toBe(
        "https://example.com/uppercase.png"
      );
      expect(result.data.basic.favicons?.[1]?.rel).toBe("apple-touch-icon");
      expect(result.data.basic.favicons?.[1]?.url).toBe(
        "https://example.com/mixed-case.png"
      );
    });

    it("handles whitespace in rel attribute", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="shortcut    icon" href="/favicon.ico" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicons?.[0]?.rel).toBe("shortcut icon");
    });

    it("does not match false positive rel values like 'not-icon'", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="not-icon" href="/not-a-favicon.png" />
          <link rel="icon" href="/real-favicon.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicon).toBe(
        "https://example.com/real-favicon.png"
      );
    });
  });

  describe("invalid href rejection", () => {
    it("rejects javascript: href values", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="javascript:alert(1)" />
          <link rel="icon" href="/valid.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicon).toBe("https://example.com/valid.png");
    });

    it("rejects hash-only href values", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="#" />
          <link rel="icon" href="/valid.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicon).toBe("https://example.com/valid.png");
    });

    it("rejects empty href values", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="" />
          <link rel="icon" href="   " />
          <link rel="icon" href="/valid.png" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicon).toBe("https://example.com/valid.png");
    });

    it("accepts data URI favicons (except text/html)", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <link rel="icon" href="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" type="image/svg+xml" />
          <link rel="icon" href="data:text/html,<script>alert(1)</script>" />
        </head>
        <body></body>
        </html>
      `;
      const result = extractFromHtml(html, {
        baseUrl: "https://example.com",
      }) as ExtractSuccess;

      expect(result.data.basic.favicons?.length).toBe(1);
      expect(result.data.basic.favicon).toBe(
        "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"
      );
    });
  });
});
