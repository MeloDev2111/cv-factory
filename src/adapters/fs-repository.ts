import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CvFactoryError } from "../domain/errors.js";
import { assertIdentifier, isIdentifier } from "../domain/naming.js";
import type { PersonRepository } from "../ports/person-repository.js";

async function exists(file: string): Promise<boolean> {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

async function readText(file: string, label: string): Promise<string> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CvFactoryError(`${label} not found: ${file}`);
    }
    throw error;
  }
}

/** Reads `<peopleDir>/<slug>/source.json` and `<peopleDir>/<slug>/variants/<name>.yaml`. */
export class FsPersonRepository implements PersonRepository {
  constructor(private readonly peopleDir: string) {}

  async listPeople(): Promise<string[]> {
    let entries;
    try {
      entries = await readdir(this.peopleDir, { withFileTypes: true });
    } catch {
      return [];
    }
    const people: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !isIdentifier(entry.name)) continue;
      if (await exists(path.join(this.peopleDir, entry.name, "source.json"))) {
        people.push(entry.name);
      }
    }
    return people.sort();
  }

  async loadSource(person: string): Promise<unknown> {
    assertIdentifier("person slug", person);
    const file = path.join(this.peopleDir, person, "source.json");
    const text = await readText(file, "Source file");
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new CvFactoryError(`${file} is not valid JSON: ${(error as Error).message}`);
    }
  }

  async listVariants(person: string): Promise<string[]> {
    assertIdentifier("person slug", person);
    try {
      const files = await readdir(path.join(this.peopleDir, person, "variants"));
      return files
        .filter((f) => f.endsWith(".yaml"))
        .map((f) => f.slice(0, -".yaml".length))
        .sort();
    } catch {
      return [];
    }
  }

  async loadVariant(person: string, name: string): Promise<unknown> {
    assertIdentifier("person slug", person);
    assertIdentifier("variant name", name);
    const file = path.join(this.peopleDir, person, "variants", `${name}.yaml`);
    const text = await readText(file, `Variant "${name}"`);
    try {
      return parseYaml(text);
    } catch (error) {
      throw new CvFactoryError(`${file} is not valid YAML: ${(error as Error).message}`);
    }
  }
}
