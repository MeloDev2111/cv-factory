import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { ValidationIssue } from "../domain/types.js";
import type { SchemaValidator } from "../ports/schema-validator.js";
import { projectRoot } from "./paths.js";

const EXT = "x-cv-factory";

function loadSchema(name: string): object {
  return JSON.parse(readFileSync(path.join(projectRoot, "schema", name), "utf8")) as object;
}

function toIssues(errors: ErrorObject[] | null | undefined, prefix = ""): ValidationIssue[] {
  return (errors ?? []).map((e) => ({
    path: `${prefix}${e.instancePath}`,
    message: e.message ?? "invalid",
  }));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * JSON Resume validation plus the `x-cv-factory` extension shape.
 * The resume schema is vendored and declares `additionalProperties: true`, so the
 * extension is checked separately by walking `basics` and the array sections.
 */
export class AjvSchemaValidator implements SchemaValidator {
  private readonly resume: ValidateFunction;
  private readonly extension: ValidateFunction;
  private readonly variant: ValidateFunction;

  constructor() {
    // strict:false — the vendored JSON Resume schema uses `additionalItems` without tuple items.
    const ajv = new Ajv({ allErrors: true, strict: false });
    (addFormats as unknown as (a: Ajv) => void)(ajv);
    this.resume = ajv.compile(loadSchema("resume.schema.json"));
    this.extension = ajv.compile(loadSchema("x-cv-factory.schema.json"));
    this.variant = ajv.compile(loadSchema("variant.schema.json"));
  }

  validateSource(data: unknown): ValidationIssue[] {
    if (!this.resume(data)) return toIssues(this.resume.errors);
    const issues: ValidationIssue[] = [];
    const root = data as Record<string, unknown>;
    const check = (value: unknown, where: string): void => {
      if (!isObject(value) || !(EXT in value)) return;
      if (!this.extension(value[EXT])) {
        issues.push(...toIssues(this.extension.errors, `${where}/${EXT}`));
      }
    };
    check(root["basics"], "/basics");
    for (const [section, items] of Object.entries(root)) {
      if (!Array.isArray(items)) continue;
      items.forEach((item, i) => check(item, `/${section}/${i}`));
    }
    return issues;
  }

  validateVariant(data: unknown): ValidationIssue[] {
    return this.variant(data) ? [] : toIssues(this.variant.errors);
  }
}
