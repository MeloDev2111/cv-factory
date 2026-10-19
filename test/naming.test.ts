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

  it("builds the output file name with underscores", () => {
    expect(outputFileName("ana-perez", "backend", "es")).toBe("ana-perez_backend_es.pdf");
  });
});
