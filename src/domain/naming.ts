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

/** Local calendar date as `YYYY-MM-DD` (not UTC: late evening in Lima is already "tomorrow" in UTC). */
export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * `<person>_<variant>_<lang>_<template>[_<YYYY-MM-DD>].pdf` — `_` never appears inside an
 * identifier, and every dimension of the combination is in the name, so no render of a
 * different combination (or, when dated, a different day) overwrites another.
 */
export function outputFileName(
  person: string,
  variant: string,
  lang: Lang,
  template: string,
  date?: string,
): string {
  const stamp = date === undefined ? "" : `_${date}`;
  return `${person}_${variant}_${lang}_${template}${stamp}.pdf`;
}
