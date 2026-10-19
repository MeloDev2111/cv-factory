# Workflow

`cv-factory <command>` means `npm run dev -- <command>` (see the README). Replace
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
4. Check: `cv-factory validate --person <slug>`.

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
2. Do not copy resume content into it; use `filter` and `limits`.
3. Check: `cv-factory list-variants --person <slug>` and
   `cv-factory compose backend --person <slug>` to inspect the resolved JSON.

## 4. Render
```
cv-factory render backend --person <slug> --lang es
```
Output: `output/<slug>_backend_es.pdf`. Options:
- `--lang en|es` (default: the variant's `lang`, otherwise `en`)
- `--template <name>` (default: the variant's `template`, otherwise `classic`)

Untranslated fields in the chosen language are reported as warnings and rendered
in English.

## 5. Version with Git
The tool, templates, schemas and `people/example/` live in this repository:
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
Create `templates/typst/<name>/` with `main.typ` and `i18n.json` (labels for
`en` and `es`). It receives only the resolved `resume.json`. Use it with
`--template <name>`.
