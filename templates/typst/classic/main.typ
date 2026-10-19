// "classic": single column, plain text, no icons or images (ATS friendly).
// Reads only the resolved resume: /resume.json (staged under --root by the renderer).
#let data = json("/resume.json")
#let i18n = json("i18n.json")
#let lang = data.meta.at("x-cv-factory").lang
#let t = i18n.at(lang)
#let basics = data.basics

#set document(title: basics.name + " - CV", author: basics.name)
#set page(paper: "a4", margin: (x: 1.8cm, y: 1.6cm))
#set text(font: "Libertinus Serif", size: 10.5pt, lang: lang)
#set par(justify: false, leading: 0.55em)
#set list(indent: 0.8em, spacing: 0.45em)

#let get(item, key) = item.at(key, default: none)

#let fmt-date(s) = {
  if s == none { return none }
  let parts = s.split("-")
  if parts.len() >= 2 { t.months.at(int(parts.at(1)) - 1) + " " + parts.at(0) } else { parts.at(0) }
}

#let date-range(item) = {
  let start = fmt-date(get(item, "startDate"))
  if start == none { return none }
  let end = fmt-date(get(item, "endDate"))
  start + " - " + if end == none { t.present } else { end }
}

#let heading-row(start-cell, end-cell) = grid(
  columns: (1fr, auto),
  start-cell,
  align(right, end-cell),
)

#let section-title(key) = {
  v(0.7em)
  text(size: 11.5pt, weight: "bold", upper(t.sections.at(key)))
  v(-0.55em)
  line(length: 100%, stroke: 0.5pt)
  v(0.1em)
}

#let bullets(items) = if items != none and items.len() > 0 {
  list(..items.map(i => [#i]))
}

#let linked(label, url) = if url == none { label } else { link(url)[#label] }

// --- header -----------------------------------------------------------------
#align(center)[
  #text(size: 20pt, weight: "bold", basics.name) \
  #if get(basics, "label") != none { text(size: 12pt, basics.label) }
]

#{
  let loc = get(basics, "location")
  let parts = ()
  if loc != none {
    parts.push((get(loc, "city"), get(loc, "region"), get(loc, "countryCode")).filter(x => x != none).join(", "))
  }
  if get(basics, "email") != none { parts.push(link("mailto:" + basics.email)[#basics.email]) }
  if get(basics, "phone") != none { parts.push(basics.phone) }
  if get(basics, "url") != none { parts.push(link(basics.url)[#basics.url]) }
  for p in basics.at("profiles", default: ()) {
    parts.push(linked(p.network + ": " + p.at("username", default: p.url), get(p, "url")))
  }
  align(center, parts.join(" | "))
}

#if get(basics, "summary") != none [
  #v(0.4em)
  #basics.summary
]

// --- sections, in the order given by the resolved resume ----------------------
#let render-work(item) = {
  heading-row(
    [*#get(item, "position")*, #linked(item.name, get(item, "url"))],
    date-range(item),
  )
  if get(item, "summary") != none { item.summary }
  bullets(get(item, "highlights"))
}

#let render-projects(item) = {
  heading-row([*#linked(item.name, get(item, "url"))*], date-range(item))
  if get(item, "description") != none { item.description }
  bullets(get(item, "highlights"))
}

#let render-education(item) = {
  let degree = (get(item, "studyType"), get(item, "area")).filter(x => x != none).join(", ")
  heading-row([*#item.institution*#if degree != "" [, #degree]], date-range(item))
  if get(item, "score") != none [Score: #item.score]
}

#let render-skills(item) = [*#item.name:* #get(item, "keywords").join(", ") \ ]

#let render-certificates(item) = {
  heading-row(
    [*#linked(item.name, get(item, "url"))*#if get(item, "issuer") != none [, #item.issuer]],
    fmt-date(get(item, "date")),
  )
}

#let render-languages(item) = [*#item.language*#if get(item, "fluency") != none [: #item.fluency] \ ]

#let renderers = (
  work: render-work,
  projects: render-projects,
  education: render-education,
  skills: render-skills,
  certificates: render-certificates,
  languages: render-languages,
)

#for (key, items) in data {
  if key in renderers and items.len() > 0 {
    section-title(key)
    for item in items {
      block(breakable: false, below: 0.7em, renderers.at(key)(item))
    }
  }
}
