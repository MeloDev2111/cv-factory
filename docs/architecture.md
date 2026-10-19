# Architecture

## Two views of the same system

### Data flow: three layers
```
 DATA                    COMPOSITION                      RENDER
 people/<slug>/          compose(source, variant, lang)   renderer(resume.json, template)
   source.json   ──┐                                        │
   variants/*.yaml ┼──►  resolved resume.json  ───────────► output/<person>/<person>_<variant>_<lang>_<template>_<YYYY-MM-DD>.pdf
 schema/*.json   ──┘     (filtered, ordered, translated)    (Typst)
```
1. **Data layer.** A person's `source.json` (JSON Resume + `x-cv-factory`) and
   their variant YAML files, validated against the JSON Schemas in `schema/`.
2. **Composition layer.** A pure function that applies a variant (filter by
   tags, section order, limits, overrides) and a language (`x-cv-factory.i18n`
   overlay with fallback) to the source, producing a resolved `resume.json`.
3. **Render layer.** Turns the resolved JSON into a PDF with a template.

Why the separation matters:
- Swap the renderer (e.g. RenderCV later) without touching data or composition.
- Add variants, languages or templates without duplicating content.
- Test composition without any renderer or filesystem.

### Code structure: lightweight hexagonal
```
 cli ──► app (use cases) ──► domain (pure)
              │
              ▼
           ports (interfaces) ◄── adapters (fs-repository, typst-renderer)
```

| Folder | Responsibility |
|---|---|
| `src/domain/` | Types and pure logic (`compose`, language overlay, tag filtering). No I/O. |
| `src/ports/` | Interfaces: `Renderer`, `PersonRepository` (read source and variants). |
| `src/adapters/` | `fs-repository` (reads `people/`), `typst-renderer` (spawns `typst`). |
| `src/app/` | Use cases: `validate`, `compose`, `render`, `listVariants`, `listPeople`. |
| `src/cli/` | Argument parsing and output only. |

Rules:
- Dependencies point inward: `cli -> app -> domain`. The domain imports nothing
  from the other layers.
- Adapters implement ports; the app depends on the port, never on an adapter
  (adapters are wired in the CLI entry point).
- Only `typst-renderer` knows about Typst.

## Time
The app layer never reads the clock. The current date reaches it as `Deps.today()`
(a `YYYY-MM-DD` string), wired in the CLI entry point from the local date, so use
cases stay deterministic and testable. It is used only for the PDF file name.

## Renderer contract
```ts
interface Renderer {
  render(resume: ResolvedResume, opts: { template: string; outPath: string }): Promise<void>;
  listTemplates(): Promise<string[]>;   // used by `render-all` to discover templates
}
```
`typst-renderer` lists a template for every folder under `templates/typst/` that has
a `main.typ` (folders starting with `_`, such as `_shared`, are not templates).
Typst only reads files under `--root`, so `typst-renderer` stages everything in
a temporary directory and compiles from there:
```
<stage>/resume.json                  the resolved resume; templates read json("/resume.json")
<stage>/templates/<name>/main.typ    the whole templates folder, copied as-is
```
It runs `typst compile --root <stage> --ignore-system-fonts
[--font-path <stage>/templates/_shared/fonts] [--font-path <template>/fonts]
<stage>/templates/<name>/main.typ <out.pdf>`,
surfaces Typst's stderr on failure and always removes the stage directory. A
missing `typst` binary is detected up front with install instructions; the
binary can be overridden with the `CV_FACTORY_TYPST` environment variable.

## Templates
```
templates/typst/
  _shared/lib.typ      loads /resume.json; date, link, contact and grouping helpers
  _shared/i18n.json    labels per language: section titles, month names, country names, "present"
  _shared/fonts/       Source Sans 3 (OFL) available to every template
  classic/main.typ     serif, centered header
  modern/main.typ      sans-serif, accent color
  clean/main.typ       sans-serif, black ink, roles grouped by employer
```
A template is a folder with a `main.typ` that imports
`/templates/_shared/lib.typ`. It consumes only the resolved `resume.json` and
takes the language from `meta["x-cv-factory"].lang`. Adding a template requires
no code change. Templates render `work`, `volunteer`, `projects`, `education`,
`skills`, `certificates`, `awards`, `publications`, `languages` and `interests`,
in the order they appear in the resolved resume; other sections are ignored.
`_shared` is not a valid template name (names are `[a-z0-9-]+`).

Rules the bundled templates follow, so PDFs stay ATS friendly:
- Plain text in reading order; no icons, images or tables for body content.
- No letter-spacing (`tracking`) on headings: it makes text extraction read
  "E X P E R I E N C E", which ATS parsers do not recognize as a section.
- No hyphenation and no justified text in `clean`: split words ("asegu-rando")
  hurt extraction, and justifying without hyphenation squeezes word spaces.
- Short list sections (`skills`, `certificates`, `languages`, `interests`) are
  kept on one page; long sections flow across pages.

Fonts: `classic` uses Typst's bundled Libertinus Serif. `modern` and `clean` use
Source Sans 3 from `_shared/fonts/`. A template that needs other fonts ships them
in `<template>/fonts/`. The renderer passes both folders as `--font-path` and
always runs with `--ignore-system-fonts`, so the PDF does not depend on what is
installed on the machine.

## Languages
`compose` is language-aware; renderers are not. Content translation is resolved
before rendering; the template only picks its own static labels by language.

## Decisions log
| Decision | Rationale |
|---|---|
| PDF only | The only format needed for sharing; avoids unused code paths. |
| Official `typst` binary, no npm wrapper | First-party, verifiable; no third-party native dependency. |
| Typst directly, RenderCV deferred | RenderCV needs Python and its own schema; Typst reads JSON natively. |
| Translations in `x-cv-factory.i18n` | Keeps one source, validates as JSON Resume, translation sits beside the original. |
| Slugs from folder names | Display names contain accents and spaces; identifiers must be stable. |
