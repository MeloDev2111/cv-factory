# CV Factory

## Project overview
cv-factory is a CLI tool that manages CVs/resumes as structured, version-controlled
data and renders them into polished, ATS-friendly **PDF** documents. One person's
single source of truth can produce many tailored CVs (variants), in more than one
language, with different visual styles (templates). It supports multiple people.

PDF is the only supported output format. Do not add HTML or other formats.

## Status
The end-to-end flow (validate, compose, render to PDF) works, with three templates
(`classic`, `modern`, `clean`) and two fictional people: `example` (minimal) and `showcase`
(complete; exercises every section, variant option and both languages). See
`docs/workflow.md` for usage. Run `npm test` and `npm run typecheck` before
committing. `showcase` must stay valid and fully translated: a test enforces it.

## Glossary
| Concept | Meaning | Lives in |
|---|---|---|
| Person | Owner of a CV; owns a source of truth and its variants | `people/<slug>/` |
| Source of truth | All of a person's information, in the base language | `people/<slug>/source.json` |
| Variant | Which content to show, and with what emphasis, for a kind of role | `people/<slug>/variants/<name>.yaml` |
| Language | Language of the rendered content (`en`, `es`) | `--lang` flag, `x-cv-factory.i18n` |
| Template | How the PDF looks (layout, typography) | `templates/typst/<name>/` |

A PDF is the combination `person x variant x language x template`. These
dimensions are independent: never encode one inside another.

## Core principles
- Single source of truth per person: `people/<slug>/source.json`, following the
  [JSON Resume schema](https://jsonresume.org/schema), extended only through the
  `x-cv-factory` namespace so it keeps validating against the standard schema.
- Variants are declarative filters/overrides, not duplicated data.
- Translations live next to the content they translate (`x-cv-factory.i18n`),
  never in separate per-language copies of the source.
- Rendering is decoupled from data: swapping the renderer must not require
  changing the domain or the data.
- Personal data is never committed (see "Personal data").

## Tech stack
- Node.js (LTS, >= 22) and **TypeScript in `strict` mode**.
- JSON Schema + Ajv for runtime validation; TypeScript types are generated from
  the schemas (`json-schema-to-typescript`), so the schemas stay authoritative.
- Typst, via the **official `typst` binary** (https://github.com/typst/typst)
  invoked as an external process. Do not add third-party npm packages that wrap
  Typst. RenderCV is a possible future adapter, not part of the MVP.
- YAML for variant definitions.
- Vitest for tests. `tsx` for development, `tsc` for builds.

## Architecture: lightweight hexagonal (ports and adapters)
```
src/
  domain/    pure logic and types; no fs, no processes
  ports/     interfaces the domain/app depend on (e.g. Renderer)
  adapters/  implementations of ports (typst-renderer, fs-repository)
  app/       use cases: validate, compose, render, listVariants, listPeople
  cli/       thin layer: parse arguments, call app/, print results
```
Dependency rule: `cli -> app -> domain`; `adapters` implement `ports`. The domain
never imports from `adapters`, `app` or `cli`. Details in `docs/architecture.md`.

## Repository layout
```
people/
  example/            minimal fictional person (versioned)
  showcase/           complete fictional person (versioned)
    source.json
    variants/
    output/           generated PDFs (versioned only for showcase)
  <slug>/             real people (git-ignored)
templates/typst/
  _shared/            lib.typ, i18n.json and fonts/ (Source Sans 3) used by every template
  <template>/         main.typ (+ optional fonts/ with their license)
schema/               vendored JSON Resume schema + variant schema
src/                  see Architecture
test/
docs/
```

## README previews
`docs/img/preview-<template>.png` are page-1 images of the `showcase` CV (classic ·
backend, modern · frontend, clean · full, all `--lang en`) shown in the README
gallery. They are documentation assets, not a product feature: there is no PNG
export in the tool and none must be added. They are made by hand with the Typst CLI
on the same staged input the renderer uses, and go stale like the sample PDFs, so
regenerate them after changing a template or the showcase data:
```
# stage: templates copied to <stage>/templates, resolved resume at <stage>/resume.json
cvf compose backend --person showcase --lang en -o <stage>/resume.json
typst compile --root <stage> --ignore-system-fonts \
  --font-path <stage>/templates/_shared/fonts --format png --ppi 110 --pages 1 \
  <stage>/templates/classic/main.typ docs/img/preview-classic.png
```

## Naming rules
- Person slug, variant name and template name match `[a-z0-9-]+` (lowercase,
  digits, hyphens; no dots, underscores or spaces). Folder/file names equal these
  identifiers.
- Output file: `people/<person>/output/<person>_<variant>_<lang>_<template>_<YYYY-MM-DD>.pdf`,
  e.g. `people/jane-doe/output/jane-doe_backend_es_classic_2026-10-19.pdf`. The person is
  in both the folder and the file name, so a PDF stays identifiable once it is
  moved or attached. `_` is the only separator, which is why it is forbidden
  inside identifiers (the date uses hyphens, so the name splits cleanly on `_`).
  Every dimension of the combination is in the name; never drop one, or renders
  overwrite each other.
- A render with personal data hidden (`--hide`/`--public`) adds `_redacted` after
  the template (`..._classic_redacted_2026-10-19.pdf`), so it never replaces the
  full CV. Never drop this marker.
- The date is the **local** date (not UTC) and is the file's version: another day
  creates a new file, the same day replaces it. `--no-date` omits it (stable
  name); the versioned `people/showcase/output/` samples use it so regenerating them does
  not rename files. The date reaches the app layer through `Deps.today`, never
  through `new Date()` in the app or domain.

## Languages
- Base language is **English**: top-level fields in `source.json` are English.
- Translations: `x-cv-factory.i18n.<lang>` on the item, containing the fields to
  override. Missing translations fall back to the base text and are reported as a
  warning listing the untranslated fields; they never fail the build.
- Fields that need no translation (certifications, company/institution names,
  URLs, dates, skill keywords) simply carry no `i18n`.
- Template labels (section titles, month names) come from
  `templates/typst/_shared/i18n.json`.

## Commands
The binary is `cvf` (alias `cv-factory`, both declared in `package.json` `bin`).
Keep the CLI name short in docs and examples; the data key stays `x-cv-factory`.
All commands accept `--person <slug>`; it defaults to the only person when there
is exactly one, and errors listing the options otherwise.
- `cvf validate` — validate the person's `source.json` and variants.
- `cvf compose <variant> [--lang en|es]` — merge source + variant +
  language into a resolved `resume.json`.
- `cvf render <variant> [--lang en|es] [--template <name>] [--no-date]` —
  compose, then render to
  `people/<person>/output/<person>_<variant>_<lang>_<template>_<YYYY-MM-DD>.pdf`.
- `compose`, `render` and `render-all` also accept `--public` (hides phone, email,
  address, image) and `--hide <list>` (any of phone, email, address, location,
  website, profiles, image). Redaction is the pure `domain/redact.ts`, applied after
  `compose` and before rendering, so hidden data never reaches a template or the PDF.
  Warns when no way to contact the person is left.
- `cvf render-all [--variants a,b] [--langs en,es] [--templates x,y]
  [--no-date]` — render every variant x language x template (each filter defaults
  to "all"). Validates once up front, rejects unknown names, keeps going when one
  combination fails and exits 1 if any did. Templates are discovered via
  `Renderer.listTemplates()`.
- `cvf list-variants` — list the person's variants.
- `cvf list-people` — list available people.

## Variant format (YAML)
```yaml
name: backend            # must equal the file name
description: Backend roles
lang: en                 # optional default language
template: classic        # optional default template
basics: { label: Backend Engineer }   # shallow override of basics
i18n: { es: { basics: { label: Ingeniero Backend } } }   # per-language basics override
sections: [work, projects, skills, education, certificates]  # presence and order
filter:
  tags: [backend]                     # items tagged with ANY of these are kept
  sections: [work, projects, skills]  # optional: apply the tag filter only to these (default: all)
require: { certificates: [featured] } # per section, strict: untagged items are dropped
sort: { certificates: { by: date } }  # per section; order desc (default) | asc
limits: { work: 4, projects: 3 }      # max items per section, applied last
```
Per section the order is `filter`, `require`, `sort`, `limits`, then translation.
Under `filter`, items without `x-cv-factory.tags` are universal and always kept;
under `require` they are dropped. `require` is applied on top of `filter`, so
scope the filter with `filter.sections` when they would conflict.

## Coding conventions
- Keep CLI commands small and composable (one file per command/concern).
- `compose` is a pure function: `(source, variant, lang) -> ResolvedResume`.
- Validate data before rendering; fail fast with clear error messages.
- Templates consume only the resolved `resume.json`, never `source.json`.
- No variant logic in templates or renderers; variants are pure data.
- Document any schema extension in `docs/data-schema.md`.

## Personal data
`people/*` is git-ignored except the fictional `people/example/` and
`people/showcase/`. Generated PDFs live in `people/<slug>/output/`, so a person's
inputs and outputs travel together; only `people/showcase/output/` has versioned
sample PDFs (regenerate with `npm run samples` after changing a template or the
showcase data). Never commit real personal data or generated PDFs. A real
person's folder may be its own private Git repository, which is where their data
is versioned and tagged (decide there whether `output/` is committed or ignored). To publish a
public-safe person, un-ignore that folder explicitly in `.gitignore`.

## What NOT to do
- Don't duplicate resume content across variant files.
- Don't keep per-language copies of `source.json`.
- Don't couple the app or domain to Typst; only `adapters/typst-renderer.ts` may
  know about it.
- Don't add output formats other than PDF.
- Don't derive identifiers (slugs) from display names.
