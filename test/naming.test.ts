import { describe, expect, it } from "vitest";
import { formatDate, isIdentifier, outputFileName } from "../src/domain/naming.js";

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

  it("appends the date as _YYYY-MM-DD, keeping the name parseable", () => {
    const name = outputFileName("ana-perez", "backend", "es", "classic", { date: "2026-10-19" });
    expect(name).toBe("ana-perez_backend_es_classic_2026-10-19.pdf");
    // Identifiers never contain "_", so splitting on it recovers every field.
    expect(name.replace(/\.pdf$/, "").split("_")).toEqual([
      "ana-perez", "backend", "es", "classic", "2026-10-19",
    ]);
  });

  it("marks redacted files, before the date, so they are never mistaken for the full CV", () => {
    expect(outputFileName("p", "backend", "en", "clean", { redacted: true })).toBe(
      "p_backend_en_clean_redacted.pdf",
    );
    const dated = outputFileName("p", "backend", "en", "clean", { redacted: true, date: "2026-10-19" });
    expect(dated).toBe("p_backend_en_clean_redacted_2026-10-19.pdf");
    expect(dated).not.toBe(outputFileName("p", "backend", "en", "clean", { date: "2026-10-19" }));
  });

  it("formats the local calendar date with zero padding", () => {
    expect(formatDate(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(formatDate(new Date(2026, 0, 31, 23, 59))).toBe("2026-01-31");
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
