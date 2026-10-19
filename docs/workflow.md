# Workflow

`cvf <command>` means `npm run dev -- <command>`, or the linked `cvf` command (see
the README, "Usage"; `cv-factory` is an alias). Replace
`<slug>` with the person's folder name. Omit `--person` if there is only one
person.

## 0. Prerequisites
Node.js >= 22 and the `typst` binary on your `PATH`. Installation steps are in
the [README](../README.md#prerequisites).

## 1. Create a person
```
cp -r people/example people/<slug>
```
Edit `people/<slug>/source.json`. The folder is git-ignored, so personal data is
not committed. Slugs are lowercase letters, digits and hyphens.

## 2. Add a new job experience
1. Open `people/<slug>/source.json` and add an entry to `work[]`, in English:
   ```json
   {
     "name": "Acme",
     "position": "Backend Engineer",
     "startDate": "2024-03",
     "summary": "...",
     "highlights": ["Reduced API latency by 40%"],
     "x-cv-factory": { "tags": ["backend", "node"] }
   }
   ```
2. Tag it so variants can include it (`tags` list).
3. For Spanish output, add `x-cv-factory.i18n.es` with the fields to translate.
4. Check: `cvf validate --person <slug>`.

## 3. Create a variant for a kind of role
1. Create `people/<slug>/variants/<name>.yaml` (name: lowercase letters, digits,
   hyphens; must equal the file name):
   ```yaml
   name: backend
   description: Backend roles
   basics: { label: Backend Engineer }
   i18n:
     es: { basics: { label: Ingeniero Backend } }
   sections: [work, projects, skills, education, certificates]
   filter: { tags: [backend] }
   limits: { work: 4, projects: 3 }
   ```
2. Do not copy resume content into it; use `filter`, `require`, `sort` and
   `limits`. To show only your 6 featured or 6 most recent certifications, see
   the README scenario "Keep every certification in the source, show only some".
3. Check: `cvf list-variants --person <slug>` and
   `cvf compose backend --person <slug>` to inspect the resolved JSON.

## 4. Render
```
cvf render backend --person <slug> --lang es
```
Output: `people/<slug>/output/<slug>_backend_es_<template>_<YYYY-MM-DD>.pdf` (for example
`people/<slug>/output/<slug>_backend_es_classic_2026-10-19.pdf`). PDFs are written
inside the person's own folder, next to their data, which is git-ignored. The file name carries person,
variant, language, template and today's date, so renders with different options
never overwrite each other and the date works as a version: a new day creates a
new file, the same day replaces that day's. Options:
- `--lang en|es` (default: the variant's `lang`, otherwise `en`)
- `--template <name>` (default: the variant's `template`, otherwise `classic`)
- `--no-date` leaves the date out of the name

Untranslated fields in the chosen language are reported as warnings and rendered
in English.

**A shareable copy.** To publish or send a CV without personal data:
```
cvf render backend --person <slug> --public
cvf render backend --person <slug> --hide phone,email
```
`--public` hides phone, email, address and photo; `--hide` picks fields (see the
README, "Shareable version"). The file is named `..._redacted_<date>.pdf`. Check the
free text (`summary`, `highlights`) yourself for employer-internal details: no flag
can detect those.

**Everything at once.** To generate every variant in every language with every
template (for example before comparing templates or sending a batch):
```
cvf render-all --person <slug>
cvf render-all --person <slug> --variants backend --langs es --templates clean
```
It validates first, keeps going if one combination fails and prints a summary
(`12 PDF(s) written, 0 failed.`). Old dated files stay in `people/<slug>/output/` until
you delete them, which gives you a record of what you generated on each day.

## 5. Version with Git
The tool, templates, schemas and the fictional `people/example/` and
`people/showcase/` live in this repository:
```
git tag -a v0.1.0 -m "First working end-to-end flow"
git push --tags
```
A real person's data is not in this repository. If you want it versioned, make
`people/<slug>/` its own **private** Git repository and tag it there, e.g. when
you send an application:
```
cd people/<slug>
git add -A && git commit -m "CV for Acme application"
git tag -a sent-2026-10-acme -m "Sent to Acme (backend, es)"
```
That tag records the exact data that produced the PDF you sent.

## 6. Add a template (optional)
Copy `templates/typst/classic/` to `templates/typst/<name>/` and edit its
`main.typ`. It imports `/templates/_shared/lib.typ` (data loading, date and
contact helpers) and `_shared/i18n.json` holds the labels for `en` and `es`; it
only receives the resolved `resume.json`. If it needs fonts, put them in
`templates/typst/<name>/fonts/` together with their license. Use it with
`--template <name>`, or set `template: <name>` in a variant.
