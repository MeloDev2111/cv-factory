import path from "node:path";
import { describe, expect, it } from "vitest";
import { AjvSchemaValidator } from "../src/adapters/ajv-validator.js";
import { FsPersonRepository } from "../src/adapters/fs-repository.js";
import { projectRoot } from "../src/adapters/paths.js";
import * as app from "../src/app/index.js";
import type { Deps } from "../src/app/index.js";
import { LANGS } from "../src/domain/types.js";

const deps: Deps = {
  repo: new FsPersonRepository(path.join(projectRoot, "people")),
  validator: new AjvSchemaValidator(),
  renderer: { async render() {} },
  outputDir: "out",
};

/** The fictional people double as documentation; they must stay valid and fully translated. */
describe.each(["example", "showcase"])("%s person", (person) => {
  it("validates", async () => {
    expect((await app.validate(deps, person)).problems).toEqual([]);
  });

  it("composes every variant in every language without translation warnings", async () => {
    for (const variant of await app.listVariants(deps, person)) {
      for (const lang of LANGS) {
        const { warnings } = await app.composeVariant(deps, { person, variant, lang });
        expect(warnings, `${person}/${variant}/${lang}`).toEqual([]);
      }
    }
  });
});

describe("showcase certifications", () => {
  const certificates = async (variant: string) =>
    (await app.composeVariant(deps, { person: "showcase", variant, lang: "en" })).resume
      .certificates ?? [];

  it("backend: the 6 featured, most recent first", async () => {
    const certs = await certificates("backend");
    expect(certs).toHaveLength(6);
    expect(certs.map((c) => c.date)).toEqual([...certs.map((c) => c.date)].sort().reverse());
    expect(certs.map((c) => c.name)).toContain("Cloud Architecture Professional");
    expect(certs.map((c) => c.name)).not.toContain("Advanced TypeScript"); // not featured
  });

  it("frontend: the 6 most recent overall", async () => {
    const certs = await certificates("frontend");
    expect(certs.map((c) => c.name)).toEqual([
      "Cloud Architecture Professional",
      "Kubernetes Operations Specialist",
      "Secure Software Engineering",
      "Data Engineering Professional",
      "Site Reliability Practitioner",
      "Advanced TypeScript",
    ]);
  });

  it("full: all 12, most recent first", async () => {
    expect(await certificates("full")).toHaveLength(12);
  });
});
