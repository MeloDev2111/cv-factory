import type { ResumeSchema } from "./generated/resume.js";
import type { Lang, Section, Variant } from "./generated/variant.js";

export type { Lang, Section, Variant };
export type Source = ResumeSchema;
export type ResolvedResume = ResumeSchema;

export const BASE_LANG: Lang = "en";
export const LANGS: readonly Lang[] = ["en", "es"];

export type JsonObject = Record<string, unknown>;

/** The `x-cv-factory` extension carried by `basics` and by items of array sections. */
export interface XCvFactory {
  tags?: string[];
  i18n?: Partial<Record<Lang, JsonObject>>;
}

export interface ValidationIssue {
  path: string;
  message: string;
}
