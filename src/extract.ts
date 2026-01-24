import { load, type CheerioAPI } from "cheerio";

import type {
  ExtractOptions,
  ExtractResult,
  Metadata,
  OEmbedData,
  OEmbedDiscovery,
} from "./types";

import { generateCacheKey, type MetadataCache } from "./cache";
import { OgieError, ParseError } from "./errors";
import { fetchUrl } from "./fetch";
import { parseAppLinks } from "./parsers/app-links";
import { parseArticle } from "./parsers/article";
import { parseBasicMeta } from "./parsers/basic";
import { parseDublinCore } from "./parsers/dublin-core";
import { parseJsonLd } from "./parsers/jsonld";
import {
  hasOEmbedDiscovery,
  parseOEmbedDiscovery,
  parseOEmbedResponse,
} from "./parsers/oembed";
import { parseOpenGraph } from "./parsers/opengraph";
import { parseTwitterCard } from "./parsers/twitter";
import { isPrivateUrl, isValidUrl } from "./utils/url";

const HTML_INPUT_URL = "html-input";

const createFailure = (error: OgieError): ExtractResult => ({
  error,
  success: false,
});

const createSuccess = (data: Metadata): ExtractResult => ({
  data,
  success: true,
});

interface ParsedHtml {
  $: CheerioAPI;
  appLinks: ReturnType<typeof parseAppLinks>;
  article: ReturnType<typeof parseArticle>;
  basic: ReturnType<typeof parseBasicMeta>;
  dublinCore: ReturnType<typeof parseDublinCore>;
  jsonLd: ReturnType<typeof parseJsonLd>;
  oEmbedDiscovery: OEmbedDiscovery;
  og: ReturnType<typeof parseOpenGraph>;
  twitter: ReturnType<typeof parseTwitterCard>;
}

const parseHtml = (html: string, baseUrl?: string): ParsedHtml => {
  const $ = load(html);
  return {
    $,
    appLinks: parseAppLinks($),
    article: parseArticle($),
    basic: parseBasicMeta($, baseUrl),
    dublinCore: parseDublinCore($),
    jsonLd: parseJsonLd($),
    oEmbedDiscovery: parseOEmbedDiscovery($),
    og: parseOpenGraph($, baseUrl),
    twitter: parseTwitterCard($, baseUrl),
  };
};

const applyFallbacks = (
  og: Metadata["og"],
  twitter: Metadata["twitter"],
  basic: Metadata["basic"],
  skip: boolean
) => {
  if (skip) {
    return og;
  }
  return {
    ...og,
    description: og.description ?? twitter.description ?? basic.description,
    title: og.title ?? twitter.title ?? basic.title,
  };
};

const wrapError = (error: unknown, url: string): OgieError => {
  if (error instanceof OgieError) {
    return error;
  }
  const message = error instanceof Error ? error.message : "Extraction failed";
  const cause = error instanceof Error ? error : undefined;
  return new ParseError(message, url, cause);
};

const hasData = (obj: object): boolean =>
  Object.values(obj).some((v) => v !== undefined);

interface BuildMetadataFromParsedOptions {
  parsed: ParsedHtml;
  requestUrl: string;
  finalUrl: string;
  options?: ExtractOptions;
  statusCode?: number;
  contentType?: string;
  charset?: string;
  oEmbed?: OEmbedData;
}

const buildMetadataFromParsed = ({
  parsed,
  requestUrl,
  finalUrl,
  options,
  statusCode,
  contentType,
  charset,
  oEmbed,
}: BuildMetadataFromParsedOptions): Metadata => {
  const {
    og,
    twitter,
    basic,
    dublinCore,
    article,
    appLinks,
    jsonLd,
    oEmbedDiscovery,
  } = parsed;
  const ogWithFallbacks = applyFallbacks(
    og,
    twitter,
    basic,
    options?.onlyOpenGraph ?? false
  );
  return {
    appLinks: hasData(appLinks) ? appLinks : undefined,
    article: hasData(article) ? article : undefined,
    basic,
    charset,
    contentType,
    dublinCore: hasData(dublinCore) ? dublinCore : undefined,
    finalUrl,
    jsonLd: jsonLd.items.length > 0 ? jsonLd : undefined,
    oEmbed,
    oEmbedDiscovery: hasData(oEmbedDiscovery) ? oEmbedDiscovery : undefined,
    og: ogWithFallbacks,
    requestUrl,
    statusCode,
    twitter,
  };
};

interface BuildMetadataOptions {
  html: string;
  requestUrl: string;
  finalUrl: string;
  options?: ExtractOptions;
  statusCode?: number;
  contentType?: string;
  charset?: string;
  oEmbed?: OEmbedData;
}

const buildMetadata = ({
  html,
  requestUrl,
  finalUrl,
  options,
  statusCode,
  contentType,
  charset,
  oEmbed,
}: BuildMetadataOptions): Metadata => {
  const parsed = parseHtml(html, finalUrl);
  return buildMetadataFromParsed({
    charset,
    contentType,
    finalUrl,
    oEmbed,
    options,
    parsed,
    requestUrl,
    statusCode,
  });
};

/** Extract metadata from an HTML string */
export const extractFromHtml = (
  html: string,
  options?: ExtractOptions
): ExtractResult => {
  const baseUrl = options?.baseUrl ?? "";
  const requestUrl = baseUrl || HTML_INPUT_URL;

  try {
    return createSuccess(
      buildMetadata({
        finalUrl: requestUrl,
        html,
        options,
        requestUrl,
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse HTML";
    const cause = error instanceof Error ? error : undefined;
    return createFailure(new ParseError(message, requestUrl, cause));
  }
};

const DEFAULT_OEMBED_USER_AGENT =
  "ogie/1.0 (+https://github.com/dobroslavradosavljevic/ogie)";

/**
 * Validate oEmbed endpoint URL for SSRF protection
 * Returns true if the URL is safe to fetch
 */
const isValidOEmbedEndpoint = (
  endpoint: string,
  allowPrivateUrls: boolean
): boolean => {
  // Must be valid HTTP/HTTPS URL
  if (!isValidUrl(endpoint)) {
    return false;
  }

  // Check for private/internal URLs unless allowed
  if (!allowPrivateUrls && isPrivateUrl(endpoint)) {
    return false;
  }

  return true;
};

interface OEmbedFetchResult {
  data?: OEmbedData;
  error?: string;
}

const createOEmbedErrorResult = (message: string): OEmbedFetchResult => ({
  error: message,
});

const parseOEmbedFromResponse = async (
  response: Response
): Promise<OEmbedFetchResult> => {
  if (!response.ok) {
    return createOEmbedErrorResult(
      `oEmbed fetch failed with status ${response.status}`
    );
  }

  const json: unknown = await response.json();
  const data = parseOEmbedResponse(json);

  return data
    ? { data }
    : createOEmbedErrorResult("Failed to parse oEmbed response");
};

const executeOEmbedFetch = async (
  endpoint: string,
  options?: ExtractOptions
): Promise<OEmbedFetchResult> => {
  const controller = new AbortController();
  const timeout = options?.timeout ?? 10_000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": options?.userAgent ?? DEFAULT_OEMBED_USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return parseOEmbedFromResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : "Unknown error";
    return createOEmbedErrorResult(`oEmbed fetch error: ${message}`);
  }
};

/**
 * Fetch oEmbed data from discovered endpoint with SSRF protection
 * Uses the already-parsed oEmbedDiscovery to avoid double HTML parsing
 */
const fetchOEmbedData = (
  discovery: OEmbedDiscovery,
  options?: ExtractOptions
): Promise<OEmbedFetchResult> => {
  const endpoint = discovery.jsonUrl;
  if (!endpoint) {
    return Promise.resolve(
      createOEmbedErrorResult("No JSON oEmbed endpoint discovered")
    );
  }

  const allowPrivateUrls = options?.allowPrivateUrls ?? false;
  if (!isValidOEmbedEndpoint(endpoint, allowPrivateUrls)) {
    return Promise.resolve(
      createOEmbedErrorResult(
        "Invalid oEmbed endpoint: URL must be HTTP/HTTPS and not point to private network"
      )
    );
  }

  return executeOEmbedFetch(endpoint, options);
};

const maybeOEmbedData = async (
  parsed: ParsedHtml,
  options?: ExtractOptions
): Promise<OEmbedData | undefined> => {
  if (!options?.fetchOEmbed || !hasOEmbedDiscovery(parsed.oEmbedDiscovery)) {
    return undefined;
  }
  const result = await fetchOEmbedData(parsed.oEmbedDiscovery, options);
  return result.data;
};

const extractWithFetch = async (
  url: string,
  options?: ExtractOptions
): Promise<ExtractResult> => {
  const { html, finalUrl, statusCode, contentType, charset } = await fetchUrl(
    url,
    options
  );
  const parsed = parseHtml(html, finalUrl);
  const oEmbed = await maybeOEmbedData(parsed, options);

  return createSuccess(
    buildMetadataFromParsed({
      charset,
      contentType,
      finalUrl,
      oEmbed,
      options,
      parsed,
      requestUrl: url,
      statusCode,
    })
  );
};

/**
 * Get the cache instance from options
 * Returns undefined if caching is disabled
 */
const getCache = (options?: ExtractOptions): MetadataCache | undefined => {
  if (options?.cache === false) {
    return undefined;
  }
  return options?.cache;
};

/**
 * Try to get cached result
 * Returns undefined if cache miss or caching disabled
 */
const getCachedResult = (
  url: string,
  options?: ExtractOptions
): Metadata | undefined => {
  if (options?.bypassCache) {
    return undefined;
  }

  const cache = getCache(options);
  if (!cache) {
    return undefined;
  }

  const cacheKey = generateCacheKey(url, options);
  return cache.get(cacheKey);
};

/**
 * Store result in cache if caching is enabled
 */
const cacheResult = (
  url: string,
  metadata: Metadata,
  options?: ExtractOptions
): void => {
  const cache = getCache(options);
  if (!cache) {
    return;
  }

  const cacheKey = generateCacheKey(url, options);
  cache.set(cacheKey, metadata);
};

const performExtraction = async (
  url: string,
  options?: ExtractOptions
): Promise<ExtractResult> => {
  const result = await extractWithFetch(url, options);

  if (result.success) {
    cacheResult(url, result.data, options);
  }

  return result;
};

/** Extract metadata from a URL */
export const extract = async (
  url: string,
  options?: ExtractOptions
): Promise<ExtractResult> => {
  if (!isValidUrl(url)) {
    return createFailure(
      new OgieError(
        "Invalid URL: must be a valid HTTP or HTTPS URL",
        "INVALID_URL",
        url
      )
    );
  }

  const cachedMetadata = getCachedResult(url, options);
  if (cachedMetadata) {
    return createSuccess(cachedMetadata);
  }

  try {
    return await performExtraction(url, options);
  } catch (error) {
    return createFailure(wrapError(error, url));
  }
};
