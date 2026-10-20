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
| `work[]` | `name`, `position`, `location`, `url`, `startDate`, `endDate`, `summary`, `highlights[]` |
| `education[]` | `institution`, `url`, `area`, `studyType`, `startDate`, `endDate`, `score` |
| `skills[]` | `name`, `level`, `keywords[]` |
| `projects[]` | `name`, `description`, `highlights[]`, `url`, `startDate`, `endDate`, `keywords[]` |
| `certificates[]` | `name`, `date`, `issuer`, `url` |

Dates use ISO 8601 (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`); omit `endDate` for
current positions. Sections not listed are not rendered by the bundled templates.

Notes on how the bundled templates read these fields:
- `basics.location.countryCode` is an ISO 3166-1 alpha-2 code; the template shows
  the country name in the output language (for the codes in
  `templates/typst/_shared/i18n.json`) and the bare code otherwise.
- A `basics.profiles[]` entry may omit `url`; it is then shown as plain text
  (`LinkedIn: Name`) without a link.
- Several roles at one employer are separate `work[]` entries with the same
  `name`, consecutive in the file. The `clean` template groups them.
- `education[].score` is free text shown as written, with no label added: write
  "GPA 3.8/4.0" or "First place" (and its translation in `i18n`).
- `awards[]` has a single `date`. For an award held over a period, omit `date` and
  write the period in `summary` ("January – December 2024").

### Skills are groups
In JSON Resume, `skills[]` is a list of **groups**: `name` is the category, `level`
is optional and `keywords[]` are the items (`{ "name": "Database", "keywords":
["PostgreSQL", "MySQL"] }`). The specification does not require `name` to be a
category; that is the convention this project follows. The templates only print
the name followed by its keywords. The extensions below (`tags`, `i18n`) and the
variant options (`filter`, `require`, `sort`, `limits`) act on the **whole group**,
never on a single keyword. To show certain keywords only in some variants, move
them to their own tagged group and keep the common ones in an untagged group (see
the README scenario "Skills grouped by category, and variant-specific skills").

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
  lists the untranslated fields. It does not fail the build. Warnings only cover
  items that end up in the output (after variant filtering and limits).
- Only these fields are checked for missing translations:

  | Section | Checked fields |
  |---|---|
  | `basics` | `label`, `summary` |
  | `work` | `position`, `description`, `summary`, `highlights` |
  | `volunteer` | `position`, `summary`, `highlights` |
  | `projects` | `description`, `highlights`, `roles`, `entity` |
  | `education` | `area`, `studyType`, `score`, `courses` |
  | `awards` | `title`, `summary` |
  | `publications` | `summary` |
  | `skills` | `level` |
  | `languages` | `language`, `fluency` |
  | `interests` | `name` |

  Only fields present on the item are checked. Everything else (certification
  names, company, institution and publisher names, locations, URLs, dates, skill
  names and keywords) is never checked, but can still be translated by adding it
  to `i18n.<lang>`. If a checked field reads the same in both languages, repeat
  it in `i18n.<lang>` to silence the warning. A `basics` field that the variant
  overrides itself (`basics` or `i18n.<lang>.basics` in the variant) is not
  checked either.
- `tags` are lowercase identifiers (`[a-z0-9-]+`). The shape of `x-cv-factory` is
  validated by `schema/x-cv-factory.schema.json`; only `en` and `es` are valid
  `i18n` keys.

### On `basics`
`basics` accepts the same `x-cv-factory.i18n` (e.g. translated `label` and
`summary`). `tags` has no effect there.

## Variant schema (`schema/variant.schema.json`)
```yaml
name: backend          # [a-z0-9-]+, equals the file name
description: string    # optional
lang: en               # optional default language: en | es
template: classic      # optional default template
basics: { ... }        # optional shallow override of basics (all languages)
i18n:                  # optional; per-language basics override, wins over `basics`
  es: { basics: { label: "..." } }
sections: [work, ...]  # optional; presence and order of sections (default: all, source order)
filter:                # optional; keep items with ANY listed tag (plus untagged items)
  tags: [...]
  sections: [work, ...]  # optional; apply the tag filter only to these sections (default: all)
require:               # optional; per section, STRICT tag filter (untagged items are dropped)
  certificates: [featured]
sort:                  # optional; per section, order by a field
  certificates: { by: date, order: desc }   # order: desc (default) | asc; missing field goes last
limits: { work: 4 }    # optional; max items per section, applied after filter, require and sort
```
Per section, `compose` applies, in this order: `filter` (if the section is in
scope), `require`, `sort`, `limits`, then the language overlay (which produces
the warnings, so they only cover items that reach the output); `basics`
overrides come last. `require` is applied **on top of** `filter`: scope the
filter with `filter.sections` when the two would conflict (see the README
scenario "Keep every certification in the source, show only some").

`sort` compares values as text, which orders ISO dates correctly (`2024-06` after
`2024-02`). A year-only date (`2023`) sorts before any month of that year.
Variants never contain resume content beyond the `basics` override; they only
reference and filter the source.

## Adding a new extension
Any new `x-cv-factory` key must be added to this document with the reason it
cannot be expressed in plain JSON Resume, and to the schema in `schema/`.
