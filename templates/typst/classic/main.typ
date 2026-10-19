// "classic": single column, serif, black on white, no icons or images (ATS friendly).
// Reads only the resolved resume through the shared library.
#import "/templates/_shared/lib.typ": *

#set document(title: basics.name + " - CV", author: basics.name)
#set page(paper: "a4", margin: (x: 1.9cm, y: 1.7cm))
#set text(font: "Libertinus Serif", size: 10.5pt, lang: lang)
#set par(spacing: 0.5em, leading: 0.5em)
#set list(indent: 0.5em, body-indent: 0.5em, spacing: 0.4em)

#let muted(body) = text(fill: rgb("#444444"), body)
#let row(start-cell, end-cell) = grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  start-cell,
  align(right, muted(end-cell)),
)
#let entry(body) = block(breakable: false, below: 0.9em, body)
#let line-entry(body) = block(below: 0.4em, body)
#let note(body) = if body != none { text(style: "italic", body) }
#let bullets(items) = if has(items) { v(0.15em); list(..items.map(i => [#i])) }

// No letter-spacing on titles: it makes text extraction read "E X P E R I E N C E",
// which ATS parsers do not recognize as a section.
#let section-title(key) = block(above: 1.2em, below: 0.7em, sticky: true)[
  #text(size: 11pt, weight: "bold", upper(t.sections.at(key)))
  #v(0.1em)
  #line(length: 100%, stroke: 0.6pt)
]

// --- header -----------------------------------------------------------------
#align(center, text(size: 23pt, weight: "bold", basics.name))
#if get(basics, "label") != none {
  v(0.15em)
  align(center, text(size: 12.5pt, basics.label))
}
#v(0.3em)
#align(center, text(size: 9.5pt)[
  #contact-parts().join([ #h(0.3em)|#h(0.3em) ])
  #if profile-parts().len() > 0 [ \ #profile-parts().join([ #h(0.3em)|#h(0.3em) ]) ]
])
#if get(basics, "summary") != none [
  #v(0.6em)
  #basics.summary
]

// --- sections ---------------------------------------------------------------
#let render-work(item) = entry({
  row([*#get(item, "position")*, #linked(item.name, get(item, "url"))], date-range(item))
  note(join-some((get(item, "description"), get(item, "location")), sep: " · "))
  if get(item, "summary") != none { parbreak(); item.summary }
  bullets(get(item, "highlights"))
})

#let render-volunteer(item) = entry({
  row([*#get(item, "position")*, #linked(item.organization, get(item, "url"))], date-range(item))
  if get(item, "summary") != none { item.summary }
  bullets(get(item, "highlights"))
})

#let render-projects(item) = entry({
  let roles = get(item, "roles")
  let title = join-some((get(item, "entity"), if has(roles) { roles.join(", ") }), sep: " · ")
  row([*#linked(item.name, get(item, "url"))*#if title != none [ — #title]], date-range(item))
  if get(item, "description") != none { item.description }
  bullets(get(item, "highlights"))
  if has(get(item, "keywords")) { parbreak(); note(item.keywords.join(", ")) }
})

#let render-education(item) = entry({
  row([*#linked(item.institution, get(item, "url"))*#if degree(item) != none [, #degree(item)]], date-range(item))
  if get(item, "score") != none [#t.score: #item.score \ ]
  if has(get(item, "courses")) [#t.courses: #item.courses.join(", ")]
})

#let render-skills(item) = line-entry[
  *#item.name*#if get(item, "level") != none [ (#item.level)]#if has(get(item, "keywords")) [: #item.keywords.join(", ")]
]

#let render-certificates(item) = line-entry(row(
  [*#linked(item.name, get(item, "url"))*#if get(item, "issuer") != none [, #item.issuer]],
  fmt-date(get(item, "date")),
))

#let render-awards(item) = entry({
  row([*#item.title*#if get(item, "awarder") != none [, #item.awarder]], fmt-date(get(item, "date")))
  if get(item, "summary") != none { item.summary }
})

#let render-publications(item) = entry({
  row(
    [*#linked(item.name, get(item, "url"))*#if get(item, "publisher") != none [, #item.publisher]],
    fmt-date(get(item, "releaseDate")),
  )
  if get(item, "summary") != none { item.summary }
})

#let render-languages(item) = line-entry[
  *#item.language*#if get(item, "fluency") != none [ — #item.fluency]
]

#let render-interests(item) = line-entry[
  *#item.name*#if has(get(item, "keywords")) [: #item.keywords.join(", ")]
]

#let renderers = (
  work: render-work,
  volunteer: render-volunteer,
  projects: render-projects,
  education: render-education,
  skills: render-skills,
  certificates: render-certificates,
  awards: render-awards,
  publications: render-publications,
  languages: render-languages,
  interests: render-interests,
)

#for (key, items) in data {
  if key in renderers and items.len() > 0 {
    let body = { section-title(key); for item in items { renderers.at(key)(item) } }
    // Short lists stay together on one page; long sections may flow across pages.
    if key in compact-sections { block(breakable: false, above: 1.2em, body) } else { body }
  }
}
