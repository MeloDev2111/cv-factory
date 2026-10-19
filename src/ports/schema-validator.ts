import type { ValidationIssue } from "../domain/types.js";

export interface SchemaValidator {
  validateSource(data: unknown): ValidationIssue[];
  validateVariant(data: unknown): ValidationIssue[];
}
