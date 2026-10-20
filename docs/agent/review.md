# Playbook: review and polish a CV

Use this once `people/<slug>` validates and renders, to improve the wording and catch
mistakes. Work through the checklist in order and **report findings first**: group
them as "fine", "should fix" and "your call", and apply only what the user approves.
Cosmetic corrections (casing, plural group names) can be applied together once the user
agrees to the rule.

Read the rendered PDFs, not only the JSON, and check both languages and every variant
the user actually sends.

## 1. Structure and layout
- Page count is reasonable (one to two pages is typical). If it spills onto a page for
  a few lines, shorten rather than shrink.
- Most recent first; dates consistent; the end of one job does not leave an unexplained
  gap or overlap with the start of the next.
- A current job has no `endDate`; a finished one does.
- Variant labels (`basics.label`) match what the variant actually shows. A "Data"
  headline over backend-only experience reads as a mismatch.

## 2. Experience bullets
- Each starts with a verb; tense is consistent.
- Verbs are not repeated across neighbouring bullets ("Optimized" three times).
- Prefer outcomes to duties. Keep numbers the user can defend; never add or round them
  up. Remove filler such as "Applied best practices".
- Remove detail that every professional in that role would have (for example routine
  database objects) unless it is the point of the job.
- Older roles can be shorter than recent ones.
- Technology mentions help when they explain the achievement; do not repeat the whole
  skills list in every job.
- Acronyms an outsider will not know (internal team names, program names) are written
  out or kept only if they add value.

## 3. Profile (`basics.summary`)
- Two to four sentences, general rather than a recap of the jobs below. Details and
  numbers belong in the experience.
- Names what the person is (their headline), their field or sectors, a few core
  technologies, and what they care about. Strong, concrete claims (ownership of
  critical processes, for example) are better than "passionate" or "highly motivated".
- Does not contradict the headline, and is consistent between languages.

## 4. Skills
- Group names are consistent and plural where it reads naturally ("Programming
  Languages", "Databases").
- Correct, consistent casing of technology names:

  | Use | Not |
  |---|---|
  | JavaScript, TypeScript | Javascript, Typescript |
  | Node.js | Node.Js, NodeJS |
  | GitHub, Git & GitHub | Github |
  | PostgreSQL, MySQL, MongoDB, DynamoDB | Postgres (unless intended), Mongodb |
  | SonarCloud, Power BI, pganalyze | Sonarcloud, PowerBI, Pganalyze |
  | DevOps, CI/CD | Devops, CI-CD |
  | Hexagonal Architecture, Domain-Driven Design | Hexagonal architecture |
  | OpenAPI, Swagger | Open API |

  When in doubt, use the name the vendor or project uses on its own website.
- Remove skills with no evidence anywhere in the CV and no intent to defend them in an
  interview, outdated items ("Waterfall"), and items too small to list. Keep skills the
  person has studied or been certified in if they are ready to discuss them.
- Related technologies sit together in a sensible group; a group with a single keyword
  is usually a sign it should be merged.
- Soft skills: either leave them out or keep a short list (about four) that the
  experience supports. Generic ones ("Responsible", "Team player") add nothing.
- Tools that belong to another profile (for example data tools in a backend CV) are a
  deliberate choice: ask whether to keep them for breadth or to tag them for the
  matching variant.

## 5. Titles and facts
- Job titles match what the employer would confirm. If they were adjusted to a more
  common market title, tell the user so they can be ready when asked.
- Employer, school and certification names are spelled the way the issuer writes them.
- Certification titles are in the language of the CV: if a title is a translation of
  the original, put the original in `i18n` for the other language.
- Language levels use a common scale (CEFR: A2, B1, B2, C1...).

## 6. Translations
- Both languages say the same thing, with the same numbers, and no English left in the
  Spanish text except proper nouns and technical terms people really use in English.
- `cvf compose` in every language prints no warnings.
- Variant `i18n` for headline/summary exists for each language.

## 7. Privacy
- No client, project or internal system names that the user prefers not to publish.
  Describe the industry instead ("payments platform", "online learning platform").
- No internal URLs, ticket numbers or credentials in the text.
- For a shareable copy: render with `--public` (or `--hide`), then extract the PDF text
  and confirm that the phone, email and address are really gone. The flags only handle
  structured fields: free text (summary, bullets) is the user's responsibility.
- Nothing from `people/<slug>/` shows up in `git status` of this repository.

## 8. Report

Finish with a short summary: what is good, what you recommend changing and why, and
what is a judgment call for the user. Keep the user in control of wording that speaks
for them.
