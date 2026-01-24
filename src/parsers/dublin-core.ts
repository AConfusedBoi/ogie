import type { CheerioAPI } from "cheerio";

/**
 * Dublin Core metadata extracted from HTML.
 *
 * This interface includes the 15 core Dublin Core Metadata Element Set (DCMES) fields
 * plus commonly used DCTERMS extensions.
 *
 * **Core DC Elements (DCMES 1.1):**
 * contributor, coverage, creator, date, description, format, identifier,
 * language, publisher, relation, rights, source, subject, title, type
 *
 * **DCTERMS Extensions:**
 * - `audience` - A class of agents for whom the resource is intended
 *
 * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 */
export interface DublinCoreData {
  // Core DC Elements (DCMES 1.1)
  /** The name given to the resource */
  title?: string;
  /** An entity primarily responsible for making the resource */
  creator?: string | string[];
  /** The topic of the resource */
  subject?: string | string[];
  /** An account of the resource */
  description?: string;
  /** An entity responsible for making the resource available */
  publisher?: string;
  /** An entity responsible for making contributions to the resource */
  contributor?: string | string[];
  /** A point or period of time associated with the resource */
  date?: string;
  /** The nature or genre of the resource */
  type?: string;
  /** The file format, physical medium, or dimensions of the resource */
  format?: string;
  /** An unambiguous reference to the resource */
  identifier?: string | string[];
  /** A related resource from which the described resource is derived */
  source?: string;
  /** A language of the resource */
  language?: string;
  /** A related resource */
  relation?: string | string[];
  /** The spatial or temporal topic of the resource */
  coverage?: string;
  /** Information about rights held in and over the resource */
  rights?: string;

  // DCTERMS Extensions
  /** A class of agents for whom the resource is intended (DCTERMS, not core DC) */
  audience?: string;
}

type DublinCoreField = keyof DublinCoreData;

/**
 * Supported Dublin Core fields.
 *
 * Includes the 15 core DCMES 1.1 elements plus common DCTERMS extensions:
 * - Core DC: contributor, coverage, creator, date, description, format,
 *   identifier, language, publisher, relation, rights, source, subject, title, type
 * - DCTERMS: audience
 *
 * **Intentionally omitted DCTERMS properties:**
 * These specialized properties are rarely used in web metadata and are not mapped:
 * - educationLevel - Could map to audience but semantically distinct
 * - instructionalMethod - Too specialized for general metadata extraction
 * - accrualMethod, accrualPeriodicity, accrualPolicy - Collection management terms
 */
const DC_FIELDS = new Set<DublinCoreField>([
  // DCTERMS extension
  "audience",
  // Core DC Elements (DCMES 1.1)
  "contributor",
  "coverage",
  "creator",
  "date",
  "description",
  "format",
  "identifier",
  "language",
  "publisher",
  "relation",
  "rights",
  "source",
  "subject",
  "title",
  "type",
]);

type MultiValueField =
  | "creator"
  | "subject"
  | "contributor"
  | "relation"
  | "identifier";

const MULTI_VALUE_FIELDS: MultiValueField[] = [
  "contributor",
  "creator",
  "identifier",
  "relation",
  "subject",
];

const DC_PREFIX_PATTERN = /^(?:dc|dcterms)\.(.+)$/i;

interface DcTag {
  field: string;
  value: string;
}

const extractDcTags = ($: CheerioAPI): DcTag[] => {
  const tags: DcTag[] = [];

  // Extract from meta tags with name or property attribute
  $("meta[name], meta[property]").each((_, el) => {
    const nameAttr =
      $(el).attr("name")?.trim() || $(el).attr("property")?.trim();
    const content = $(el).attr("content")?.trim();
    if (nameAttr && content) {
      const match = DC_PREFIX_PATTERN.exec(nameAttr);
      if (match) {
        tags.push({ field: match[1].toLowerCase(), value: content });
      }
    }
  });

  // Extract from link tags with rel attribute
  $("link[rel]").each((_, el) => {
    const rel = $(el).attr("rel")?.trim();
    const href = $(el).attr("href")?.trim();
    if (rel && href) {
      const match = DC_PREFIX_PATTERN.exec(rel);
      if (match) {
        tags.push({ field: match[1].toLowerCase(), value: href });
      }
    }
  });

  return tags;
};

// Handle DCTERMS variations (refinements mapped to DC elements)
const DCTERMS_TO_DC: Record<string, DublinCoreField> = {
  abstract: "description",
  accessrights: "rights",
  alternative: "title",
  available: "date",
  bibliographiccitation: "identifier",
  conformsto: "relation",
  created: "date",
  dateaccepted: "date",
  datecopyrighted: "date",
  datesubmitted: "date",
  extent: "format",
  hasformat: "relation",
  haspart: "relation",
  hasversion: "relation",
  isformatof: "relation",
  ispartof: "relation",
  isreferencedby: "relation",
  isreplacedby: "relation",
  isrequiredby: "relation",
  issued: "date",
  isversionof: "relation",
  license: "rights",
  medium: "format",
  modified: "date",
  provenance: "source",
  references: "relation",
  replaces: "relation",
  requires: "relation",
  spatial: "coverage",
  tableofcontents: "description",
  temporal: "coverage",
  valid: "date",
};

const normalizeField = (field: string): DublinCoreField | undefined => {
  const normalized = DCTERMS_TO_DC[field] ?? field;
  return DC_FIELDS.has(normalized as DublinCoreField)
    ? (normalized as DublinCoreField)
    : undefined;
};

const MULTI_VALUE_SET = new Set<MultiValueField>(MULTI_VALUE_FIELDS);

const isMultiValueField = (field: DublinCoreField): field is MultiValueField =>
  MULTI_VALUE_SET.has(field as MultiValueField);

const processTag = (
  tag: DcTag,
  result: DublinCoreData,
  multiValues: Partial<Record<MultiValueField, string[]>>
): void => {
  const field = normalizeField(tag.field);
  if (!field) {
    return;
  }

  if (isMultiValueField(field)) {
    if (!multiValues[field]) {
      multiValues[field] = [];
    }
    multiValues[field]?.push(tag.value);
  } else if (!result[field]) {
    (result as Record<string, string>)[field] = tag.value;
  }
};

const applyMultiValues = (
  result: DublinCoreData,
  multiValues: Partial<Record<MultiValueField, string[]>>
): void => {
  for (const field of MULTI_VALUE_FIELDS) {
    const values = multiValues[field];
    if (values && values.length > 0) {
      result[field] = values.length === 1 ? values[0] : values;
    }
  }
};

export const parseDublinCore = ($: CheerioAPI): DublinCoreData => {
  const tags = extractDcTags($);
  const result: DublinCoreData = {};
  const multiValues: Partial<Record<MultiValueField, string[]>> = {};

  for (const tag of tags) {
    processTag(tag, result, multiValues);
  }
  applyMultiValues(result, multiValues);

  return result;
};
