# CV Factory

Manage your CV as structured data and render tailored, ATS-friendly **PDFs** from
it.

- **One source of truth** per person, in [JSON Resume](https://jsonresume.org/schema) format.
- **Variants**: different CVs for different kinds of roles, generated from the same data.
- **Languages**: English (base) and Spanish, translated item by item.
- **Templates**: swappable visual styles.
- **Multiple people** in one repository.

> **Status:** Phase 1 — the end-to-end flow works (validate → compose → render
> to PDF) with the `example` person and the `classic` template.

## Concepts

| Concept | Meaning |
|---|---|
| Person | Owner of a CV (`people/<slug>/`) |
| Source of truth | All of a person's information (`people/<slug>/source.json`) |
| Variant | Which content to show for a kind of role (`people/<slug>/variants/<name>.yaml`) |
| Language | `en` (base) or `es` |
| Template | How the PDF looks (`templates/typst/<name>/`) |

A PDF is the combination of person, variant, language and template, and is
written to `output/<person>_<variant>_<lang>.pdf`.

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

## Usage
`cv-factory <command>` below means `npm run dev -- <command>` (or
`npm run build` once, then `node dist/cli/index.js <command>`).
```
cv-factory list-people
cv-factory list-variants --person example
cv-factory validate --person example
cv-factory compose backend --lang es          # prints the resolved resume.json
cv-factory render backend --lang es           # writes output/example_backend_es.pdf
```
`--person` can be omitted when there is only one person. Missing translations
are reported as warnings on stderr and fall back to English. If `typst` is not on
your `PATH` (for example in a terminal opened before installing it), set
`CV_FACTORY_TYPST` to the executable. Step-by-step guides (adding a job,
creating a variant, translating, versioning) are in
[docs/workflow.md](docs/workflow.md).

## Your own data
Real people live in `people/<slug>/` and are **git-ignored** so personal data is
never committed; only `people/example/` is versioned. Start by copying it:
```
cp -r people/example people/your-name
```
Slugs use lowercase letters, digits and hyphens only.

## Documentation
- [AGENTS.md](AGENTS.md) — project rules and conventions
- [docs/architecture.md](docs/architecture.md)
- [docs/data-schema.md](docs/data-schema.md)
- [docs/workflow.md](docs/workflow.md)
