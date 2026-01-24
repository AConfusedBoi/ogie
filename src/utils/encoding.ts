/**
 * Charset detection and conversion utilities using iconv-lite
 */
import iconv from "iconv-lite";

export type CharsetSource =
  | "http-header"
  | "meta-charset"
  | "meta-http-equiv"
  | "bom"
  | "default";

export interface CharsetInfo {
  charset: string;
  source: CharsetSource;
}

const DEFAULT_CHARSET = "utf8";

/**
 * Maximum bytes to scan for meta charset detection (performance optimization)
 */
const META_SCAN_LIMIT = 2048;

/**
 * Normalize charset name (e.g., "utf-8" -> "utf8")
 */
const normalizeCharset = (charset: string): string => {
  const normalized = charset.toLowerCase().trim();
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  if (normalized === "utf-8") {
    return "utf8";
  }
  return normalized;
};

/**
 * Extract charset from Content-Type header
 * e.g., "text/html; charset=utf-8" -> "utf8"
 * Handles quoted values like charset="utf-8" or charset='utf-8'
 */
export const parseContentTypeCharset = (
  contentType: string
): string | undefined => {
  const match = /charset=["']?([^"'\s;]+)/i.exec(contentType);
  if (!match?.[1]) {
    return undefined;
  }
  return normalizeCharset(match[1]);
};

/**
 * BOM signatures ordered by length (longest first to avoid collision)
 * UTF-32 LE (FF FE 00 00) must be checked before UTF-16 LE (FF FE)
 */
const BOM_SIGNATURES: { bytes: number[]; charset: string }[] = [
  { bytes: [0xEF, 0xBB, 0xBF], charset: "utf8" },
  { bytes: [0xFF, 0xFE, 0x00, 0x00], charset: "utf-32le" },
  { bytes: [0x00, 0x00, 0xFE, 0xFF], charset: "utf-32be" },
  { bytes: [0xFF, 0xFE], charset: "utf-16le" },
  { bytes: [0xFE, 0xFF], charset: "utf-16be" },
];

/**
 * Check if buffer starts with given BOM signature
 */
const matchesBom = (bytes: Uint8Array, signature: number[]): boolean => {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[index] === byte);
};

/**
 * Detect BOM (Byte Order Mark) in buffer
 * Checks UTF-32 before UTF-16 to avoid BOM collision (UTF-32 LE starts with FF FE)
 */
const detectBom = (bytes: Uint8Array): string | undefined => {
  if (bytes.length < 2) {
    return undefined;
  }

  for (const { bytes: signature, charset } of BOM_SIGNATURES) {
    if (matchesBom(bytes, signature)) {
      return charset;
    }
  }

  return undefined;
};

interface MetaCharsetResult {
  charset: string;
  source: "meta-charset" | "meta-http-equiv";
}

/**
 * Extract charset from HTML meta tags using simple regex
 * Works on raw bytes decoded as latin1 for ASCII compatibility
 * Returns both the charset and the source (meta-charset or meta-http-equiv)
 */
const detectHtmlMetaCharset = (html: string): MetaCharsetResult | undefined => {
  // Check http-equiv patterns first (they also contain "charset=" but inside content attribute)
  // Pattern 1: http-equiv comes before content
  const httpEquivMatch =
    /<meta[^>]+http-equiv=["']?Content-Type["']?[^>]+content=["']?[^"']*charset=([^"'\s;>]+)/i.exec(
      html
    );
  if (httpEquivMatch?.[1]) {
    return {
      charset: normalizeCharset(httpEquivMatch[1]),
      source: "meta-http-equiv",
    };
  }

  // Pattern 2: content comes before http-equiv (reversed order)
  const reversedHttpEquivMatch =
    /<meta[^>]+content=["']?[^"']*charset=([^"'\s;>]+)[^>]+http-equiv=["']?Content-Type["']?/i.exec(
      html
    );
  if (reversedHttpEquivMatch?.[1]) {
    return {
      charset: normalizeCharset(reversedHttpEquivMatch[1]),
      source: "meta-http-equiv",
    };
  }

  // Look for <meta charset="..."> - simple form without http-equiv
  // This must exclude matches where charset is inside a content attribute
  const charsetMatch = /<meta\s+charset=["']?([^"'\s>]+)/i.exec(html);
  if (charsetMatch?.[1]) {
    return {
      charset: normalizeCharset(charsetMatch[1]),
      source: "meta-charset",
    };
  }

  return undefined;
};

/**
 * Detect charset from HTTP header
 */
const detectFromHeader = (
  contentTypeHeader?: string
): CharsetInfo | undefined => {
  if (!contentTypeHeader) {
    return undefined;
  }
  const charset = parseContentTypeCharset(contentTypeHeader);
  if (charset) {
    return { charset, source: "http-header" };
  }
  return undefined;
};

/**
 * Detect charset from HTML meta tags
 */
const detectFromMeta = (latin1Html: string): CharsetInfo | undefined => {
  const result = detectHtmlMetaCharset(latin1Html);
  if (!result) {
    return undefined;
  }
  return { charset: result.charset, source: result.source };
};

/**
 * Detect charset from BOM or HTML meta tags in buffer content
 * Limits meta tag scanning to first META_SCAN_LIMIT bytes for performance
 */
const detectFromContent = (buffer: ArrayBuffer): CharsetInfo | undefined => {
  const bytes = new Uint8Array(buffer);

  // Check for BOM first
  const bomCharset = detectBom(bytes);
  if (bomCharset) {
    return { charset: bomCharset, source: "bom" };
  }

  // Limit scanning to first META_SCAN_LIMIT bytes for performance on large documents
  const scanLength = Math.min(buffer.byteLength, META_SCAN_LIMIT);
  const scanBuffer = buffer.slice(0, scanLength);

  try {
    const latin1 = iconv.decode(Buffer.from(scanBuffer), "latin1");
    return detectFromMeta(latin1);
  } catch {
    // If decode fails, return undefined to fall back to default charset
    return undefined;
  }
};

/**
 * Detect charset from buffer and optional HTTP header
 */
export const detectCharset = (
  buffer: ArrayBuffer,
  contentTypeHeader?: string
): CharsetInfo => {
  // 1. Check HTTP Content-Type header first
  const headerResult = detectFromHeader(contentTypeHeader);
  if (headerResult) {
    return headerResult;
  }

  // 2. Check content (BOM and meta tags)
  const contentResult = detectFromContent(buffer);
  if (contentResult) {
    return contentResult;
  }

  // 3. Default to UTF-8
  return { charset: DEFAULT_CHARSET, source: "default" };
};

/**
 * Check if charset is supported by iconv-lite
 */
export const isCharsetSupported = (charset: string): boolean =>
  iconv.encodingExists(charset);

/**
 * Decode buffer to string with specified charset using iconv-lite
 * Falls back to UTF-8 if charset is not supported or decode fails
 */
export const decodeHtml = (buffer: ArrayBuffer, charset: string): string => {
  const buf = Buffer.from(buffer);

  try {
    if (iconv.encodingExists(charset)) {
      return iconv.decode(buf, charset);
    }
  } catch {
    // Fall through to UTF-8 fallback
  }

  // Fall back to UTF-8 if charset not supported or decode failed
  try {
    return iconv.decode(buf, "utf8");
  } catch {
    // If even UTF-8 decode fails, return empty string
    return "";
  }
};
