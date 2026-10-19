import path from "node:path";
import { describe, expect, it } from "vitest";
import { AjvSchemaValidator } from "../src/adapters/ajv-validator.js";
import { FsPersonRepository } from "../src/adapters/fs-repository.js";
import { projectRoot } from "../src/adapters/paths.js";
import * as app from "../src/app/index.js";
import type { Deps } from "../src/app/index.js";
import { CvFactoryError } from "../src/domain/errors.js";
import type { ResolvedResume } from "../src/domain/types.js";
import type { RenderOptions } from "../src/ports/renderer.js";

const TEMPLATES = ["classic", "clean", "modern"];
const rendered: { resume: ResolvedResume; options: RenderOptions }[] = [];
let failTemplate: string | undefined;
const deps: Deps = {
  repo: new FsPersonRepository(path.join(projectRoot, "people")),
  validator: new AjvSchemaValidator(),
  renderer: {
    async render(resume, options) {
      if (options.template === failTemplate) throw new CvFactoryError(`boom in ${failTemplate}`);
      rendered.push({ resume, options });
    },
    async listTemplates() {
      return TEMPLATES;
    },
  },
  outputDir: "out",
  today: () => "2026-10-19",
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

  it("renders to <person>_<variant>_<lang>_<template>_<date>.pdf with the variant's defaults", async () => {
    const { outPath } = await app.render(deps, { person: "example", variant: "backend", lang: "es" });
    expect(outPath).toBe(path.join("out", "example", "example_backend_es_classic_2026-10-19.pdf"));
    expect(rendered.at(-1)?.options.template).toBe("classic");
  });

  it("puts the chosen template in the file name, so templates never overwrite each other", async () => {
    const input = { person: "example", variant: "backend", lang: "en" } as const;
    const classic = await app.render(deps, { ...input, template: "classic" });
    const modern = await app.render(deps, { ...input, template: "modern" });
    expect(classic.outPath).not.toBe(modern.outPath);
    expect(modern.outPath).toBe(path.join("out", "example", "example_backend_en_modern_2026-10-19.pdf"));
  });

  it("leaves the date out of the name with dated: false (stable names for versioned samples)", async () => {
    const { outPath } = await app.render(deps, {
      person: "showcase", variant: "frontend", lang: "en", dated: false,
    });
    expect(outPath).toBe(path.join("out", "showcase", "showcase_frontend_en_modern.pdf"));
  });

  it("uses the variant's template when none is given", async () => {
    const { outPath } = await app.render(deps, { person: "showcase", variant: "frontend", lang: "en" });
    expect(path.basename(outPath)).toBe("showcase_frontend_en_modern_2026-10-19.pdf");
  });

  describe("hiding personal data", () => {
    const input = { person: "showcase", variant: "full", lang: "en" } as const;

    it("removes the data from the composed resume and from what the renderer receives", async () => {
      const full = await app.composeVariant(deps, input);
      expect(full.resume.basics?.phone).toBeDefined();

      const hidden = await app.composeVariant(deps, { ...input, hide: ["phone", "email"] });
      expect(hidden.resume.basics).not.toHaveProperty("phone");
      expect(hidden.resume.basics).not.toHaveProperty("email");

      await app.render(deps, { ...input, hide: ["phone", "email"] });
      expect(JSON.stringify(rendered.at(-1)?.resume)).not.toMatch(/\+351 900 000 000|sam\.rivera@/);
    });

    it("marks the file as redacted, so it never overwrites the full CV", async () => {
      const full = await app.render(deps, input);
      const shareable = await app.render(deps, { ...input, hide: ["phone"] });
      expect(path.basename(full.outPath)).toBe("showcase_full_en_classic_2026-10-19.pdf");
      expect(path.basename(shareable.outPath)).toBe("showcase_full_en_classic_redacted_2026-10-19.pdf");
    });

    it("surfaces the no-contact warning", async () => {
      const { warnings } = await app.composeVariant(deps, {
        ...input, hide: ["phone", "email", "website", "profiles"],
      });
      expect(warnings.some((w) => w.includes("nothing is left to contact"))).toBe(true);
    });

    it("renderAll applies it to every file", async () => {
      const { rendered: files } = await app.renderAll(deps, {
        person: "example", variants: ["default"], langs: ["en"], templates: ["classic"], hide: ["phone"],
      });
      expect(files.map((f) => path.basename(f.outPath))).toEqual([
        "example_default_en_classic_redacted_2026-10-19.pdf",
      ]);
    });
  });

  it("keeps each person's PDFs in their own folder", async () => {
    const a = await app.render(deps, { person: "example", variant: "default", lang: "en" });
    const b = await app.render(deps, { person: "showcase", variant: "full", lang: "en" });
    expect(path.dirname(a.outPath)).toBe(path.join("out", "example"));
    expect(path.dirname(b.outPath)).toBe(path.join("out", "showcase"));
  });

  describe("renderAll", () => {
    it("renders every variant x language x template", async () => {
      const { rendered: files, failures } = await app.renderAll(deps, { person: "example" });
      expect(failures).toEqual([]);
      expect(files).toHaveLength(2 * 2 * TEMPLATES.length); // 2 variants, 2 languages
      expect(new Set(files.map((f) => f.outPath)).size).toBe(files.length); // no overwrites
    });

    it("narrows to the requested subsets", async () => {
      const { rendered: files } = await app.renderAll(deps, {
        person: "showcase", variants: ["full"], langs: ["es"], templates: ["clean", "modern"],
      });
      expect(files.map((f) => path.basename(f.outPath))).toEqual([
        "showcase_full_es_clean_2026-10-19.pdf",
        "showcase_full_es_modern_2026-10-19.pdf",
      ]);
    });

    it("rejects unknown variants and templates, listing the available ones", async () => {
      await expect(app.renderAll(deps, { person: "example", variants: ["nope"] })).rejects.toThrow(
        /Unknown variant "nope". Available: backend, default/,
      );
      await expect(app.renderAll(deps, { person: "example", templates: ["fancy"] })).rejects.toThrow(
        /Unknown template "fancy"/,
      );
    });

    it("keeps going when one combination fails and reports it", async () => {
      failTemplate = "modern";
      try {
        const { rendered: files, failures } = await app.renderAll(deps, {
          person: "example", variants: ["default"], langs: ["en"],
        });
        expect(files.map((f) => f.template)).toEqual(["classic", "clean"]);
        expect(failures).toEqual([
          { variant: "default", lang: "en", template: "modern", message: "boom in modern" },
        ]);
      } finally {
        failTemplate = undefined;
      }
    });
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
