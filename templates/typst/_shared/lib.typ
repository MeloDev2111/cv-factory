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

/// "2022-03" -> "Mar 2022" ("March 2022" with long: true), "2019" -> "2019", none -> none.
#let fmt-date(s, long: false) = {
  if s == none { return none }
  let parts = s.split("-")
  let names = if long { t.monthsLong } else { t.months }
  if parts.len() >= 2 { names.at(int(parts.at(1)) - 1) + " " + parts.at(0) } else { parts.at(0) }
}

/// "Mar 2022 - Present". Items without a startDate have no range.
#let date-range(item, long: false, sep: " - ") = {
  let start = fmt-date(get(item, "startDate"), long: long)
  if start == none { return none }
  let end = fmt-date(get(item, "endDate"), long: long)
  start + sep + if end == none { t.present } else { end }
}

#let linked(label, url) = if url == none { label } else { link(url)[#label] }

/// Joins the non-none strings with a separator; none when nothing is left.
#let join-some(parts, sep: ", ") = {
  let kept = parts.filter(x => x != none and x != "")
  if kept.len() == 0 { none } else { kept.join(sep) }
}

/// ISO country code -> name in the current language; unknown codes are shown as they are.
#let country-name(code) = if code == none { none } else { t.countries.at(code, default: code) }

/// "Lima, Peru", or none when there is no location (it can be hidden in a shareable CV).
#let place-part() = {
  let loc = get(basics, "location")
  if loc == none { return none }
  join-some((get(loc, "city"), get(loc, "region"), country-name(get(loc, "countryCode"))))
}

/// Contact details as an array of content: place, email, phone, website. Any of them may be
/// missing (a shareable CV hides some), so an empty array is possible.
#let contact-parts() = {
  let parts = ()
  let place = place-part()
  if place != none { parts.push(place) }
  if get(basics, "email") != none { parts.push(link("mailto:" + basics.email)[#basics.email]) }
  if get(basics, "phone") != none { parts.push(basics.phone) }
  if get(basics, "url") != none { parts.push(link(basics.url)[#basics.url]) }
  parts
}

/// Social profiles as an array of content ("GitHub: user"), shown on their own line.
/// A profile without a url is shown as plain text.
#let profile-parts() = basics.at("profiles", default: ()).map(p => {
  let who = get(p, "username")
  if who == none { who = get(p, "url") }
  linked(if who == none { p.network } else { p.network + ": " + who }, get(p, "url"))
})

/// "Bachelor, Computer Science".
#let degree(item) = join-some((get(item, "studyType"), get(item, "area")))

/// Consecutive items with the same `name` (several roles at one employer) -> arrays of items.
#let group-by-name(items) = {
  let groups = ()
  for item in items {
    if groups.len() > 0 and groups.last().first().name == item.name {
      groups.at(groups.len() - 1).push(item)
    } else {
      groups.push((item,))
    }
  }
  groups
}

/// One range covering a group: earliest start to latest end, or to "present" if any role is open.
#let span-range(items, long: false, sep: " - ") = {
  let starts = items.map(i => get(i, "startDate")).filter(x => x != none)
  if starts.len() == 0 { return none }
  let open = items.any(i => get(i, "endDate") == none)
  let start = fmt-date(starts.sorted().first(), long: long)
  let end = if open { t.present } else {
    fmt-date(items.map(i => i.endDate).sorted().last(), long: long)
  }
  start + sep + end
}

/// Sections made of short one-line items; templates keep each one on a single page.
#let compact-sections = ("skills", "certificates", "languages", "interests")
