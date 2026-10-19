import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CvFactoryError } from "../domain/errors.js";
import type { ResolvedResume } from "../domain/types.js";
import type { RenderOptions, Renderer } from "../ports/renderer.js";

const run = promisify(execFile);

const INSTALL_HINT = [
  "The official `typst` binary was not found on your PATH.",
  "Install it (Windows): winget install --id Typst.Typst, then open a new terminal.",
  "Other options: https://github.com/typst/typst#installation",
  "Or point CV_FACTORY_TYPST at the executable.",
].join("\n");

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Renders with the official `typst` CLI.
 * Typst only reads files under `--root`, so everything is staged in a temporary directory:
 *   <stage>/resume.json                 the resolved resume; templates read json("/resume.json")
 *   <stage>/templates/<name>/main.typ   the whole templates folder, copied as-is, so templates
 *                                       can import /templates/_shared/...
 * System fonts are ignored: templates get Typst's bundled fonts plus their own
 * `<template>/fonts/`, which makes the PDF identical on every machine.
 */
export class TypstRenderer implements Renderer {
  constructor(
    private readonly templatesDir: string,
    private readonly binary: string = process.env["CV_FACTORY_TYPST"] ?? "typst",
  ) {}

  async render(resume: ResolvedResume, { template, outPath }: RenderOptions): Promise<void> {
    await this.assertAvailable();
    if (!(await exists(path.join(this.templatesDir, template, "main.typ")))) {
      throw new CvFactoryError(`Template "${template}" not found in ${this.templatesDir}.`);
    }

    const stage = await mkdtemp(path.join(tmpdir(), "cv-factory-"));
    try {
      await cp(this.templatesDir, path.join(stage, "templates"), { recursive: true });
      await writeFile(path.join(stage, "resume.json"), JSON.stringify(resume, null, 2));
      const out = path.resolve(outPath);
      await mkdir(path.dirname(out), { recursive: true });

      const staged = path.join(stage, "templates", template);
      const args = ["compile", "--root", stage, "--ignore-system-fonts"];
      if (await exists(path.join(staged, "fonts"))) {
        args.push("--font-path", path.join(staged, "fonts"));
      }
      args.push(path.join(staged, "main.typ"), out);
      await run(this.binary, args, { windowsHide: true });
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr;
      throw new CvFactoryError(`Typst failed to render:\n${stderr?.trim() || (error as Error).message}`);
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }

  private async assertAvailable(): Promise<void> {
    try {
      await run(this.binary, ["--version"], { windowsHide: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new CvFactoryError(INSTALL_HINT);
      }
      throw error;
    }
  }
}
