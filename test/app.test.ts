import path from "node:path";
import { describe, expect, it } from "vitest";
import { AjvSchemaValidator } from "../src/adapters/ajv-validator.js";
import { FsPersonRepository } from "../src/adapters/fs-repository.js";
import { projectRoot } from "../src/adapters/paths.js";
import * as app from "../src/app/index.js";
import type { Deps } from "../src/app/index.js";
import type { ResolvedResume } from "../src/domain/types.js";
import type { RenderOptions } from "../src/ports/renderer.js";

const rendered: { resume: ResolvedResume; options: RenderOptions }[] = [];
const deps: Deps = {
  repo: new FsPersonRepository(path.join(projectRoot, "people")),
  validator: new AjvSchemaValidator(),
  renderer: {
    async render(resume, options) {
      rendered.push({ resume, options });
    },
  },
  outputDir: "out",
};

describe("app with the example person", () => {
  it("lists the example person and resolves it by default", async () => {
    expect(await app.listPeople(deps)).toContain("example");
    expect(await app.resolvePerson(deps, "example")).toBe("example");
  });

  it("rejects unknown people", async () => {
    await expect(app.resolvePerson(deps, "nobody")).rejects.toThrow(/Unknown person/);
  });

  it("validates the source and variants", async () => {
    const report = await app.validate(deps, "example");
    expect(report.problems).toEqual([]);
    expect(report.variants).toEqual(["backend", "default"]);
  });

  it("renders to <person>_<variant>_<lang>_<template>.pdf with the variant's defaults", async () => {
    const { outPath } = await app.render(deps, { person: "example", variant: "backend", lang: "es" });
    expect(outPath).toBe(path.join("out", "example", "example_backend_es_classic.pdf"));
    expect(rendered.at(-1)?.options.template).toBe("classic");
  });

  it("puts the chosen template in the file name, so templates never overwrite each other", async () => {
    const input = { person: "example", variant: "backend", lang: "en" } as const;
    const classic = await app.render(deps, { ...input, template: "classic" });
    const modern = await app.render(deps, { ...input, template: "modern" });
    expect(classic.outPath).not.toBe(modern.outPath);
    expect(modern.outPath).toBe(path.join("out", "example", "example_backend_en_modern.pdf"));
  });

  it("uses the variant's template when none is given", async () => {
    const { outPath } = await app.render(deps, { person: "showcase", variant: "frontend", lang: "en" });
    expect(outPath).toBe(path.join("out", "showcase", "showcase_frontend_en_modern.pdf"));
  });

  it("keeps each person's PDFs in their own folder", async () => {
    const a = await app.render(deps, { person: "example", variant: "default", lang: "en" });
    const b = await app.render(deps, { person: "showcase", variant: "full", lang: "en" });
    expect(path.dirname(a.outPath)).toBe(path.join("out", "example"));
    expect(path.dirname(b.outPath)).toBe(path.join("out", "showcase"));
  });

  it("fails clearly for a variant that does not exist", async () => {
    await expect(app.composeVariant(deps, { person: "example", variant: "nope" })).rejects.toThrow(
      /not found/,
    );
  });

  it("reports invalid data with paths", () => {
    const issues = deps.validator.validateSource({
      basics: { name: "X", email: "not-an-email", "x-cv-factory": { i18n: { fr: {} } } },
      work: [{ name: "A", startDate: "March 2020" }],
    });
    const paths = issues.map((i) => i.path);
    expect(paths).toContain("/basics/email");
    expect(paths).toContain("/work/0/startDate");
  });

  it("validates the x-cv-factory extension shape", () => {
    const issues = deps.validator.validateSource({
      basics: { name: "X", "x-cv-factory": { i18n: { fr: {} } } },
    });
    expect(issues.map((i) => i.path)).toContain("/basics/x-cv-factory/i18n");
  });

  it("rejects variants with invalid names", () => {
    expect(deps.validator.validateVariant({ name: "Bad_Name" })).not.toEqual([]);
  });
});
