# Playbook: build a CV from scratch

Use this when the user has no CV file to start from. You run a question-and-answer
interview and write `people/<slug>/source.json` as you go, until there is a solid,
renderable base. Read the [ground rules](README.md#ground-rules-both-paths) first.

How to run the interview:
- **One topic at a time, at most three questions per turn.** People answer short
  questions well and long forms badly.
- **Let them skip.** Every section except `basics` and one `work` or `education`
  entry is optional.
- **Write as you go, validate after each section** (`cvf validate --person <slug>`),
  and read back what you wrote in plain words so they can correct it.
- **Draft the wording, ask for the facts.** The user supplies what happened; you turn
  it into clean bullets (see [Writing bullets](#writing-bullets)) and show them for
  approval.
- If they paste material (an old CV, a LinkedIn profile, notes), switch to
  [from-pdf.md](from-pdf.md) for that part: the mapping table there applies.

## 0. Set up

Ask:
1. What should the person folder be called? (lowercase letters, digits, hyphens.)
2. Which languages do they need: English only, or English and Spanish?
3. What kinds of roles are they applying for? (Only to plan variants; it is fine to say
   "not sure yet".)

Then create the folder from the minimal example and empty it of placeholder content:

```
cp -r people/example people/<slug>
```

Remove `people/<slug>/output/` if it was copied, replace the example data section by
section as the interview goes, and keep `people/<slug>/variants/default.yaml`
(everything, default order). Do not leave any "Jane Doe" content behind.

## 1. Basics

Ask for: full name; the professional headline (`label`, e.g. "Backend Engineer");
email; phone; website; city and country (the country as an ISO 3166-1 alpha-2 code,
e.g. `PE`, `ES`, `US`); and profiles (GitHub, LinkedIn: network, username, URL).

Leave the `summary` for the end, when you know the whole story. Phone, email and
location are what `--public` can hide later, so keep them in their own fields rather
than inside text.

## 2. Work experience (most recent first)

For each role ask: employer; job title; city; start and end month (`YYYY-MM`; omit the
end for a current job); a one-line description of the team, product or client if it
helps; then the achievements.

Draw out achievements with questions like:
- What were you responsible for that someone else would otherwise have done?
- What got faster, cheaper, safer, bigger or more reliable because of your work?
- Is there a number (users, requests, time, money, team size) you can stand behind?
- What technology or method did you introduce or choose?

Aim for three to five bullets per recent role and fewer for older ones. If the person
held several roles at one employer, create one `work` entry per role with the same
`name`, consecutive in the file (the `clean` template groups them).

Every item can carry `x-cv-factory.tags`. Ask which kinds of roles each job is
relevant to (`backend`, `data`, ...). An untagged item is "universal" and always kept.

## 3. Education

Institution, degree level (`studyType`), field (`area`), start and end year or month,
and a short free-text `score` only if it adds something ("First in Class").

## 4. Skills

Skills are **groups**: `{ "name": "Databases", "keywords": ["PostgreSQL", "MySQL"] }`.
Propose groups from what the work history already shows (languages, frameworks,
databases, cloud and DevOps, tools) and ask what to add or remove. Only list skills the
person is willing to be asked about in an interview. Tags and `i18n` act on the whole
group, not on one keyword.

## 5. The rest (optional)

Certifications (`name`, `issuer`, `date`), projects, awards, languages spoken
(`language`, `fluency`; a CEFR level such as "B2" is clearer than "intermediate"),
volunteering, publications. Ask once whether any of these matter; do not interrogate.

## 6. Summary

Now draft two to four sentences: years of experience and fields, the main skills, what
they care about, with no detail that already sits in the experience section. Offer two
alternatives and let them choose. See the profile guidance in [review.md](review.md).

## 7. Translate (if they need Spanish)

Translate only after the English text is settled. Add `x-cv-factory.i18n.es` to every
item that has translatable text (see the checked-fields table in
[data-schema.md](../data-schema.md#rules-for-i18n)). Arrays such as `highlights` are
replaced as a whole. Then run `cvf compose <variant> --person <slug> --lang es`: every
"no translation" warning names a field you still owe. If a field reads the same in both
languages, repeat it in `i18n.es` to silence the warning.

## 8. Variants

Create one variant per kind of role the person named, in
`people/<slug>/variants/<name>.yaml` (see the format in
[data-schema.md](../data-schema.md#variant-schema-schemavariantschemajson)). A typical
start:

```yaml
name: backend
description: Backend roles
basics: { label: Backend Engineer }
i18n: { es: { basics: { label: Ingeniero Backend } } }
sections: [work, projects, skills, education, certificates]
filter: { tags: [backend] }
limits: { certificates: 6 }
```

Use `filter` to drop items tagged for other roles, `require` to keep only items with a
given tag (strict), `sort` to order (for example certificates by date), and `limits`
to cap a section. Do not copy any content into a variant.

## 9. Render and iterate

```
cvf validate --person <slug>
cvf render-all --person <slug>
```

Open the PDFs. Show the user the three templates, ask which style they prefer, and set
`template:` in the variants. Then adjust: too long, too short, wrong order, a missing
detail. Re-render after each change. When the structure is stable, go through
[review.md](review.md).

## 10. Hand over

Tell the user: where the files are, how to add a new job later
([workflow.md](../workflow.md#2-add-a-new-job-experience)), how to make a shareable copy
(`--public`), and, if they want their data versioned, offer a private repository in
`people/<slug>/` as described in the ground rules.

## Writing bullets

- Start with a verb in the past tense (present tense for a current, ongoing
  responsibility, but be consistent within the CV).
- Say what changed and, when the user gave you a real number, include it. Never
  estimate a number.
- One idea per bullet, one or two lines. Vary the verbs: do not start three bullets
  with "Optimized" or "Developed".
- Name the technology only where it explains the achievement; the skills section
  carries the full list.
- Leave out duties that anyone in the role would have ("Attended meetings", "Applied
  best practices").
