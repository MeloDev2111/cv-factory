import { describe, expect, it } from "vitest";
import { compose } from "../src/domain/compose.js";
import type { Source, Variant } from "../src/domain/types.js";

const source = {
  basics: {
    name: "Jane",
    label: "Engineer",
    "x-cv-factory": { i18n: { es: { label: "Ingeniera" } } },
  },
  work: [
    {
      name: "A",
      position: "Backend",
      highlights: ["did x"],
      "x-cv-factory": {
        tags: ["backend"],
        i18n: { es: { position: "Backend ES", highlights: ["hice x"] } },
      },
    },
    { name: "B", position: "Frontend", "x-cv-factory": { tags: ["frontend"] } },
    { name: "C", position: "Anything" },
  ],
  skills: [{ name: "Git", keywords: ["git"] }],
  certificates: [{ name: "Cert", issuer: "Org" }],
} as unknown as Source;

const variant = (extra: Partial<Variant> = {}): Variant => ({ name: "v", ...extra });

describe("compose", () => {
  it("keeps everything when the variant has no constraints", () => {
    const { resume } = compose(source, variant(), "en");
    expect(resume.work).toHaveLength(3);
  });

  it("filters by tags and keeps untagged items", () => {
    const { resume } = compose(source, variant({ filter: { tags: ["backend"] } }), "en");
    expect((resume.work ?? []).map((w) => w.name)).toEqual(["A", "C"]);
  });

  it("applies limits after filtering", () => {
    const { resume } = compose(
      source,
      variant({ filter: { tags: ["backend", "frontend"] }, limits: { work: 2 } }),
      "en",
    );
    expect((resume.work ?? []).map((w) => w.name)).toEqual(["A", "B"]);
  });

  describe("curating a section (require, sort, limits)", () => {
    const certs = [
      { name: "old", date: "2019-01", "x-cv-factory": { tags: ["featured"] } },
      { name: "newest", date: "2024-06", "x-cv-factory": { tags: ["featured"] } },
      { name: "untagged", date: "2025-01" },
      { name: "mid", date: "2022", "x-cv-factory": { tags: ["featured", "cloud"] } },
      { name: "undated", "x-cv-factory": { tags: ["featured"] } },
      { name: "other", date: "2023-03", "x-cv-factory": { tags: ["cloud"] } },
    ];
    const src = { basics: { name: "J" }, certificates: certs } as unknown as Source;
    const names = (v: Partial<Variant>) =>
      (compose(src, variant({ sections: ["certificates"], ...v }), "en").resume.certificates ?? []).map(
        (c) => c.name,
      );

    it("sorts most recent first by default, undated last", () => {
      expect(names({ sort: { certificates: { by: "date" } } })).toEqual([
        "untagged", "newest", "other", "mid", "old", "undated",
      ]);
    });

    it("sorts ascending on request", () => {
      expect(names({ sort: { certificates: { by: "date", order: "asc" } } }).slice(0, 2)).toEqual([
        "old", "mid",
      ]);
    });

    it("require is strict: untagged items are dropped, unlike filter", () => {
      expect(names({ filter: { tags: ["featured"] } })).toContain("untagged");
      expect(names({ require: { certificates: ["featured"] } })).not.toContain("untagged");
    });

    it("filter.sections scopes the global tag filter to the listed sections", () => {
      const both = { ...src, work: [{ name: "w", "x-cv-factory": { tags: ["other"] } }] } as unknown as Source;
      const run = (sections?: ("work" | "certificates")[]) =>
        compose(
          both,
          variant({
            sections: ["work", "certificates"],
            filter: { tags: ["backend"], ...(sections && { sections }) } as Variant["filter"],
          }),
          "en",
        ).resume;
      // Unscoped: the tag filter hits both sections.
      expect(run().work).toHaveLength(0);
      expect(run().certificates).toHaveLength(1); // only the untagged one survives
      // Scoped to work: certificates are left alone.
      expect(run(["work"]).work).toHaveLength(0);
      expect(run(["work"]).certificates).toHaveLength(certs.length);
    });

    it("require is applied on top of the global filter, so scope the filter when they conflict", () => {
      const v = {
        sections: ["certificates"] as Variant["sections"],
        filter: { tags: ["backend"] } as Variant["filter"],
        require: { certificates: ["featured"] } as Variant["require"],
      };
      expect(names(v)).toEqual([]); // featured items lack the "backend" tag
      expect(names({ ...v, filter: { tags: ["backend"], sections: ["work"] } })).toHaveLength(4);
    });

    it("keeps the N most recent featured items", () => {
      expect(
        names({
          require: { certificates: ["featured"] },
          sort: { certificates: { by: "date" } },
          limits: { certificates: 3 },
        }),
      ).toEqual(["newest", "mid", "old"]);
    });

    it("keeps the N most recent overall when only sort and limits are set", () => {
      expect(
        names({ sort: { certificates: { by: "date" } }, limits: { certificates: 2 } }),
      ).toEqual(["untagged", "newest"]);
    });
  });

  it("selects and orders sections", () => {
    const { resume } = compose(source, variant({ sections: ["certificates", "work"] }), "en");
    expect(Object.keys(resume)).toEqual(["basics", "certificates", "work", "meta"]);
  });

  it("warns about sections missing from the source", () => {
    const { warnings } = compose(source, variant({ sections: ["projects"] }), "en");
    expect(warnings[0]).toContain('"projects"');
  });

  it("overlays translations and strips the extension", () => {
    const { resume, warnings } = compose(source, variant({ sections: ["work"] }), "es");
    expect(resume.basics?.label).toBe("Ingeniera");
    expect(resume.work?.[0]).toEqual({ name: "A", position: "Backend ES", highlights: ["hice x"] });
    expect(JSON.stringify(resume)).not.toContain("tags");
    expect(warnings).toHaveLength(2); // items B and C lack a translation
  });

  it("only warns about items that reach the output", () => {
    const v = variant({ sections: ["work"], filter: { tags: ["backend"] } });
    const { warnings } = compose(source, v, "es");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("work[2] (C)"); // B was filtered out; C is untagged
  });

  it("falls back to the base text and lists the untranslated fields", () => {
    const { resume, warnings } = compose(source, variant({ sections: ["work"] }), "es");
    expect(resume.work?.[1]?.position).toBe("Frontend");
    expect(warnings[0]).toContain("work[1] (B)");
    expect(warnings[0]).toContain("position");
  });

  it("does not warn for fields that need no translation", () => {
    const { warnings } = compose(source, variant({ sections: ["certificates", "skills"] }), "es");
    expect(warnings).toEqual([]);
  });

  it("lets the variant override basics, per language", () => {
    const v = variant({
      basics: { label: "Backend Engineer" },
      i18n: { es: { basics: { label: "Ingeniera Backend" } } },
    });
    expect(compose(source, v, "en").resume.basics?.label).toBe("Backend Engineer");
    expect(compose(source, v, "es").resume.basics?.label).toBe("Ingeniera Backend");
  });

  it("records variant and language in meta and does not mutate the source", () => {
    const before = JSON.stringify(source);
    const { resume } = compose(source, variant(), "es");
    expect(resume.meta).toEqual({ "x-cv-factory": { variant: "v", lang: "es" } });
    expect(JSON.stringify(source)).toBe(before);
  });
});
