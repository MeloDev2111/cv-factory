# Playbook: build the data from an existing CV (PDF)

Use this when the user already has a CV as a PDF and wants cv-factory to produce
`people/<slug>/source.json` and its variants from it, then render, review and refine.
Read the [ground rules](README.md#ground-rules-both-paths) first. The goal of the first
pass is **fidelity**: capture what the PDF says, correctly. Improving the wording comes
afterwards, as a separate step.

## 1. Agree on the basics

Ask the user for:
- the PDF file (they own it; it stays on their machine),
- the person folder name (lowercase letters, digits, hyphens),
- which languages they want out (`en`, or `en` and `es`),
- which kinds of roles they apply for, to plan variants (it can wait).

Create the folder from the minimal example and clear it:

```
cp -r people/example people/<slug>
```

Delete the example's `output/` folder and replace its content. Keep
`variants/default.yaml`.

## 2. Read the PDF

- **If you can open PDFs natively**, do that first.
- **Otherwise extract the text** with poppler: `pdftotext -layout cv.pdf -` and also
  `pdftotext -raw cv.pdf -`. Compare them. `-layout` keeps columns together, but
  side columns of dates can drift away from the entry they belong to; `-raw` shows the
  reading order. When the two disagree about which date goes with which item, decide
  by the PDF's visual layout and **ask the user** if you cannot be sure.
- If there is no extractable text (a scanned image), tell the user. You need OCR or
  the text pasted in; do not guess from a blurry image.
- Odd characters (`�`, broken accents) are usually an extraction artefact on this
  platform, not part of the document. Restore the correct characters from context.
- Ignore repeated headers, footers and page numbers.

## 3. Inventory before writing

Before you create any JSON, show the user a short inventory: the sections you found,
how many entries each has, and the questions you have (see [step 7](#7-ask-about-gaps)).
Fixing the reading now is cheaper than fixing it after the data exists.

## 4. Map the PDF to the data

| In the PDF | Goes to | Notes |
|---|---|---|
| Name, headline | `basics.name`, `basics.label` | |
| Email, phone, website | `basics.email`, `basics.phone`, `basics.url` | Keep them in these fields so `--public` can hide them |
| City, country | `basics.location` (`city`, `countryCode`) | `countryCode` is ISO 3166-1 alpha-2 (`PE`) |
| LinkedIn, GitHub... | `basics.profiles[]` (`network`, `username`, `url`) | |
| Summary or profile | `basics.summary` | |
| Experience | `work[]` | `name` (employer), `position`, `location`, `startDate`, `endDate`, `highlights[]`; optional `description` for the team, product or client |
| Education | `education[]` | `institution`, `area`, `studyType`, dates, `score` |
| Skills | `skills[]` | Groups: `name` plus `keywords[]` |
| Certifications, courses | `certificates[]` | `name`, `issuer`, `date` |
| Awards | `awards[]` | `title`, `awarder`, `date`; for a period, omit `date` and write it in `summary` |
| Languages | `languages[]` | `language`, `fluency` |
| Projects | `projects[]` | `name`, `description`, `highlights[]`, `url` |
| Volunteering, publications, interests, references | `volunteer[]`, `publications[]`, `interests[]`, `references[]` | |

Details that matter:
- **Dates** are `YYYY-MM` (or `YYYY` when the month is unknown). "Present", "Ongoing" or
  "Actualidad": leave `endDate` out. Never invent a month.
- **Several roles at one employer** are separate `work[]` entries with the same `name`,
  consecutive in the file.
- **Per-job technology lines** ("Tools/Technologies: ...") have no field in the work
  schema. Do not invent one. Ask the user whether to drop them, mention the
  technology inside a bullet, or keep it in `description`. The skills section already
  carries the full list.
- **Skills grouped in columns or as a flat list**: build category groups (languages,
  frameworks, databases, cloud and DevOps, tools) from the PDF's grouping if it has one;
  otherwise propose groups and tell the user.
- **Client or project names** that appear in the PDF may be confidential even though
  the document is the user's. Ask whether the name should be in the data if the CV will
  be public.

## 5. Language of the base

The base text is **English**.
- PDF in English: copy it into the base fields.
- PDF in Spanish: translate to English for the base fields and keep the user's original
  Spanish verbatim in `x-cv-factory.i18n.es` of each item. Tell the user you did this.
- Any other language: only `en` and `es` are supported. Produce the English base, tell
  the user which language was not carried over, and do not invent an `i18n` key.

If the PDF is English and they also want Spanish, translate after the English is settled
(see step 7 of [from-scratch.md](from-scratch.md#7-translate-if-they-need-spanish)).

## 6. Write the files

- Keep the PDF's wording and numbers. Fix only clear typos and extraction damage.
- Tag items (`x-cv-factory.tags`) once you know the roles; an untagged item is universal.
- Create `variants/default.yaml` (everything) first, then one variant per kind of role.
  Variants contain no resume content: use `filter`, `require`, `sort`, `limits` and the
  `basics` label override. See [data-schema.md](../data-schema.md).
- Run `cvf validate --person <slug>` after each section, not at the end.

## 7. Ask about gaps

Collect and ask, in one short list, what the PDF could not tell you:
- missing months or years, "current" roles that may have ended,
- a job title that reads like an abbreviation (is it official?),
- text that looks truncated or contradicts another section,
- technologies or numbers that appear in one place only,
- anything you inferred (say what and why).

## 8. Render and compare

```
cvf validate --person <slug>
cvf compose default --person <slug> --lang en
cvf render-all --person <slug>
```

Then **read the rendered PDFs** and compare them with the original: same number of
entries per section, same dates, same numbers, nothing cut off, no leftover placeholder
data from the example. Extracting text from both PDFs and checking the lists side by
side is enough for a content check. Report differences to the user instead of silently
fixing them.

Show the user the templates (`classic`, `modern`, `clean`), ask which they prefer, and
set `template:` in the variants.

## 9. Iterate

From here the user steers: "shorter", "move certificates up", "add this job", "more
focus on data". Make each change in `source.json` or the variant (never in the PDF),
validate, re-render, and read the result. When the structure is stable, offer the
checklist in [review.md](review.md) to improve the wording. Offer a shareable copy
(`--public`) and a private repository for the data if they want one.

## Pitfalls seen in practice

- A two-column layout mixes up dates and entries in text extraction.
- Bullet glyphs, ligatures and non-ASCII characters can arrive as stray symbols.
- Page breaks may split a bullet or separate a heading from its entries.
- A shortened version of the CV (made for one application) may omit things the user
  still wants. If you have more than one PDF, build the data from the fullest one and
  use the others only to find missing facts and newer information.
