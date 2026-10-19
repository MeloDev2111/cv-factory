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
import { formatDate } from "../domain/naming.js";
import type { Hideable } from "../domain/redact.js";
import { HIDEABLE, PUBLIC_PRESET } from "../domain/redact.js";
import type { Lang } from "../domain/types.js";
import { LANGS } from "../domain/types.js";

/** Composition root: the only place that wires adapters to ports. */
function createDeps(): Deps {
  const peopleDir = path.join(projectRoot, "people");
  return {
    repo: new FsPersonRepository(peopleDir),
    validator: new AjvSchemaValidator(),
    renderer: new TypstRenderer(path.join(projectRoot, "templates", "typst")),
    peopleDir,
    today: () => formatDate(new Date()),
  };
}

function parseList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
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

const hideOption = [
  "--hide <list>",
  `comma-separated personal data to leave out: ${HIDEABLE.join(", ")}`,
] as const;
const publicOption = [
  "--public",
  `shareable version: hides ${PUBLIC_PRESET.join(", ")} (combine with --hide to hide more)`,
] as const;

/** `--public` preset plus `--hide` fields, validated and without duplicates. */
function parseHide(opts: { hide?: string; public?: boolean }): Hideable[] {
  const requested = opts.hide === undefined ? [] : parseList(opts.hide);
  const unknown = requested.filter((f) => !(HIDEABLE as readonly string[]).includes(f));
  if (unknown.length > 0) {
    throw new CvFactoryError(
      `Cannot hide ${unknown.map((f) => `"${f}"`).join(", ")}. Available: ${HIDEABLE.join(", ")}.`,
    );
  }
  return [...new Set([...(opts.public ? PUBLIC_PRESET : []), ...requested])] as Hideable[];
}

const program = new Command()
  .name("cvf")
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
  .option(...hideOption)
  .option(...publicOption)
  .option("-o, --out <file>", "write to a file instead of stdout")
  .action(
    async (
      variant: string,
      opts: { person?: string; lang?: string; out?: string; hide?: string; public?: boolean },
    ) => {
      const deps = createDeps();
      const person = await app.resolvePerson(deps, opts.person);
      const result = await app.composeVariant(deps, {
        person,
        variant,
        hide: parseHide(opts),
        ...(opts.lang !== undefined && { lang: parseLang(opts.lang) }),
      });
      warn(result.warnings);
      const json = JSON.stringify(result.resume, null, 2);
      if (opts.out) await writeFile(opts.out, json + "\n");
      else console.log(json);
    },
  );

program
  .command("render")
  .description(
    "Compose a variant and render it to people/<person>/output/<person>_<variant>_<lang>_<template>_<YYYY-MM-DD>.pdf",
  )
  .argument("<variant>")
  .option(...personOption)
  .option("-l, --lang <lang>", `language: ${LANGS.join("|")} (default: variant's lang, else en)`)
  .option("-t, --template <name>", "template (default: variant's template, else classic)")
  .option("--no-date", "leave today's date out of the file name (stable name)")
  .option(...hideOption)
  .option(...publicOption)
  .action(
    async (
      variant: string,
      opts: {
        person?: string;
        lang?: string;
        template?: string;
        date: boolean;
        hide?: string;
        public?: boolean;
      },
    ) => {
      const deps = createDeps();
      const person = await app.resolvePerson(deps, opts.person);
      const result = await app.render(deps, {
        person,
        variant,
        dated: opts.date,
        hide: parseHide(opts),
        ...(opts.lang !== undefined && { lang: parseLang(opts.lang) }),
        ...(opts.template !== undefined && { template: opts.template }),
      });
      warn(result.warnings);
      console.log(result.outPath);
    },
  );

program
  .command("render-all")
  .description("Render every variant x language x template for a person")
  .option(...personOption)
  .option("--variants <list>", "comma-separated subset of variants (default: all)")
  .option("--langs <list>", `comma-separated subset of ${LANGS.join(",")} (default: all)`)
  .option("--templates <list>", "comma-separated subset of templates (default: all)")
  .option("--no-date", "leave today's date out of the file names (stable names)")
  .option(...hideOption)
  .option(...publicOption)
  .action(
    async (opts: {
      person?: string;
      variants?: string;
      langs?: string;
      templates?: string;
      date: boolean;
      hide?: string;
      public?: boolean;
    }) => {
      const deps = createDeps();
      const person = await app.resolvePerson(deps, opts.person);
      const { rendered, failures } = await app.renderAll(deps, {
        person,
        dated: opts.date,
        hide: parseHide(opts),
        ...(opts.variants !== undefined && { variants: parseList(opts.variants) }),
        ...(opts.langs !== undefined && { langs: parseList(opts.langs).map(parseLang) }),
        ...(opts.templates !== undefined && { templates: parseList(opts.templates) }),
      });
      for (const file of rendered) {
        console.log(file.outPath);
        warn(file.warnings.map((w) => `${file.variant}/${file.lang}/${file.template}: ${w}`));
      }
      console.log(`${rendered.length} PDF(s) written, ${failures.length} failed.`);
      if (failures.length > 0) {
        // Identical messages (e.g. typst not installed) are shown once, with the combinations.
        const byMessage = new Map<string, string[]>();
        for (const f of failures) {
          const key = `${f.variant}/${f.lang}/${f.template}`;
          byMessage.set(f.message, [...(byMessage.get(f.message) ?? []), key]);
        }
        throw new CvFactoryError(
          [...byMessage].map(([message, keys]) => `${keys.join(", ")}:\n${message}`).join("\n\n"),
        );
      }
    },
  );

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
