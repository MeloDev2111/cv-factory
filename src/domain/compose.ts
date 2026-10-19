import type {
  JsonObject,
  Lang,
  ResolvedResume,
  Source,
  Variant,
  XCvFactory,
} from "./types.js";
import { BASE_LANG } from "./types.js";

const EXT = "x-cv-factory";

/** Fields whose absence from `i18n.<lang>` is reported. Others need no translation. */
const TRANSLATABLE: Readonly<Record<string, readonly string[]>> = {
  basics: ["label", "summary"],
  work: ["position", "summary", "highlights"],
  volunteer: ["position", "summary", "highlights"],
  projects: ["description", "highlights"],
  education: ["area", "studyType"],
  awards: ["title", "summary"],
};

export interface ComposeResult {
  resume: ResolvedResume;
  warnings: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extOf(item: JsonObject): XCvFactory {
  const ext = item[EXT];
  return isObject(ext) ? (ext as XCvFactory) : {};
}

/** Applies `x-cv-factory.i18n.<lang>` over the item and warns about untranslated fields. */
function localize(
  item: JsonObject,
  lang: Lang,
  section: string,
  label: string,
  warnings: string[],
): JsonObject {
  const translation = extOf(item).i18n?.[lang] ?? {};
  const missing = (TRANSLATABLE[section] ?? []).filter(
    (field) => field in item && !(field in translation),
  );
  if (missing.length > 0) {
    warnings.push(`${label}: no "${lang}" translation for ${missing.join(", ")}; using ${BASE_LANG}`);
  }
  return { ...item, ...translation };
}

function describe(section: string, index: number, item: JsonObject): string {
  const name = item["name"] ?? item["institution"] ?? item["organization"] ?? item["title"];
  return `${section}[${index}]${typeof name === "string" ? ` (${name})` : ""}`;
}

function strip(item: JsonObject): JsonObject {
  const { [EXT]: _ignored, ...rest } = item;
  return rest;
}

function matchesTags(item: JsonObject, wanted: readonly string[]): boolean {
  const tags = extOf(item).tags;
  if (!tags || tags.length === 0) return true; // untagged items are universal
  return tags.some((tag) => wanted.includes(tag));
}

/**
 * Pure: (source, variant, lang) -> resolved resume.
 * Order of operations: language overlay, tag filter, limits, section selection.
 */
export function compose(source: Source, variant: Variant, lang: Lang): ComposeResult {
  const warnings: string[] = [];
  const input = structuredClone(source) as JsonObject;
  const translate = lang !== BASE_LANG;

  let basics = isObject(input["basics"]) ? input["basics"] : {};
  if (translate) basics = localize(basics, lang, "basics", "basics", warnings);
  basics = {
    ...strip(basics),
    ...variant.basics,
    ...(translate ? variant.i18n?.[lang]?.basics : undefined),
  };

  const available = Object.keys(input).filter((key) => Array.isArray(input[key]));
  const order = variant.sections ?? available;
  const resume: JsonObject = { basics };
  for (const name of order) {
    const value = input[name];
    if (!Array.isArray(value)) {
      warnings.push(`variant "${variant.name}" lists section "${name}" which is not in the source`);
      continue;
    }
    let items = value.filter(isObject);
    if (variant.filter?.tags) {
      const wanted = variant.filter.tags;
      items = items.filter((item) => matchesTags(item, wanted));
    }
    const limit = (variant.limits as Record<string, number> | undefined)?.[name];
    if (limit !== undefined) items = items.slice(0, limit);
    // Translate last so warnings only cover items that actually reach the output.
    if (translate) {
      items = items.map((item) =>
        localize(item, lang, name, describe(name, value.indexOf(item), item), warnings),
      );
    }
    resume[name] = items.map(strip);
  }
  const meta = isObject(input["meta"]) ? input["meta"] : {};
  resume["meta"] = { ...meta, [EXT]: { variant: variant.name, lang } };

  return { resume: resume as ResolvedResume, warnings };
}
