import type { ExtractOptions } from "./types";

import { FetchError, OgieError } from "./errors";
import { decodeHtml, detectCharset } from "./utils/encoding";
import { isPrivateUrl, isValidUrl } from "./utils/url";

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT =
  "ogie/1.0 (+https://github.com/dobroslavradosavljevic/ogie)";
const DEFAULT_ACCEPT = "text/html,application/xhtml+xml";

interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  charset?: string;
}

interface FetchContext {
  timeout: number;
  maxRedirects: number;
  headers: Headers;
  originalUrl: string;
  allowPrivateUrls: boolean;
  convertCharset: boolean;
}

const isHtmlContentType = (contentType: string): boolean => {
  const type = contentType.toLowerCase();
  return type.includes("text/html") || type.includes("application/xhtml+xml");
};

const buildHeaders = (options?: ExtractOptions): Headers => {
  const headers = new Headers({
    Accept: DEFAULT_ACCEPT,
    "User-Agent": options?.userAgent ?? DEFAULT_USER_AGENT,
  });

  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }

  return headers;
};

const handleFetchError = (
  error: unknown,
  url: string,
  timeout: number
): never => {
  if (error instanceof Error && error.name === "AbortError") {
    throw new FetchError(
      `Request timeout after ${timeout}ms`,
      url,
      undefined,
      error
    );
  }

  const message =
    error instanceof Error ? error.message : "Network request failed";
  const cause = error instanceof Error ? error : undefined;
  throw new FetchError(message, url, undefined, cause);
};

const validateResponse = (
  response: Response,
  url: string
): { statusCode: number; contentType: string } => {
  const statusCode = response.status;

  if (!response.ok) {
    throw new FetchError(
      `HTTP ${statusCode}: ${response.statusText}`,
      url,
      statusCode
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!isHtmlContentType(contentType)) {
    throw new FetchError(
      `Expected HTML content, received: ${contentType}`,
      url
    );
  }

  return { contentType, statusCode };
};

const performFetch = async (
  url: string,
  ctx: FetchContext
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ctx.timeout);

  try {
    const response = await fetch(url, {
      headers: ctx.headers,
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    return handleFetchError(error, url, ctx.timeout);
  }
};

const getRedirectUrl = (
  response: Response,
  currentUrl: string,
  allowPrivateUrls: boolean
): string | null => {
  const statusCode = response.status;
  const isRedirect = statusCode >= 300 && statusCode < 400;

  if (!isRedirect) {
    return null;
  }

  const location = response.headers.get("location");

  if (!location) {
    throw new FetchError(
      "Redirect response without Location header",
      currentUrl
    );
  }

  const redirectUrl = new URL(location, currentUrl).href;

  // Validate redirect URL before following (SSRF protection)
  validateUrl(redirectUrl, allowPrivateUrls);

  return redirectUrl;
};

const validateUrl = (url: string, allowPrivateUrls: boolean): void => {
  if (!isValidUrl(url)) {
    throw new OgieError(
      `Invalid URL: must be a valid HTTP or HTTPS URL`,
      "INVALID_URL",
      url
    );
  }

  if (!allowPrivateUrls && isPrivateUrl(url)) {
    throw new OgieError(
      `URL points to a private/internal network address`,
      "INVALID_URL",
      url
    );
  }
};

const createContext = (
  url: string,
  options?: ExtractOptions
): FetchContext => ({
  allowPrivateUrls: options?.allowPrivateUrls ?? false,
  convertCharset: options?.convertCharset ?? false,
  headers: buildHeaders(options),
  maxRedirects: options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
  originalUrl: url,
  timeout: options?.timeout ?? DEFAULT_TIMEOUT,
});

/**
 * Build result with simple text decoding (default behavior)
 */
const buildSimpleResult = async (
  response: Response,
  finalUrl: string,
  contentType: string,
  statusCode: number
): Promise<FetchResult> => {
  const html = await response.text();
  return { contentType, finalUrl, html, statusCode };
};

/**
 * Build result with charset detection and conversion
 */
const buildCharsetResult = async (
  response: Response,
  finalUrl: string,
  contentType: string,
  statusCode: number
): Promise<FetchResult> => {
  const buffer = await response.arrayBuffer();
  const { charset } = detectCharset(buffer, contentType);
  const html = decodeHtml(buffer, charset);
  return { charset, contentType, finalUrl, html, statusCode };
};

const buildResult = async (
  response: Response,
  finalUrl: string,
  convertCharset: boolean
): Promise<FetchResult> => {
  const { contentType, statusCode } = validateResponse(response, finalUrl);

  if (convertCharset) {
    return await buildCharsetResult(
      response,
      finalUrl,
      contentType,
      statusCode
    );
  }
  return await buildSimpleResult(response, finalUrl, contentType, statusCode);
};

/** Follow redirects and return the final response */
const followRedirects = async (
  startUrl: string,
  ctx: FetchContext
): Promise<{ response: Response; finalUrl: string }> => {
  let currentUrl = startUrl;

  for (let i = 0; i <= ctx.maxRedirects; i += 1) {
    const response = await performFetch(currentUrl, ctx);
    const redirectUrl = getRedirectUrl(
      response,
      currentUrl,
      ctx.allowPrivateUrls
    );

    if (!redirectUrl) {
      return { finalUrl: currentUrl, response };
    }
    currentUrl = redirectUrl;
  }

  throw new FetchError(
    `Maximum redirects (${ctx.maxRedirects}) exceeded`,
    startUrl
  );
};

export const fetchUrl = async (
  url: string,
  options?: ExtractOptions
): Promise<FetchResult> => {
  const ctx = createContext(url, options);
  validateUrl(url, ctx.allowPrivateUrls);

  const { finalUrl, response } = await followRedirects(url, ctx);
  return buildResult(response, finalUrl, ctx.convertCharset);
};
