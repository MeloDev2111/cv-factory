// "clean": sans-serif, black ink, centered "Name | Role" header, contact in three columns.
// Several consecutive roles at the same employer are grouped under one employer heading.
// Plain text in reading order: no icons, images or letter-spaced headings (ATS friendly).
#import "/templates/_shared/lib.typ": *

#set document(title: basics.name + " - CV", author: basics.name)
#set page(paper: "a4", margin: (x: 1.5cm, y: 1.4cm))
// No hyphenation: split words ("asegu-rando") hurt text extraction.
#set text(font: "Source Sans 3", size: 10pt, lang: lang, hyphenate: false)
// Ragged right: without hyphenation, justified text squeezes word spaces ("a total of200,000").
#set par(spacing: 0.6em, leading: 0.6em, justify: false)
#set list(marker: [-], indent: 1.1em, body-indent: 0.5em, spacing: 0.55em)

#let row(start-cell, end-cell) = grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  start-cell,
  align(right, end-cell),
)
#let dates(item) = date-range(item, long: true, sep: " – ")
#let bullets(items) = if has(items) { v(0.1em); list(..items.map(i => [#i])) }
#let entry(body) = block(breakable: false, below: 1em, body)

// Titles are plain uppercase: no `tracking`, which would extract as "E X P E R I E N C E".
#let section-title(key) = block(above: 1.4em, below: 0.8em, sticky: true)[
  #text(size: 10.5pt, upper(t.sections.at(key)))
  #v(0.15em)
  #line(length: 100%, stroke: 0.6pt)
]

// --- header -----------------------------------------------------------------
#align(center, text(size: 20pt, weight: "bold")[
  #basics.name#if get(basics, "label") != none [ | #basics.label]
])
#v(0.3em)
#{
  let cells = ()
  if get(basics, "phone") != none { cells.push(basics.phone) }
  if get(basics, "email") != none { cells.push(link("mailto:" + basics.email)[#basics.email]) }
  let place = contact-parts().first()
  if get(basics, "location") != none and place != none { cells.push(place) }
  for p in profile-parts() { cells.push(p) }
  if get(basics, "url") != none {
    let shown = basics.url.replace(regex("^https?://"), "").trim("/")
    cells.push(link(basics.url)[#shown])
  }
  grid(columns: (1fr, 1fr, 1fr), row-gutter: 0.55em, ..cells)
}

#if get(basics, "summary") != none {
  section-title("profile")
  basics.summary
}

// --- sections ---------------------------------------------------------------
/// One employer. A single role reads "Company / Role"; several roles are listed under the employer.
#let render-work-group(group) = entry({
  let first = group.first()
  let descriptions = group.map(i => get(i, "description")).dedup()
  let shared = descriptions.len() == 1 and descriptions.first() != none
  let location = get(first, "location")
  if group.len() == 1 {
    row([*#linked(first.name, get(first, "url"))*], dates(first))
    [#get(first, "position")]
    if shared or location != none { parbreak(); join-some((get(first, "description"), location), sep: " · ") }
    bullets(get(first, "highlights"))
  } else {
    row([*#linked(first.name, get(first, "url"))*], span-range(group, long: true, sep: " – "))
    if shared { descriptions.first() }
    for role in group {
      pad(left: 1em, {
        v(0.5em)
        row([*#get(role, "position")*], dates(role))
        if not shared and get(role, "description") != none { role.description }
        if get(role, "summary") != none { parbreak(); role.summary }
        bullets(get(role, "highlights"))
      })
    }
  }
})

#let render-volunteer(item) = entry({
  row([*#get(item, "position")*, #linked(item.organization, get(item, "url"))], dates(item))
  if get(item, "summary") != none { item.summary }
  bullets(get(item, "highlights"))
})

#let render-projects(item) = entry({
  let roles = get(item, "roles")
  let extra = join-some((get(item, "entity"), if has(roles) { roles.join(", ") }), sep: " · ")
  row([*#linked(item.name, get(item, "url"))*#if extra != none [ | #extra]], dates(item))
  if get(item, "description") != none { item.description }
  bullets(get(item, "highlights"))
  if has(get(item, "keywords")) { parbreak(); text(style: "italic", item.keywords.join(", ")) }
})

#let render-education(item) = entry({
  row([*#get(item, "area")*], dates(item))
  [#linked(item.institution, get(item, "url"))#if get(item, "studyType") != none [ | #item.studyType]]
  if get(item, "score") != none { parbreak(); [*#item.score*] }
  if has(get(item, "courses")) { parbreak(); [#t.courses: #item.courses.join(", ")] }
})

#let render-skills(item) = block(below: 0.65em)[
  *#item.name#if get(item, "level") != none [ (#item.level)]:*#if has(get(item, "keywords")) [ #item.keywords.join(", ")]
]

#let render-awards(item) = entry({
  row([*#item.title*], fmt-date(get(item, "date"), long: true))
  if get(item, "awarder") != none { item.awarder }
  if get(item, "summary") != none { parbreak(); item.summary }
})

#let render-publications(item) = entry({
  row([*#linked(item.name, get(item, "url"))*], fmt-date(get(item, "releaseDate"), long: true))
  if get(item, "publisher") != none { item.publisher }
  if get(item, "summary") != none { parbreak(); item.summary }
})

#let render-languages(item) = grid(
  columns: (5.5em, 1fr),
  row-gutter: 0.45em,
  [*#item.language*],
  [#if get(item, "fluency") != none [: #item.fluency]],
)

#let render-interests(item) = block(below: 0.5em)[
  *#item.name*#if has(get(item, "keywords")) [: #item.keywords.join(", ")]
]

#let render-certificates(items) = list(
  marker: [•],
  ..items.map(item => {
    let when = fmt-date(get(item, "date"), long: true)
    [#linked(item.name, get(item, "url"))#if get(item, "issuer") != none [ – #item.issuer]#if when != none [ (#when)]]
  }),
)

#let renderers = (
  volunteer: render-volunteer,
  projects: render-projects,
  education: render-education,
  skills: render-skills,
  awards: render-awards,
  publications: render-publications,
  languages: render-languages,
  interests: render-interests,
)

#for (key, items) in data {
  if items.len() == 0 { continue }
  let body = if key == "work" {
    section-title(key)
    for group in group-by-name(items) { render-work-group(group) }
  } else if key == "certificates" {
    section-title(key)
    render-certificates(items)
  } else if key in renderers {
    section-title(key)
    for item in items { renderers.at(key)(item) }
  } else {
    continue
  }
  // Short lists stay together on one page; long sections may flow across pages.
  if key in compact-sections { block(breakable: false, above: 1.4em, body) } else { body }
}
