#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { AjvSchemaValidator } from "../adapters/ajv-validator.js";
import { FsPersonRepository } from "../adapters/fs-repository.js";
import { projectRoot } from "../adapters/paths.js";
import { TypstRenderer } from "../adapters/typst-renderer.js";
import * as app from "../app/index.js";
import type { Deps } from "../app/index.js";
import { CvFactoryError } from "../domain/errors.js";
import type { Lang } from "../domain/types.js";
import { LANGS } from "../domain/types.js";

/** Composition root: the only place that wires adapters to ports. */
function createDeps(): Deps {
  return {
    repo: new FsPersonRepository(path.join(projectRoot, "people")),
    validator: new AjvSchemaValidator(),
    renderer: new TypstRenderer(path.join(projectRoot, "templates", "typst")),
    outputDir: path.join(projectRoot, "output"),
  };
}

function parseLang(value: string): Lang {
  if (!(LANGS as readonly string[]).includes(value)) {
    throw new CvFactoryError(`Unsupported language "${value}". Use one of: ${LANGS.join(", ")}.`);
  }
  return value as Lang;
}

function warn(warnings: string[]): void {
  for (const w of warnings) console.error(`warning: ${w}`);
}

const program = new Command()
  .name("cv-factory")
  .description("Manage CVs as structured data and render tailored PDFs.")
  .showHelpAfterError();

const personOption = ["-p, --person <slug>", "person folder under people/ (default: the only one)"] as const;

program
  .command("list-people")
  .description("List available people")
  .action(async () => {
    for (const person of await app.listPeople(createDeps())) console.log(person);
  });

program
  .command("list-variants")
  .description("List a person's variants")
  .option(...personOption)
  .action(async (opts: { person?: string }) => {
    const deps = createDeps();
    const person = await app.resolvePerson(deps, opts.person);
    for (const name of await app.listVariants(deps, person)) console.log(name);
  });

program
  .command("validate")
  .description("Validate a person's source.json and variants")
  .option(...personOption)
  .action(async (opts: { person?: string }) => {
    const deps = createDeps();
    const person = await app.resolvePerson(deps, opts.person);
    const report = await app.validate(deps, person);
    if (report.problems.length > 0) {
      throw new CvFactoryError(report.problems.join("\n"));
    }
    console.log(`ok: ${person} (source.json + ${report.variants.length} variant(s))`);
  });

program
  .command("compose")
  .description("Print the resolved resume.json for a variant")
  .argument("<variant>")
  .option(...personOption)
  .option("-l, --lang <lang>", `language: ${LANGS.join("|")} (default: variant's lang, else en)`)
  .option("-o, --out <file>", "write to a file instead of stdout")
  .action(async (variant: string, opts: { person?: string; lang?: string; out?: string }) => {
    const deps = createDeps();
    const person = await app.resolvePerson(deps, opts.person);
    const result = await app.composeVariant(deps, {
      person,
      variant,
      ...(opts.lang !== undefined && { lang: parseLang(opts.lang) }),
    });
    warn(result.warnings);
    const json = JSON.stringify(result.resume, null, 2);
    if (opts.out) await writeFile(opts.out, json + "\n");
    else console.log(json);
  });

program
  .command("render")
  .description("Compose a variant and render it to output/<person>/<person>_<variant>_<lang>_<template>.pdf")
  .argument("<variant>")
  .option(...personOption)
  .option("-l, --lang <lang>", `language: ${LANGS.join("|")} (default: variant's lang, else en)`)
  .option("-t, --template <name>", "template (default: variant's template, else classic)")
  .action(async (variant: string, opts: { person?: string; lang?: string; template?: string }) => {
    const deps = createDeps();
    const person = await app.resolvePerson(deps, opts.person);
    const result = await app.render(deps, {
      person,
      variant,
      ...(opts.lang !== undefined && { lang: parseLang(opts.lang) }),
      ...(opts.template !== undefined && { template: opts.template }),
    });
    warn(result.warnings);
    console.log(result.outPath);
  });

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CvFactoryError) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
