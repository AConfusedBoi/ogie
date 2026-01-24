import type { CheerioAPI } from "cheerio";

export interface JsonLdPerson {
  type: "Person";
  name?: string;
  url?: string;
}

export interface JsonLdOrganization {
  type: "Organization";
  name?: string;
  url?: string;
  logo?: string;
}

export interface JsonLdItem {
  type?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  datePublished?: string;
  dateModified?: string;
  author?: JsonLdPerson | JsonLdPerson[];
  publisher?: JsonLdOrganization | JsonLdPerson;
  [key: string]: unknown;
}

export interface JsonLdData {
  items: JsonLdItem[];
  raw: unknown[];
}

interface ImageObject {
  url?: string;
  "@id"?: string;
}

interface RawJsonLd {
  "@context"?: string | string[] | Record<string, unknown>;
  "@type"?: string | string[];
  "@id"?: string;
  "@graph"?: RawJsonLd[];
  name?: string;
  headline?: string;
  description?: string;
  image?: string | string[] | ImageObject | ImageObject[];
  thumbnailUrl?: string;
  url?: string;
  datePublished?: string;
  dateModified?: string;
  author?:
    | string
    | { "@type"?: string; "@id"?: string; name?: string; url?: string }
    | Array<
        | string
        | { "@type"?: string; "@id"?: string; name?: string; url?: string }
      >;
  publisher?: {
    "@type"?: string;
    "@id"?: string;
    name?: string;
    url?: string;
    logo?: string | { url?: string; "@id"?: string };
  };
  keywords?: string | string[];
  mainEntityOfPage?: string | { "@type"?: string; "@id"?: string };
  sameAs?: string | string[];
  [key: string]: unknown;
}

type IdMap = Map<string, RawJsonLd>;

const buildIdMap = (items: RawJsonLd[]): IdMap => {
  const map = new Map<string, RawJsonLd>();
  for (const item of items) {
    const id = item["@id"];
    if (id) {
      map.set(id, item);
    }
  }
  return map;
};

const isIdReference = (val: unknown): val is { "@id": string } => {
  if (typeof val !== "object" || val === null) {
    return false;
  }
  const keys = Object.keys(val);
  return keys.length === 1 && "@id" in val;
};

const resolveReference = <T>(
  val: T | { "@id": string },
  idMap: IdMap
): T | RawJsonLd => {
  if (isIdReference(val)) {
    const resolved = idMap.get(val["@id"]);
    if (resolved) {
      return resolved;
    }
  }
  return val as T;
};

const parseJsonSafe = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const SCHEMA_ORG_PREFIXES = [
  "https://schema.org/",
  "http://schema.org/",
  "schema:",
];

const stripSchemaPrefix = (type: string): string => {
  for (const prefix of SCHEMA_ORG_PREFIXES) {
    if (type.startsWith(prefix)) {
      return type.slice(prefix.length);
    }
  }
  return type;
};

const normalizeType = (
  rawType: string | string[] | undefined
): string | string[] | undefined => {
  if (!rawType) {
    return undefined;
  }
  if (Array.isArray(rawType)) {
    return rawType.map(stripSchemaPrefix);
  }
  return stripSchemaPrefix(rawType);
};

const extractImageUrl = (img: string | ImageObject): string | undefined => {
  if (typeof img === "string") {
    return img || undefined;
  }
  return img.url ?? img["@id"] ?? undefined;
};

const normalizeImageArray = (
  rawImages: (string | ImageObject)[]
): string[] | undefined => {
  const images: string[] = [];
  for (const img of rawImages) {
    const url = extractImageUrl(img);
    if (url) {
      images.push(url);
    }
  }
  return images.length > 0 ? images : undefined;
};

const normalizeImage = (
  rawImage: string | string[] | ImageObject | ImageObject[] | undefined
): string | string[] | undefined => {
  if (!rawImage) {
    return undefined;
  }
  if (typeof rawImage === "string") {
    return rawImage || undefined;
  }
  if (Array.isArray(rawImage)) {
    return normalizeImageArray(rawImage);
  }
  return rawImage.url ?? rawImage["@id"] ?? undefined;
};

const normalizePerson = (
  raw: string | { "@type"?: string; name?: string; url?: string }
): JsonLdPerson | undefined => {
  if (typeof raw === "string") {
    return { name: raw, type: "Person" };
  }

  // Explicitly check type - if it's Organization, it's not a Person
  if (raw["@type"] === "Organization") {
    return undefined;
  }

  // If explicitly Person or no @type but has name, treat as Person
  if (raw["@type"] === "Person" || (!raw["@type"] && raw.name)) {
    return {
      name: raw.name,
      type: "Person",
      url: raw.url,
    };
  }

  return undefined;
};

const normalizeAuthor = (
  rawAuthor:
    | string
    | { "@type"?: string; "@id"?: string; name?: string; url?: string }
    | Array<
        | string
        | { "@type"?: string; "@id"?: string; name?: string; url?: string }
      >
    | undefined,
  idMap: IdMap
): JsonLdPerson | JsonLdPerson[] | undefined => {
  if (!rawAuthor) {
    return undefined;
  }
  if (Array.isArray(rawAuthor)) {
    const persons = rawAuthor
      .map((a) => {
        if (typeof a === "string") {
          return normalizePerson(a);
        }
        const resolved = resolveReference(a, idMap);
        return normalizePerson(
          resolved as { "@type"?: string; name?: string; url?: string }
        );
      })
      .filter((p): p is JsonLdPerson => p !== undefined);
    return persons.length > 0 ? persons : undefined;
  }
  if (typeof rawAuthor === "string") {
    return normalizePerson(rawAuthor);
  }
  const resolved = resolveReference(rawAuthor, idMap);
  return normalizePerson(
    resolved as { "@type"?: string; name?: string; url?: string }
  );
};

const normalizePublisher = (
  rawPublisher:
    | {
        "@type"?: string;
        "@id"?: string;
        name?: string;
        url?: string;
        logo?: string | { url?: string; "@id"?: string };
      }
    | undefined,
  idMap: IdMap
): JsonLdOrganization | JsonLdPerson | undefined => {
  if (!rawPublisher) {
    return undefined;
  }

  // Resolve @id reference if present
  const resolved = resolveReference(rawPublisher, idMap) as {
    "@type"?: string;
    name?: string;
    url?: string;
    logo?: string | { url?: string; "@id"?: string };
  };

  // Handle Person publisher
  if (resolved["@type"] === "Person") {
    return {
      name: resolved.name,
      type: "Person",
      url: resolved.url,
    };
  }

  // Handle Organization publisher (default)
  const logo =
    typeof resolved.logo === "string"
      ? resolved.logo
      : (resolved.logo?.url ?? resolved.logo?.["@id"]);
  return {
    logo,
    name: resolved.name,
    type: "Organization",
    url: resolved.url,
  };
};

const KNOWN_FIELDS = new Set([
  "name",
  "description",
  "image",
  "url",
  "datePublished",
  "dateModified",
  "author",
  "publisher",
]);

const copyAdditionalProperties = (item: JsonLdItem, raw: RawJsonLd): void => {
  for (const key of Object.keys(raw)) {
    if (!key.startsWith("@") && !KNOWN_FIELDS.has(key)) {
      item[key] = raw[key];
    }
  }
};

const normalizeBasicFields = (
  raw: RawJsonLd
): Pick<
  JsonLdItem,
  "type" | "name" | "description" | "url" | "datePublished" | "dateModified"
> => ({
  dateModified: raw.dateModified,
  datePublished: raw.datePublished,
  description: raw.description,
  name: raw.name ?? raw.headline,
  type: normalizeType(raw["@type"]),
  url: raw.url,
});

const normalizeItem = (raw: RawJsonLd, idMap: IdMap): JsonLdItem => {
  const basicFields = normalizeBasicFields(raw);
  const image = normalizeImage(raw.image);
  const author = normalizeAuthor(raw.author, idMap);
  const publisher = normalizePublisher(raw.publisher, idMap);

  const item: JsonLdItem = {
    ...basicFields,
    ...(image && { image }),
    ...(author && { author }),
    ...(publisher && { publisher }),
  };

  copyAdditionalProperties(item, raw);
  return item;
};

const extractFromGraph = (graph: RawJsonLd[]): RawJsonLd[] =>
  graph.flatMap((item) => extractItems(item));

const extractFromArray = (arr: unknown[]): RawJsonLd[] =>
  arr.flatMap((item) => extractItems(item));

const extractItems = (parsed: unknown): RawJsonLd[] => {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const obj = parsed as RawJsonLd;

  if (Array.isArray(obj["@graph"])) {
    return extractFromGraph(obj["@graph"]);
  }

  if (Array.isArray(parsed)) {
    return extractFromArray(parsed);
  }

  return obj["@type"] ? [obj] : [];
};

const processJsonLdScript = (
  text: string,
  raw: unknown[],
  items: JsonLdItem[]
): void => {
  const parsed = parseJsonSafe(text);
  if (parsed === undefined) {
    return;
  }

  raw.push(parsed);

  const extractedItems = extractItems(parsed);
  const idMap = buildIdMap(extractedItems);
  for (const item of extractedItems) {
    items.push(normalizeItem(item, idMap));
  }
};

export const parseJsonLd = ($: CheerioAPI): JsonLdData => {
  const raw: unknown[] = [];
  const items: JsonLdItem[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).text();
    if (text) {
      processJsonLdScript(text, raw, items);
    }
  });

  return { items, raw };
};
