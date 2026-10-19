// Regenerates the versioned sample PDFs in people/showcase/output/ (every variant, both languages,
// each variant's own template). Needs the `typst` binary (see README).
// Samples are rendered with --no-date: a date in the name would rename every file on each
// regeneration and clutter the Git history.
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const person = "showcase";
const cli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const run = (...args) =>
  execFileSync(process.execPath, [cli, path.join(root, "src", "cli", "index.ts"), ...args], {
    cwd: root,
    encoding: "utf8",
  });

const variants = readdirSync(path.join(root, "people", person, "variants"))
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => f.slice(0, -".yaml".length))
  .sort();

// Start clean so renamed or removed variants do not leave stale PDFs behind.
rmSync(path.join(root, "people", person, "output"), { recursive: true, force: true });

for (const variant of variants) {
  for (const lang of ["en", "es"]) {
    process.stdout.write(run("render", variant, "--person", person, "--lang", lang, "--no-date"));
  }
}

// A shareable version (phone, email, address and photo hidden), marked `_redacted` in its name.
process.stdout.write(
  run("render", "backend", "--person", person, "--lang", "en", "--public", "--no-date"),
);

// One extra sample per template, so every template is shown on the same content.
const templates = readdirSync(path.join(root, "templates", "typst"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();
for (const template of templates) {
  process.stdout.write(
    run("render", "full", "--person", person, "--lang", "en", "--template", template, "--no-date"),
  );
}
