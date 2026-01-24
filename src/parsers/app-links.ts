import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

export interface AppLinkPlatform {
  url?: string;
  appStoreId?: string;
  appId?: string;
  package?: string;
  class?: string;
  appName?: string;
}

export interface AppLinksWeb {
  url?: string;
  shouldFallback?: boolean;
}

export interface AppLinksData {
  ios?: AppLinkPlatform[];
  iphone?: AppLinkPlatform[];
  ipad?: AppLinkPlatform[];
  android?: AppLinkPlatform[];
  windows?: AppLinkPlatform[];
  windowsPhone?: AppLinkPlatform[];
  windowsUniversal?: AppLinkPlatform[];
  web?: AppLinksWeb[];
}

type PlatformKey =
  | "ios"
  | "iphone"
  | "ipad"
  | "android"
  | "windows"
  | "windowsPhone"
  | "windowsUniversal";

const PLATFORM_MAP: Record<string, PlatformKey> = {
  android: "android",
  ios: "ios",
  ipad: "ipad",
  iphone: "iphone",
  windows: "windows",
  windows_phone: "windowsPhone",
  windows_universal: "windowsUniversal",
};

const PROPERTY_MAP: Record<string, keyof AppLinkPlatform> = {
  app_id: "appId",
  app_name: "appName",
  app_store_id: "appStoreId",
  class: "class",
  package: "package",
  url: "url",
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === "true") {
    return true;
  }
  if (lower === "false") {
    return false;
  }
  return undefined;
};

const hasProperties = (obj: object): boolean => Object.keys(obj).length > 0;

interface TagInfo {
  property: string;
  content: string | undefined;
}

const extractTagInfo = ($: CheerioAPI, tag: AnyNode): TagInfo | null => {
  const property = $(tag).attr("property")?.trim();
  if (!property) {
    return null;
  }
  return { content: $(tag).attr("content")?.trim(), property };
};

interface PlatformParseState {
  results: AppLinkPlatform[];
  currentEntry: AppLinkPlatform;
}

const handlePlatformBoundary = (state: PlatformParseState): void => {
  if (hasProperties(state.currentEntry)) {
    state.results.push(state.currentEntry);
  }
  state.currentEntry = {};
};

const handlePlatformProperty = (
  state: PlatformParseState,
  mappedKey: keyof AppLinkPlatform,
  content: string
): void => {
  if (state.currentEntry[mappedKey] !== undefined) {
    state.results.push(state.currentEntry);
    state.currentEntry = {};
  }
  state.currentEntry[mappedKey] = content;
};

const processPlatformTag = (
  state: PlatformParseState,
  tagInfo: TagInfo,
  prefix: string
): void => {
  if (tagInfo.property === prefix) {
    handlePlatformBoundary(state);
    return;
  }

  const propertyName = tagInfo.property.slice(prefix.length + 1);
  const mappedKey = PROPERTY_MAP[propertyName];

  if (mappedKey && tagInfo.content) {
    handlePlatformProperty(state, mappedKey, tagInfo.content);
  }
};

/**
 * Parse all App Links meta tags and group them by platform.
 * According to the App Links spec, multiple values per platform are supported
 * by using a `<meta property="al:{platform}" />` tag to start a new entry,
 * or simply by having multiple tags with the same property in document order.
 */
const parsePlatformArray = (
  $: CheerioAPI,
  platform: string
): AppLinkPlatform[] => {
  const prefix = `al:${platform}`;
  const metaTags = $(`meta[property^="${prefix}"]`).toArray();
  const state: PlatformParseState = { currentEntry: {}, results: [] };

  for (const tag of metaTags) {
    const tagInfo = extractTagInfo($, tag);
    if (tagInfo) {
      processPlatformTag(state, tagInfo, prefix);
    }
  }

  if (hasProperties(state.currentEntry)) {
    state.results.push(state.currentEntry);
  }

  return state.results;
};

interface WebParseState {
  results: AppLinksWeb[];
  currentEntry: AppLinksWeb;
}

const handleWebBoundary = (state: WebParseState): void => {
  if (hasProperties(state.currentEntry)) {
    state.results.push(state.currentEntry);
  }
  state.currentEntry = {};
};

const handleWebUrl = (state: WebParseState, content: string): void => {
  if (state.currentEntry.url !== undefined) {
    state.results.push(state.currentEntry);
    state.currentEntry = {};
  }
  state.currentEntry.url = content;
};

const handleWebShouldFallback = (
  state: WebParseState,
  content: string | undefined
): void => {
  const boolValue = parseBoolean(content);
  if (boolValue === undefined) {
    return;
  }
  if (state.currentEntry.shouldFallback !== undefined) {
    state.results.push(state.currentEntry);
    state.currentEntry = {};
  }
  state.currentEntry.shouldFallback = boolValue;
};

const processWebTag = (state: WebParseState, tagInfo: TagInfo): void => {
  const prefix = "al:web";

  if (tagInfo.property === prefix) {
    handleWebBoundary(state);
    return;
  }

  const propertyName = tagInfo.property.slice(prefix.length + 1);

  if (propertyName === "url" && tagInfo.content) {
    handleWebUrl(state, tagInfo.content);
  } else if (propertyName === "should_fallback") {
    handleWebShouldFallback(state, tagInfo.content);
  }
};

const parseWebPlatformArray = ($: CheerioAPI): AppLinksWeb[] => {
  const metaTags = $('meta[property^="al:web"]').toArray();
  const state: WebParseState = { currentEntry: {}, results: [] };

  for (const tag of metaTags) {
    const tagInfo = extractTagInfo($, tag);
    if (tagInfo) {
      processWebTag(state, tagInfo);
    }
  }

  if (hasProperties(state.currentEntry)) {
    state.results.push(state.currentEntry);
  }

  return state.results;
};

export const parseAppLinks = ($: CheerioAPI): AppLinksData => {
  const result: AppLinksData = {};

  for (const [alPlatform, key] of Object.entries(PLATFORM_MAP)) {
    const platformData = parsePlatformArray($, alPlatform);
    if (platformData.length > 0) {
      result[key] = platformData;
    }
  }

  const webData = parseWebPlatformArray($);
  if (webData.length > 0) {
    result.web = webData;
  }

  return result;
};
