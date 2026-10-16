// Long-tail keyword list for IBONA (formerly Rebalive) — Kinyarwanda, Swahili,
// English and French terms covering agasobanuye films, film nyarwanda,
// amakuru, comedy, gospel, music and creator names. Emitted as the site-wide
// <meta name="keywords"> and also exposed for JSON-LD "keywords" fields.

const CORE = [
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

export const IBONA_KEYWORD_LIST: string[] = Array.from(
  new Set([...CORE, ...AGASOBANUYE, ...NARRATORS, ...GENERAL]),
);

export const IBONA_KEYWORDS: string = IBONA_KEYWORD_LIST.join(", ");
