import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentDir = path.join(root, "docs", "agent");

/** GitHub-style heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/ /g, "-");
}

function anchorsOf(file: string): Set<string> {
  const headings = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) => line.replace(/^#{1,6} /, ""));
  return new Set(headings.map(anchor));
}

/** Relative Markdown links `[text](target)`, ignoring URLs. */
function relativeLinks(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1] as string)
    .filter((target) => !/^[a-z]+:/i.test(target));
}

describe("playbooks for AI assistants (docs/agent)", () => {
  const files = readdirSync(agentDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(agentDir, f));

  it("has the index and the three playbooks", () => {
    const names = files.map((f) => path.basename(f)).sort();
    expect(names).toEqual(["README.md", "from-pdf.md", "from-scratch.md", "review.md"]);
  });

  it.each(files.map((f) => [path.basename(f), f] as const))(
    "%s: every relative link points to an existing file and heading",
    (_name, file) => {
      for (const link of relativeLinks(file)) {
        const [target = "", hash] = link.split("#");
        const resolved = target === "" ? file : path.resolve(path.dirname(file), target);
        expect(existsSync(resolved), `${link} (file not found)`).toBe(true);
        if (hash && resolved.endsWith(".md")) {
          expect(anchorsOf(resolved).has(hash), `${link} (no such heading)`).toBe(true);
        }
      }
    },
  );

  it("is reachable from AGENTS.md and the README", () => {
    for (const entry of ["AGENTS.md", "README.md"]) {
      expect(readFileSync(path.join(root, entry), "utf8")).toContain("docs/agent/");
    }
  });
});
