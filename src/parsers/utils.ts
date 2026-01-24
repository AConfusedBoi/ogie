import type { CheerioAPI } from "cheerio";

/** Get meta content by name attribute */
export const getMetaContent = (
  $: CheerioAPI,
  name: string
): string | undefined => {
  const content = $(`meta[name="${name}"]`).attr("content")?.trim();
  return content || undefined;
};

/** Get meta content by name OR property attribute (for Twitter fallback) */
export const getMetaContentAny = (
  $: CheerioAPI,
  name: string
): string | undefined => {
  const content =
    $(`meta[name="${name}"]`).attr("content")?.trim() ||
    $(`meta[property="${name}"]`).attr("content")?.trim();
  return content || undefined;
};
