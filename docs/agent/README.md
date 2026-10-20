# Using cv-factory with an AI assistant

This folder is written for an AI model (or a person acting as one) that was asked to
**build or improve someone's CV with this repository**. It is not about changing the
tool itself: for that, read [AGENTS.md](../../AGENTS.md).

The tool has no model inside. You, the assistant, edit the person's data files and
drive the CLI; the CLI validates, composes and renders. Everything you produce is
plain files in `people/<slug>/`.

## Pick the path

| The user has... | Follow |
|---|---|
| nothing yet, or only scattered notes | [from-scratch.md](from-scratch.md): a question-and-answer interview that builds the data step by step |
| a CV as a PDF (the common case) | [from-pdf.md](from-pdf.md): read the PDF, build the data files from it, then render and iterate |
| data that already works and wants it polished | [review.md](review.md): a review checklist, usable after either path |

Both paths end in the same place: a person folder that validates without warnings and
renders to PDF.

## What you will create

```
people/<slug>/
  source.json          all the facts, in English (JSON Resume + x-cv-factory)
  variants/<name>.yaml which content to show for a kind of role (no copied content)
  output/              generated PDFs (created by the CLI)
```

Read these before you write any data; they are short:
- [data-schema.md](../data-schema.md): fields, tags, `i18n`, the variant format.
- `people/example/` (minimal) and `people/showcase/` (every option, both languages).
- [workflow.md](../workflow.md): the commands in context.

## Ground rules (both paths)

1. **Never invent facts.** Do not add employers, dates, numbers, certifications or
   skills the user did not state or the source did not contain. When something is
   missing or ambiguous, ask. A short list of open questions is better than a
   confident guess.
2. **The base language is English.** Top-level fields in `source.json` are English;
   translations go in `x-cv-factory.i18n.<lang>` on the item they translate. Only
   `en` and `es` exist. Never create a second copy of `source.json` per language.
3. **Ask for the slug.** The person folder name is chosen by the user (lowercase
   letters, digits and hyphens). Do not derive it from the display name on your own.
4. **Variants hold no content.** They only filter, order and limit what is in
   `source.json` (and override `basics.label`/`summary`). Never copy a work entry into
   a variant.
5. **Personal data stays local.** `people/<slug>/` is git-ignored in this repository:
   check with `git status` that nothing from it is staged. Do not create a remote,
   push, upload a PDF anywhere or paste personal data into other tools unless the
   user asks. If they want their data versioned, offer a **private** repository in
   `people/<slug>/` (see [workflow.md](../workflow.md#5-version-with-git)); `output/`
   is usually better ignored.
6. **Do not change the tool to fit the data.** Templates, schemas and code are out of
   scope unless the user asks for it. If something does not fit the schema (for
   example technologies per job), say so and propose where it can live instead.
7. **PDF is the only output.** Do not add other formats, and do not try to add an
   image export.
8. **Validate early and often.** Run `validate` after every batch of edits, not once at
   the end, so errors point at what you just wrote.

## Commands you will use

`cvf` is the CLI; from the repository root `npm run dev -- <command>` is equivalent.
Omit `--person` only when there is exactly one person.

| Command | Use |
|---|---|
| `cvf list-people` / `cvf list-variants --person <slug>` | See what exists |
| `cvf validate --person <slug>` | Validate `source.json` and every variant |
| `cvf compose <variant> --person <slug> --lang es` | Print the resolved JSON; warnings (missing translations) go to stderr |
| `cvf render <variant> --person <slug> [--lang] [--template] [--public] [--hide ...]` | One PDF |
| `cvf render-all --person <slug> [--variants] [--langs] [--templates] [--public]` | Every combination, with a summary |

Templates: `classic`, `modern`, `clean`. Output names look like
`people/<slug>/output/<slug>_<variant>_<lang>_<template>_<YYYY-MM-DD>.pdf`
(`_redacted` is added when personal data is hidden).

## Prerequisites to check first

- `node --version` (>= 22) and `npm install` done in the repository root.
- `typst --version`. If it fails, point the user to the README's "Install the tools"
  and do not continue until it works (`CV_FACTORY_TYPST` can point to the executable).
- Reading PDFs: a PDF-capable model can open the file directly. Otherwise install
  poppler and use `pdftotext` (see [from-pdf.md](from-pdf.md)). The same tool lets you
  check a rendered PDF's text and page count.

## Definition of done

A first version is ready to show when all of this is true:
- `cvf validate --person <slug>` reports ok.
- `cvf compose` for every variant in every language the user wants prints no warnings.
- `cvf render-all --person <slug>` reports `0 failed`.
- You read the rendered PDFs (not only the JSON): the text is complete, nothing
  overflows, and the page count is reasonable (one to two pages is typical).
- No placeholder data is left (search for `Jane`, `example.com`, `Acme`, `Springfield`
  if you started from `people/example/`).
- You told the user which assumptions you made and what is still unknown.
