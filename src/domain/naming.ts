import { CvFactoryError } from "./errors.js";
import type { Lang } from "./types.js";

const IDENTIFIER = /^[a-z0-9-]+$/;

/** Person slugs, variant names and template names: lowercase, digits, hyphens. */
export function isIdentifier(value: string): boolean {
  return IDENTIFIER.test(value);
}

export function assertIdentifier(kind: string, value: string): void {
  if (!isIdentifier(value)) {
    throw new CvFactoryError(
      `Invalid ${kind} "${value}": use only lowercase letters, digits and hyphens.`,
    );
  }
}

/** `<person>_<variant>_<lang>.pdf` — `_` never appears inside an identifier. */
export function outputFileName(person: string, variant: string, lang: Lang): string {
  return `${person}_${variant}_${lang}.pdf`;
}
