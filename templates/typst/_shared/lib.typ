// Shared by all templates. Loads the resolved resume and provides content helpers.
// Styling (fonts, colors, layout) belongs to each template's main.typ.
#let data = json("/resume.json")
#let i18n = json("i18n.json")
#let lang = data.meta.at("x-cv-factory").lang
#let t = i18n.at(lang)
#let basics = data.basics

/// Optional field: the value, or none.
#let get(item, key) = item.at(key, default: none)

/// Non-empty array -> true. none counts as empty.
#let has(items) = items != none and items.len() > 0

/// "2022-03" -> "Mar 2022", "2019" -> "2019", none -> none.
#let fmt-date(s) = {
  if s == none { return none }
  let parts = s.split("-")
  if parts.len() >= 2 { t.months.at(int(parts.at(1)) - 1) + " " + parts.at(0) } else { parts.at(0) }
}

/// "Mar 2022 - Present". Items without a startDate have no range.
#let date-range(item) = {
  let start = fmt-date(get(item, "startDate"))
  if start == none { return none }
  let end = fmt-date(get(item, "endDate"))
  start + " - " + if end == none { t.present } else { end }
}

#let linked(label, url) = if url == none { label } else { link(url)[#label] }

/// Joins the non-none strings with a separator; none when nothing is left.
#let join-some(parts, sep: ", ") = {
  let kept = parts.filter(x => x != none and x != "")
  if kept.len() == 0 { none } else { kept.join(sep) }
}

/// Contact details as an array of content: place, email, phone, website.
#let contact-parts() = {
  let parts = ()
  let loc = get(basics, "location")
  if loc != none {
    let place = join-some((get(loc, "city"), get(loc, "region"), get(loc, "countryCode")))
    if place != none { parts.push(place) }
  }
  if get(basics, "email") != none { parts.push(link("mailto:" + basics.email)[#basics.email]) }
  if get(basics, "phone") != none { parts.push(basics.phone) }
  if get(basics, "url") != none { parts.push(link(basics.url)[#basics.url]) }
  parts
}

/// Social profiles as an array of content ("GitHub: user"), shown on their own line.
#let profile-parts() = basics.at("profiles", default: ()).map(p => linked(
  p.network + ": " + p.at("username", default: p.url),
  get(p, "url"),
))

/// Sections made of short one-line items; templates keep each one on a single page.
#let compact-sections = ("skills", "certificates", "languages", "interests")

/// "Bachelor, Computer Science".
#let degree(item) = join-some((get(item, "studyType"), get(item, "area")))
