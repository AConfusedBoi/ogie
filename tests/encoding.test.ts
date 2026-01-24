import { describe, expect, it } from "bun:test";

import {
  decodeHtml,
  detectCharset,
  isCharsetSupported,
  parseContentTypeCharset,
} from "../src/utils/encoding";

describe("parseContentTypeCharset", () => {
  it("extracts charset from Content-Type header", () => {
    expect(parseContentTypeCharset("text/html; charset=utf-8")).toBe("utf8");
  });

  it("handles charset without quotes", () => {
    expect(parseContentTypeCharset("text/html; charset=iso-8859-1")).toBe(
      "iso-8859-1"
    );
  });

  it("handles uppercase charset", () => {
    expect(parseContentTypeCharset("text/html; CHARSET=UTF-8")).toBe("utf8");
  });

  it("returns undefined when no charset present", () => {
    expect(parseContentTypeCharset("text/html")).toBeUndefined();
  });

  it("handles extra whitespace", () => {
    expect(parseContentTypeCharset("text/html;  charset=utf-8  ")).toBe("utf8");
  });

  it("handles double-quoted charset", () => {
    expect(parseContentTypeCharset('text/html; charset="utf-8"')).toBe("utf8");
  });

  it("handles single-quoted charset", () => {
    expect(parseContentTypeCharset("text/html; charset='iso-8859-1'")).toBe(
      "iso-8859-1"
    );
  });
});

describe("detectCharset", () => {
  const encoder = new TextEncoder();

  describe("HTTP header detection", () => {
    it("detects charset from HTTP header", () => {
      const { buffer } = encoder.encode("<html></html>");
      const result = detectCharset(buffer, "text/html; charset=iso-8859-1");

      expect(result.charset).toBe("iso-8859-1");
      expect(result.source).toBe("http-header");
    });

    it("prioritizes HTTP header over meta charset", () => {
      const html = '<html><head><meta charset="shift_jis"></head></html>';
      const { buffer } = encoder.encode(html);

      const result = detectCharset(buffer, "text/html; charset=utf-8");

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("http-header");
    });
  });

  describe("BOM detection", () => {
    it("detects UTF-8 BOM", () => {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const content = encoder.encode("<html></html>");
      const combined = new Uint8Array([...bom, ...content]);

      const result = detectCharset(combined.buffer);

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("bom");
    });

    it("detects UTF-16 LE BOM", () => {
      const bom = new Uint8Array([0xff, 0xfe]);
      const result = detectCharset(bom.buffer);

      expect(result.charset).toBe("utf-16le");
      expect(result.source).toBe("bom");
    });

    it("detects UTF-16 BE BOM", () => {
      const bom = new Uint8Array([0xfe, 0xff]);
      const result = detectCharset(bom.buffer);

      expect(result.charset).toBe("utf-16be");
      expect(result.source).toBe("bom");
    });

    it("detects UTF-32 LE BOM", () => {
      const bom = new Uint8Array([0xff, 0xfe, 0x00, 0x00]);
      const result = detectCharset(bom.buffer);

      expect(result.charset).toBe("utf-32le");
      expect(result.source).toBe("bom");
    });

    it("detects UTF-32 BE BOM", () => {
      const bom = new Uint8Array([0x00, 0x00, 0xfe, 0xff]);
      const result = detectCharset(bom.buffer);

      expect(result.charset).toBe("utf-32be");
      expect(result.source).toBe("bom");
    });

    it("distinguishes UTF-32 LE from UTF-16 LE", () => {
      // UTF-32 LE BOM: FF FE 00 00
      const utf32le = new Uint8Array([0xff, 0xfe, 0x00, 0x00]);
      const result32 = detectCharset(utf32le.buffer);
      expect(result32.charset).toBe("utf-32le");

      // UTF-16 LE BOM: FF FE (followed by non-null bytes)
      const utf16le = new Uint8Array([0xff, 0xfe, 0x41, 0x00]);
      const result16 = detectCharset(utf16le.buffer);
      expect(result16.charset).toBe("utf-16le");
    });
  });

  describe("meta charset detection", () => {
    it("detects meta charset", () => {
      const html = '<html><head><meta charset="shift_jis"></head></html>';
      const { buffer } = encoder.encode(html);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("shift_jis");
      expect(result.source).toBe("meta-charset");
    });

    it("detects meta http-equiv charset", () => {
      const html =
        '<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252"></head></html>';
      const { buffer } = encoder.encode(html);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("windows-1252");
      expect(result.source).toBe("meta-http-equiv");
    });

    it("detects meta http-equiv charset with reversed attribute order", () => {
      const html =
        '<html><head><meta content="text/html; charset=windows-1252" http-equiv="Content-Type"></head></html>';
      const { buffer } = encoder.encode(html);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("windows-1252");
      expect(result.source).toBe("meta-http-equiv");
    });
  });

  describe("edge cases", () => {
    it("defaults to UTF-8 when no charset found", () => {
      const html = "<html><head><title>Test</title></head></html>";
      const { buffer } = encoder.encode(html);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("default");
    });

    it("handles empty buffer", () => {
      const { buffer } = new Uint8Array(0);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("default");
    });

    it("handles very small buffer (1 byte)", () => {
      const { buffer } = new Uint8Array([0x41]);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("default");
    });

    it("handles very small buffer (2 bytes)", () => {
      const { buffer } = new Uint8Array([0x41, 0x42]);

      const result = detectCharset(buffer);

      expect(result.charset).toBe("utf8");
      expect(result.source).toBe("default");
    });
  });
});

describe("isCharsetSupported", () => {
  it("supports UTF-8", () => {
    expect(isCharsetSupported("utf8")).toBe(true);
  });

  it("supports UTF-16 variants", () => {
    expect(isCharsetSupported("utf-16le")).toBe(true);
    expect(isCharsetSupported("utf-16be")).toBe(true);
  });

  it("supports ISO-8859-1 / Latin1", () => {
    expect(isCharsetSupported("iso-8859-1")).toBe(true);
    expect(isCharsetSupported("latin1")).toBe(true);
  });

  it("supports Windows-1252", () => {
    expect(isCharsetSupported("windows-1252")).toBe(true);
  });

  it("supports CJK charsets via iconv-lite", () => {
    expect(isCharsetSupported("shift_jis")).toBe(true);
    expect(isCharsetSupported("euc-kr")).toBe(true);
    expect(isCharsetSupported("gb2312")).toBe(true);
    expect(isCharsetSupported("big5")).toBe(true);
  });
});

describe("decodeHtml", () => {
  it("decodes UTF-8 content", () => {
    const encoder = new TextEncoder();
    const { buffer } = encoder.encode("Hello World");

    expect(decodeHtml(buffer, "utf8")).toBe("Hello World");
  });

  it("decodes ISO-8859-1 content", () => {
    // ISO-8859-1: byte 0xE9 = é
    const { buffer } = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);

    expect(decodeHtml(buffer, "iso-8859-1")).toBe("café");
  });

  it("decodes Shift_JIS content", () => {
    // Shift_JIS encoding for Japanese text "日本語"
    const shiftJisBytes = new Uint8Array([0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea]);
    const { buffer } = shiftJisBytes;

    expect(decodeHtml(buffer, "shift_jis")).toBe("日本語");
  });

  it("falls back to UTF-8 for invalid charsets", () => {
    const encoder = new TextEncoder();
    const { buffer } = encoder.encode("Hello");

    // Should not throw, falls back to UTF-8
    expect(decodeHtml(buffer, "invalid-charset-xyz")).toBe("Hello");
  });

  it("handles latin1 alias", () => {
    const { buffer } = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    expect(decodeHtml(buffer, "latin1")).toBe("Hello");
  });

  it("decodes Windows-1252 special characters (smart quotes, em-dashes)", () => {
    // Windows-1252 specific characters not in ISO-8859-1:
    // 0x93 = left double quote
    // 0x94 = right double quote
    // 0x97 = em-dash
    // 0x92 = right single quote
    const win1252Bytes = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x97, 0x93, 0x57, 0x6f, 0x72, 0x6c, 0x64,
      0x94,
    ]);
    const { buffer } = win1252Bytes;

    // Expected: Hello—"World" (em-dash + smart quotes)
    const result = decodeHtml(buffer, "windows-1252");
    expect(result).toBe("Hello\u2014\u201CWorld\u201D");
  });

  it("handles empty buffer", () => {
    const { buffer } = new Uint8Array(0);

    expect(decodeHtml(buffer, "utf8")).toBe("");
  });
});
