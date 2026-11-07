// Long-tail keyword list for IBONA (formerly Rebalive) — Kinyarwanda, Swahili,
// English and French terms covering agasobanuye films, film nyarwanda,
// amakuru, comedy, gospel, music and creator names. Emitted as the site-wide
// <meta name="keywords"> and also exposed for JSON-LD "keywords" fields.

const CORE = [
  "ibonafilms", "ibona films", "ibonafilms rwanda", "ibonafilms agasobanuye", "ibonafilms com", "ibonafilms app",
  "ibona", "ibona rwanda", "ibona platform", "ibona app", "ibona streaming", "ibona tv",
  "ibona video", "ibona movies", "ibona amafilime", "ibona music", "ibona news",
  "rebalive", "rebalive rwanda", "rebalive app", "rebalive streaming", "rebalive tv",
  "ibona.egreedtech.org", "egreedtech ibona",
];

const AGASOBANUYE = [
  "agasobanuye", "agasobanuye now", "agasobanuye films", "agasobanuye film",
  "agasobanuye movies", "agasobanuye 2024", "agasobanuye 2025", "agasobanuye 2026",
  "agasobanuye action", "agasobanuye comedy", "agasobanuye romance", "agasobanuye horror",
  "agasobanuye thriller", "agasobanuye kung fu", "agasobanuye chinese", "agasobanuye indian",
  "agasobanuye nigerian", "agasobanuye kinyarwanda", "agasobanuye mp4", "agasobanuye HD",
  "agasobanuye download", "agasobanuye online", "agasobanuye streaming", "agasobanuye free",
  "agasobanuye youtube", "agasobanuye telegram", "agasobanuye net", "agasobanuye tv",
  "agasobanuye app", "agasobanuye website", "agasobanuye site", "agasobanuye latest",
  "agasobanuye new", "agasobanuye hot", "agasobanuye viral", "agasobanuye trending",
  "agasobanuye best", "agasobanuye top", "agasobanuye popular", "agasobanuye classics",
  "watch agasobanuye", "watch agasobanuye online", "watch agasobanuye free",
  "agasobanuye ndetse", "agasobanuye reba", "reba agasobanuye", "reba agasobanuye kuri ibona",
  "agasobanuye kinyarwanda kabuhariwe", "agasobanuye kabuhariwe", "agasobanuye kubuntu",
  "agasobanuye ubuntu", "agasobanuye netflix", "netflix agasobanuye", "agasobanuye series",
];

const NARRATORS = [
  "daddym films", "daddymfilms", "daddym", "junior giti", "junior giti agasobanuye",
  "junior giti films", "sankara junior", "sankara junior agasobanuye",
  "kigali films", "hero films", "epic films", "abakinnyi", "abasobanura",
  "rocky kirabiranya", "yanga", "gaheza", "savimbi",
];

const GENERAL = [
  "film nyarwanda", "filime nyarwanda", "amafilime", "amakuru", "rwanda movies",
  "rwandan films", "kinyarwanda movies", "kinyarwanda comedy", "rwanda gospel",
  "rwanda music", "indirimbo nyarwanda", "swahili movies", "films rwandais",
  "african movies", "african streaming",
];

// Keyword matrix: prefixes x genres/translators/years -> long-tail combos.
const PREFIX = ["agasobanuye", "filime zisobanuye", "film zisobanuye", "ibonafilms"];
const GENRES = ["action", "comedy", "romance", "horror", "kung fu", "indian", "chinese", "nigerian", "series", "nshya", "gashya"];
const TRANSLATORS = ["rocky kirabiranya", "junior giti", "gaheza", "didier", "dylan kabaka", "kimomo", "siniya", "sikov", "perfect", "lee creator", "sankara"];
const YEARS = ["2024", "2025", "2026"];
const MATRIX: string[] = [];
for (const p of PREFIX) {
  for (const g of GENRES) MATRIX.push(`${p} ${g}`);
  for (const t of TRANSLATORS) MATRIX.push(`${p} ${t}`);
  for (const y of YEARS) MATRIX.push(`${p} ${y}`);
}

/** Per-film keyword combos used by watch pages and the video sitemap. */
export function filmKeywords(title: string, interpreter?: string | null, category?: string | null): string[] {
  const t = (title || "").toLowerCase().trim();
  const i = (interpreter || "").toLowerCase().trim();
  const out = [t, `${t} agasobanuye`, `${t} ibonafilms`, `${t} filime isobanuye`, `reba ${t}`, `${t} download`];
  if (i) out.push(i, `${t} ${i}`, `agasobanuye ${i}`, `${i} ibonafilms`);
  if (category) out.push(category.toLowerCase());
  out.push("ibonafilms", "agasobanuye");
  return Array.from(new Set(out.filter(Boolean)));
}

export const IBONA_KEYWORD_LIST: string[] = Array.from(
  new Set([...CORE, ...AGASOBANUYE, ...NARRATORS, ...GENERAL, ...MATRIX]),
);

export const IBONA_KEYWORDS: string = IBONA_KEYWORD_LIST.join(", ");
