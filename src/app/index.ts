import path from "node:path";
import { compose as composeResume } from "../domain/compose.js";
import { CvFactoryError } from "../domain/errors.js";
import { assertIdentifier, outputFileName } from "../domain/naming.js";
import type { Lang, ResolvedResume, Source, ValidationIssue, Variant } from "../domain/types.js";
import { BASE_LANG } from "../domain/types.js";
import type { PersonRepository } from "../ports/person-repository.js";
import type { Renderer } from "../ports/renderer.js";
import type { SchemaValidator } from "../ports/schema-validator.js";

export interface Deps {
  repo: PersonRepository;
  validator: SchemaValidator;
  renderer: Renderer;
  outputDir: string;
}

export const DEFAULT_TEMPLATE = "classic";

function format(issues: ValidationIssue[]): string {
  return issues.map((i) => `  - ${i.path || "/"}: ${i.message}`).join("\n");
}

export async function listPeople(deps: Deps): Promise<string[]> {
  return deps.repo.listPeople();
}

/** Explicit slug, or the only person when exactly one exists. */
export async function resolvePerson(deps: Deps, person?: string): Promise<string> {
  const people = await deps.repo.listPeople();
  if (person !== undefined) {
    if (!people.includes(person)) {
      throw new CvFactoryError(
        `Unknown person "${person}". Available: ${people.join(", ") || "(none)"}.`,
      );
    }
    return person;
  }
  if (people.length === 1) return people[0] as string;
  throw new CvFactoryError(
    people.length === 0
      ? "No people found under people/."
      : `Several people found; pass --person. Available: ${people.join(", ")}.`,
  );
}

export async function listVariants(deps: Deps, person: string): Promise<string[]> {
  return deps.repo.listVariants(person);
}

async function loadValidSource(deps: Deps, person: string): Promise<Source> {
  const data = await deps.repo.loadSource(person);
  const issues = deps.validator.validateSource(data);
  if (issues.length > 0) {
    throw new CvFactoryError(`people/${person}/source.json is invalid:\n${format(issues)}`);
  }
  return data as Source;
}

async function loadValidVariant(deps: Deps, person: string, name: string): Promise<Variant> {
  assertIdentifier("variant name", name);
  const data = await deps.repo.loadVariant(person, name);
  const issues = deps.validator.validateVariant(data);
  if (issues.length > 0) {
    throw new CvFactoryError(`Variant "${name}" is invalid:\n${format(issues)}`);
  }
  const variant = data as Variant;
  if (variant.name !== name) {
    throw new CvFactoryError(
      `Variant file "${name}.yaml" declares name "${variant.name}"; they must match.`,
    );
  }
  return variant;
}

export interface ValidationReport {
  person: string;
  problems: string[];
  variants: string[];
}

/** Validates the source and every variant, collecting all problems instead of stopping. */
export async function validate(deps: Deps, person: string): Promise<ValidationReport> {
  const problems: string[] = [];
  try {
    await loadValidSource(deps, person);
  } catch (error) {
    if (!(error instanceof CvFactoryError)) throw error;
    problems.push(error.message);
  }
  const variants = await deps.repo.listVariants(person);
  for (const name of variants) {
    try {
      await loadValidVariant(deps, person, name);
    } catch (error) {
      if (!(error instanceof CvFactoryError)) throw error;
      problems.push(error.message);
    }
  }
  return { person, problems, variants };
}

export interface ComposeInput {
  person: string;
  variant: string;
  lang?: Lang;
}

export interface ComposeOutput {
  resume: ResolvedResume;
  warnings: string[];
  variant: Variant;
  lang: Lang;
}

export async function composeVariant(deps: Deps, input: ComposeInput): Promise<ComposeOutput> {
  const source = await loadValidSource(deps, input.person);
  const variant = await loadValidVariant(deps, input.person, input.variant);
  const lang = input.lang ?? variant.lang ?? BASE_LANG;
  const { resume, warnings } = composeResume(source, variant, lang);
  return { resume, warnings, variant, lang };
}

export interface RenderInput extends ComposeInput {
  template?: string;
}

export interface RenderOutput {
  outPath: string;
  warnings: string[];
}

export async function render(deps: Deps, input: RenderInput): Promise<RenderOutput> {
  const { resume, warnings, variant, lang } = await composeVariant(deps, input);
  const template = input.template ?? variant.template ?? DEFAULT_TEMPLATE;
  assertIdentifier("template name", template);
  const outPath = path.join(
    deps.outputDir,
    outputFileName(input.person, variant.name, lang, template),
  );
  await deps.renderer.render(resume, { template, outPath });
  return { outPath, warnings };
}
