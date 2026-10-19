import { describe, expect, it } from "vitest";
import { HIDEABLE, PUBLIC_PRESET, redact } from "../src/domain/redact.js";
import type { ResolvedResume } from "../src/domain/types.js";

const resume = {
  basics: {
    name: "Jane Doe",
    label: "Engineer",
    email: "jane@example.com",
    phone: "+1 555 0100",
    url: "https://jane.example.com",
    image: "https://example.com/me.jpg",
    location: { address: "1 Main St", postalCode: "12345", city: "Springfield", countryCode: "US" },
    profiles: [{ network: "GitHub", username: "jane", url: "https://github.com/jane" }],
  },
  work: [{ name: "Acme", position: "Dev" }],
} as unknown as ResolvedResume;

const basicsOf = (r: ResolvedResume) => r.basics as Record<string, unknown>;

describe("redact", () => {
  it("changes nothing when nothing is hidden", () => {
    const result = redact(resume, []);
    expect(result.resume).toBe(resume);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    ["phone", "phone"],
    ["email", "email"],
    ["website", "url"],
    ["profiles", "profiles"],
    ["image", "image"],
    ["location", "location"],
  ] as const)("hides %s", (field, key) => {
    const basics = basicsOf(redact(resume, [field]).resume);
    expect(basics).not.toHaveProperty(key);
    expect(basics["name"]).toBe("Jane Doe"); // the rest is untouched
  });

  it("address removes the street and postal code but keeps city and country", () => {
    const location = basicsOf(redact(resume, ["address"]).resume)["location"];
    expect(location).toEqual({ city: "Springfield", countryCode: "US" });
  });

  it("the public preset hides phone, email, address and image but keeps the ways to reach the person", () => {
    const { resume: out, warnings } = redact(resume, PUBLIC_PRESET);
    const basics = basicsOf(out);
    expect(basics).not.toHaveProperty("phone");
    expect(basics).not.toHaveProperty("email");
    expect(basics).not.toHaveProperty("image");
    expect(basics["location"]).toEqual({ city: "Springfield", countryCode: "US" });
    expect(basics["url"]).toBe("https://jane.example.com");
    expect(basics["profiles"]).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it("the data is gone from the result, not just flagged", () => {
    expect(JSON.stringify(redact(resume, PUBLIC_PRESET).resume)).not.toMatch(/555 0100|jane@example|1 Main St|12345|me\.jpg/);
  });

  it("does not mutate the input and leaves other sections alone", () => {
    const before = JSON.stringify(resume);
    const { resume: out } = redact(resume, [...HIDEABLE]);
    expect(JSON.stringify(resume)).toBe(before);
    expect(out["work"]).toEqual(resume["work"]);
  });

  it("warns when nothing is left to contact the person", () => {
    const { warnings } = redact(resume, ["phone", "email", "website", "profiles"]);
    expect(warnings[0]).toContain("nothing is left to contact");
  });

  it("copes with a resume that has no basics details", () => {
    const bare = { basics: { name: "X" } } as unknown as ResolvedResume;
    expect(() => redact(bare, [...HIDEABLE])).not.toThrow();
  });
});
