import type { JsonObject, ResolvedResume } from "./types.js";

/** Personal data a render can leave out. All of it lives under `basics`. */
export const HIDEABLE = ["phone", "email", "address", "location", "website", "profiles", "image"] as const;
export type Hideable = (typeof HIDEABLE)[number];

/**
 * What `--public` hides: what is typically abused when a CV is posted openly. City, website and
 * profiles stay, so there is still a way to reach the person.
 */
export const PUBLIC_PRESET: readonly Hideable[] = ["phone", "email", "address", "image"];

export interface RedactResult {
  resume: ResolvedResume;
  warnings: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pure: removes the given personal data from the resolved resume. It runs before rendering, so the
 * data is absent from the PDF itself, not just covered. `address` removes the street address and
 * postal code but keeps city and country; `location` removes the whole location.
 */
export function redact(resume: ResolvedResume, hide: readonly Hideable[]): RedactResult {
  if (hide.length === 0) return { resume, warnings: [] };

  const copy = structuredClone(resume) as JsonObject;
  const basics: JsonObject = isObject(copy["basics"]) ? copy["basics"] : {};
  const drop = (key: string): void => {
    delete basics[key];
  };

  if (hide.includes("phone")) drop("phone");
  if (hide.includes("email")) drop("email");
  if (hide.includes("website")) drop("url");
  if (hide.includes("profiles")) drop("profiles");
  if (hide.includes("image")) drop("image");
  if (hide.includes("location")) {
    drop("location");
  } else if (hide.includes("address") && isObject(basics["location"])) {
    delete basics["location"]["address"];
    delete basics["location"]["postalCode"];
  }
  copy["basics"] = basics;

  const reachable =
    Boolean(basics["email"] || basics["phone"] || basics["url"]) ||
    (Array.isArray(basics["profiles"]) && basics["profiles"].length > 0);
  const warnings = reachable
    ? []
    : ["nothing is left to contact this person (no email, phone, website or profiles)"];

  return { resume: copy as ResolvedResume, warnings };
}
