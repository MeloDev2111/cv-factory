import { describe, expect, it } from "vitest";
import { isIdentifier, outputFileName } from "../src/domain/naming.js";

describe("naming", () => {
  it("accepts lowercase letters, digits and hyphens", () => {
    expect(isIdentifier("ana-perez")).toBe(true);
    expect(isIdentifier("backend2")).toBe(true);
  });

  it.each(["Ana", "ana_perez", "ana.perez", "ana perez", "", "añ"])("rejects %j", (value) => {
    expect(isIdentifier(value)).toBe(false);
  });

  it("builds the output file name with underscores, including the template", () => {
    expect(outputFileName("ana-perez", "backend", "es", "classic")).toBe(
      "ana-perez_backend_es_classic.pdf",
    );
  });

  it("gives a different file name to every person/variant/lang/template combination", () => {
    const names = new Set<string>();
    for (const variant of ["a", "b"])
      for (const lang of ["en", "es"] as const)
        for (const template of ["classic", "modern"]) {
          names.add(outputFileName("p", variant, lang, template));
        }
    expect(names.size).toBe(8);
  });
});
