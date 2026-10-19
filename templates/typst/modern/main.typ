// "modern": single column, sans-serif (bundled Source Sans 3), one accent color.
// Still plain text in reading order, no icons, images or tables (ATS friendly).
#import "/templates/_shared/lib.typ": *

#let accent = rgb("#1f4e79")
#let ink = rgb("#222222")
#let muted-color = rgb("#5f6b76")

#set document(title: basics.name + " - CV", author: basics.name)
#set page(paper: "a4", margin: (x: 1.8cm, y: 1.5cm))
#set text(font: "Source Sans 3", size: 10pt, lang: lang, fill: ink)
#set par(spacing: 0.55em, leading: 0.6em)
#set list(marker: text(fill: accent)[•], indent: 0.4em, body-indent: 0.5em, spacing: 0.5em)
#show link: set text(fill: accent)

#let muted(body) = text(fill: muted-color, body)
#let row(start-cell, end-cell) = grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  start-cell,
  align(right, muted(end-cell)),
)
#let entry(body) = block(breakable: false, below: 0.8em, body)
#let line-entry(body) = block(below: 0.35em, body)
#let note(body) = if body != none { muted(text(style: "italic", body)) }
#let bullets(items) = if has(items) { v(0.1em); list(..items.map(i => [#i])) }
#let strong-name(body) = text(weight: "semibold", body)
#let org(body) = text(fill: accent, weight: "semibold", body)

// No letter-spacing on titles: it makes text extraction read "E X P E R I E N C E",
// which ATS parsers do not recognize as a section.
#let section-title(key) = block(above: 1.2em, below: 0.7em, sticky: true)[
  #text(size: 10.5pt, weight: "bold", fill: accent, upper(t.sections.at(key)))
  #v(0.1em)
  #line(length: 100%, stroke: 0.5pt + accent.lighten(55%))
]

// --- header (left aligned) --------------------------------------------------
#text(size: 26pt, weight: "bold", fill: accent, basics.name)
#if get(basics, "label") != none {
  v(0.1em)
  text(size: 13pt, weight: "semibold", basics.label)
}
#v(0.3em)
#muted(text(size: 9.5pt)[
  #contact-parts().join([ #h(0.25em)·#h(0.25em) ])
  #if profile-parts().len() > 0 [ \ #profile-parts().join([ #h(0.25em)·#h(0.25em) ]) ]
])
#if get(basics, "summary") != none [
  #v(0.5em)
  #basics.summary
]

// --- sections ---------------------------------------------------------------
#let render-work(item) = entry({
  row([#strong-name(get(item, "position")) · #org(linked(item.name, get(item, "url")))], date-range(item))
  note(join-some((get(item, "description"), get(item, "location")), sep: " · "))
  if get(item, "summary") != none { parbreak(); item.summary }
  bullets(get(item, "highlights"))
})

#let render-volunteer(item) = entry({
  row(
    [#strong-name(get(item, "position")) · #org(linked(item.organization, get(item, "url")))],
    date-range(item),
  )
  if get(item, "summary") != none { item.summary }
  bullets(get(item, "highlights"))
})

#let render-projects(item) = entry({
  let roles = get(item, "roles")
  let extra = join-some((get(item, "entity"), if has(roles) { roles.join(", ") }), sep: " · ")
  row([#strong-name(linked(item.name, get(item, "url")))#if extra != none [ · #muted(extra)]], date-range(item))
  if get(item, "description") != none { item.description }
  bullets(get(item, "highlights"))
  if has(get(item, "keywords")) { parbreak(); muted(item.keywords.join(" · ")) }
})

#let render-education(item) = entry({
  row([#strong-name(linked(item.institution, get(item, "url")))#if degree(item) != none [ · #degree(item)]], date-range(item))
  if get(item, "score") != none { muted[#t.score: #item.score] }
  if has(get(item, "courses")) { parbreak(); muted[#t.courses: #item.courses.join(", ")] }
})

#let render-skills(item) = line-entry[
  #org(item.name)#if get(item, "level") != none [ #muted[(#item.level)]]#if has(get(item, "keywords")) [ #h(0.4em) #item.keywords.join(" · ")]
]

#let render-certificates(item) = line-entry(row(
  [#strong-name(linked(item.name, get(item, "url")))#if get(item, "issuer") != none [ · #muted(item.issuer)]],
  fmt-date(get(item, "date")),
))

#let render-awards(item) = entry({
  row(
    [#strong-name(item.title)#if get(item, "awarder") != none [ · #muted(item.awarder)]],
    fmt-date(get(item, "date")),
  )
  if get(item, "summary") != none { item.summary }
})

#let render-publications(item) = entry({
  row(
    [#strong-name(linked(item.name, get(item, "url")))#if get(item, "publisher") != none [ · #muted(item.publisher)]],
    fmt-date(get(item, "releaseDate")),
  )
  if get(item, "summary") != none { item.summary }
})

#let render-languages(item) = line-entry[
  #strong-name(item.language)#if get(item, "fluency") != none [ · #muted(item.fluency)]
]

#let render-interests(item) = line-entry[
  #strong-name(item.name)#if has(get(item, "keywords")) [ · #muted(item.keywords.join(", "))]
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
