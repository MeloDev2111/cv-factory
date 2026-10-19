# Architecture

## Two views of the same system

### Data flow: three layers
```
 DATA                    COMPOSITION                      RENDER
 people/<slug>/          compose(source, variant, lang)   renderer(resume.json, template)
   source.json   ──┐                                        │
   variants/*.yaml ┼──►  resolved resume.json  ───────────► output/<person>_<variant>_<lang>.pdf
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

## Renderer contract
```ts
interface Renderer {
  render(resume: ResolvedResume, opts: { template: string; outPath: string }): Promise<void>;
}
```
`typst-renderer` writes the resolved JSON to a temporary location, runs
`typst compile` with `--root` and `--input` pointing at it, and surfaces Typst's
errors. Typst only reads files under `--root`, so the JSON is staged inside it.
A missing `typst` binary is detected up front with install instructions.

## Templates
A template is a folder `templates/typst/<name>/` containing `main.typ` and an
`i18n.json` with the labels per language (section titles, date format). It
consumes only the resolved `resume.json`. Adding a template requires no code
change.

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
