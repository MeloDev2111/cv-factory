# Data schema

A person's source of truth is `people/<slug>/source.json`, written in the base
language (English) and validated against the
[JSON Resume schema](https://jsonresume.org/schema), vendored in `schema/`.
Anything specific to cv-factory lives under the `x-cv-factory` key, which the
standard schema tolerates, so the file stays valid JSON Resume.

## JSON Resume fields in use

| Section | Fields used |
|---|---|
| `basics` | `name`, `label`, `email`, `phone`, `url`, `summary`, `location` (`city`, `countryCode`, `region`), `profiles[]` (`network`, `username`, `url`) |
| `work[]` | `name`, `position`, `url`, `startDate`, `endDate`, `summary`, `highlights[]` |
| `education[]` | `institution`, `url`, `area`, `studyType`, `startDate`, `endDate`, `score` |
| `skills[]` | `name`, `level`, `keywords[]` |
| `projects[]` | `name`, `description`, `highlights[]`, `url`, `startDate`, `endDate`, `keywords[]` |
| `certificates[]` | `name`, `date`, `issuer`, `url` |

Dates use ISO 8601 (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`); omit `endDate` for
current positions. Sections not listed are not rendered by the default template.

## Extensions: `x-cv-factory`

### On any item (`work[]`, `projects[]`, `skills[]`, ...)
```json
"x-cv-factory": {
  "tags": ["backend", "node"],
  "i18n": {
    "es": { "position": "Ingeniero Backend", "highlights": ["..."] }
  }
}
```

| Key | Why it is needed |
|---|---|
| `tags` | JSON Resume has no way to say which roles an item is relevant to. Variants filter by these tags. Items without `tags` are universal and always kept. |
| `i18n.<lang>` | JSON Resume has no localization. Holds the fields to override when rendering in `<lang>`. Keys must be fields that exist on the item. |

### Rules for `i18n`
- Top-level fields are the base language (English); `i18n.es` overrides them.
- Arrays (e.g. `highlights`) are replaced as a whole, not merged element by element.
- A missing translation falls back to the base text and produces a warning that
  lists the untranslated fields. It does not fail the build.
- Do not add `i18n` to fields that need none: certification names, company and
  institution names, URLs, dates, skill keywords.

### On `basics`
`basics` accepts the same `x-cv-factory.i18n` (e.g. translated `label` and
`summary`). `tags` has no effect there.

## Variant schema (`schema/variant.schema.json`)
```yaml
name: backend          # [a-z0-9-]+, equals the file name
description: string    # optional
lang: en               # optional default language: en | es
template: classic      # optional default template
basics: { ... }        # optional shallow override of basics
sections: [work, ...]  # optional; presence and order of sections
filter: { tags: [...] }# optional; keep items with ANY listed tag (plus untagged)
limits: { work: 4 }    # optional; max items per section
```
Variants never contain resume content beyond the `basics` override; they only
reference and filter the source.

## Adding a new extension
Any new `x-cv-factory` key must be added to this document with the reason it
cannot be expressed in plain JSON Resume, and to the schema in `schema/`.
