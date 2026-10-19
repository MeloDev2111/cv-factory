# CV Factory

Manage your CV as structured data and render tailored, ATS-friendly **PDFs** from
it.

- **One source of truth** per person, in [JSON Resume](https://jsonresume.org/schema) format.
- **Variants**: different CVs for different kinds of roles, generated from the same data.
- **Languages**: English (base) and Spanish, translated item by item.
- **Templates**: swappable visual styles (`classic`, `modern`, `clean`).
- **Multiple people** in one repository.

> **Status:** the end-to-end flow works (validate → compose → render to PDF).
> Two fictional people are included: `example` (minimal starting point) and
> `showcase` (a complete CV that exercises everything).

## Concepts

| Concept | Meaning |
|---|---|
| Person | Owner of a CV (`people/<slug>/`) |
| Source of truth | All of a person's information (`people/<slug>/source.json`) |
| Variant | Which content to show for a kind of role (`people/<slug>/variants/<name>.yaml`) |
| Language | `en` (base) or `es` |
| Template | How the PDF looks (`templates/typst/<name>/`) |

A PDF is the combination of person, variant, language and template, and is
written to `output/<person>/<person>_<variant>_<lang>_<template>.pdf`, for example
`output/showcase/showcase_backend_es_classic.pdf` (one folder per person, all
git-ignored). Every dimension is in the name, so
different combinations never overwrite each other (re-rendering the *same*
combination does replace its file).

## Prerequisites

### Node.js
Node.js LTS, version 22 or newer. Check with `node --version`.

### Typst (PDF engine)
cv-factory calls the official `typst` command-line binary
([typst/typst](https://github.com/typst/typst)). Install it with one of:

**Windows (winget, recommended)**
```powershell
winget install --id Typst.Typst
```
Then **open a new terminal** so the updated `PATH` is picked up.

**Other options**
- Download the archive for your platform from the
  [GitHub Releases](https://github.com/typst/typst/releases) and put `typst` in a
  directory on your `PATH`. Package managers can lag behind this.
- macOS: `brew install typst`
- Any platform with Rust: `cargo install --locked typst-cli`

**Verify**
```
typst --version
```
Should print a version (developed against 0.15.1). Update later with
`winget upgrade Typst.Typst` (or `typst update` if you installed from a release
archive).

## Setup
```
npm install
npm test          # optional sanity check
```

## Sample output
The PDFs generated from the fictional `showcase` person are versioned in
[`output/showcase/`](output/showcase/), so you can see what the tool produces
without installing anything: every variant in English and Spanish, plus the same
CV (`full` variant) in each template (`..._classic.pdf`, `..._modern.pdf`,
`..._clean.pdf`). After changing a template, the data of `showcase` or the render
logic, regenerate them with:
```
npm run samples
```
Every other person's PDFs (`output/<person>/`) are git-ignored.

## Usage
`cv-factory <command>` below means `npm run dev -- <command>` (or
`npm run build` once, then `node dist/cli/index.js <command>`).
```
cv-factory list-people
cv-factory list-variants --person showcase
cv-factory validate --person showcase
cv-factory compose backend --person showcase --lang es   # prints the resolved resume.json
cv-factory render backend --person showcase --lang es    # writes output/showcase/showcase_backend_es_classic.pdf
cv-factory render backend --person showcase --template modern   # writes output/showcase/showcase_backend_en_modern.pdf
```
`--person` can be omitted only when there is exactly one person. Missing
translations are reported as warnings on stderr and fall back to English. If
`typst` is not on your `PATH` (for example in a terminal opened before installing
it), set `CV_FACTORY_TYPST` to the executable. Step-by-step guides (adding a job,
creating a variant, translating, versioning) are in
[docs/workflow.md](docs/workflow.md).

## Templates
| Template | Look |
|---|---|
| `classic` (default) | Serif, black on white, centered header. |
| `modern` | Sans-serif (bundled Source Sans 3), one accent color, left-aligned header. |
| `clean` | Sans-serif, black ink, centered `Name \| Role` header with contact in three columns, full month names, hyphen bullets. Groups several consecutive roles at the same employer under one heading. |

All are single-column, plain text in reading order, with no icons, images or
tables, so ATS parsers can extract them cleanly. Pick one per run with
`--template`, or per variant with `template:` in the variant file. All render
`work`, `volunteer`, `projects`, `education`, `skills`, `certificates`, `awards`,
`publications`, `languages` and `interests`.

**Several roles at one employer.** Write one `work` entry per role, with the same
`name` and consecutive in the file. `clean` shows the employer once with the
overall date range and lists the roles under it; `classic` and `modern` repeat
the employer on each role.

## Common scenarios

### Keep every certification in the source, show only some
Put all of them in `source.json`. Each variant decides what to show, using three
independent options that you can combine per section:

| Option | What it does |
|---|---|
| `sort` | Orders a section by a field. Default order is descending (most recent first); items without the field go last. |
| `require` | Strict tag filter: keeps only items carrying one of the listed tags. Untagged items are dropped. |
| `limits` | Keeps the first N items, after filtering and sorting. |

**The 6 most recent certifications**
```yaml
sort:
  certificates: { by: date }
limits:
  certificates: 6
```

**The 6 featured certifications, most recent first.** Tag the ones you want to
highlight in `source.json` (`"x-cv-factory": { "tags": ["featured"] }`), then:
```yaml
require:
  certificates: [featured]
sort:
  certificates: { by: date }
limits:
  certificates: 6
```
If fewer than 6 are tagged, you simply get fewer. Different variants can feature
different certifications by using different tags (`featured`, `cloud`, `security`...).

**Mixing with the global tag filter.** `filter.tags` applies to *every* section
by default, and `require` is applied on top of it, so a variant that filters by
`backend` would also drop featured certifications that are not tagged `backend`.
Scope the global filter to the sections that need it:
```yaml
filter:
  tags: [backend, platform]
  sections: [work, projects, skills]   # certificates are left to `require`
```
See `people/showcase/variants/backend.yaml` (featured) and `frontend.yaml` (most
recent) for working examples.

### Another role, same data
Create `people/<slug>/variants/<name>.yaml`, tag your items in `source.json`, and
filter by those tags. See [docs/workflow.md](docs/workflow.md#3-create-a-variant-for-a-kind-of-role).

### A different language for one variant
Add `x-cv-factory.i18n.es` to the items you want translated and render with
`--lang es`. Fields you leave out fall back to English with a warning; see
[docs/data-schema.md](docs/data-schema.md#rules-for-i18n).

## Your own data
Real people live in `people/<slug>/` and are **git-ignored** so personal data is
never committed; only the fictional `example` and `showcase` are versioned. Start
from the minimal one (or from `showcase` if you want to see every option):
```
cp -r people/example people/your-name
```
Slugs use lowercase letters, digits and hyphens only.

## Documentation
- [AGENTS.md](AGENTS.md) — project rules and conventions
- [docs/architecture.md](docs/architecture.md)
- [docs/data-schema.md](docs/data-schema.md)
- [docs/workflow.md](docs/workflow.md)

## Licenses
The `modern` and `clean` templates use Source Sans 3 (Adobe), bundled in
`templates/typst/_shared/fonts/` and licensed under the SIL Open Font License 1.1;
the license is in that folder.
