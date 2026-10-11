// Long-tail keyword list for IBONA (formerly Rebalive) — Kinyarwanda, Swahili,
// English and French terms covering agasobanuye films, film nyarwanda,
// amakuru, comedy, gospel, music and creator names. Emitted as the site-wide
// <meta name="keywords"> and also exposed for JSON-LD "keywords" fields.

const CORE = [
  "ibona", "ibona rwanda", "ibona platform", "ibona app", "ibona streaming", "ibona tv",
  "ibona video", "ibona movies", "ibona amafilime", "ibona music", "ibona news",
  "rebalive", "rebalive rwanda", "rebalive app", "rebalive streaming", "rebalive tv",
  "rebalive.egreedtech.org", "egreedtech ibona",
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
  "sobanukirwa", "sobanukiwe", "film zisobanuye", "amafilime asobanuye",
  "amafilime yasobanuwe", "amafilime yo mu rwanda", "amafilime nyarwanda",
  "film nyarwanda", "film zo mu rwanda", "amakinamico", "amakinamico yo mu rwanda",
];

const KINYARWANDA_CONTENT = [
  "film nyarwanda", "amafilime", "amafilime nyarwanda", "film zisobaniye",
  "amafilime yasobanuwe", "amafilime mashya", "amafilime meza", "amafilime asekeje",
  "insanganyamatsiko", "ibitaramo", "ibitaramo nyarwanda", "amakuru",
  "amakuru y'u rwanda", "amakuru mashya", "amakuru afatika", "news shorts",
  "amakuru ya vuba", "flash amakuru", "ihuriro", "urukurikirane", "seriya",
  "seriya zo mu rwanda", "urukurikirane rw'ibitaramo",
];

const COMEDY_MUSIC_GOSPEL = [
  "comedy nyarwanda", "comedians nyarwanda", "seka rwanda", "seka byinshi",
  "gakondo comedy", "yozefo comedy", "papa sava", "eric omondi rwanda",
  "gospel nyarwanda", "indirimbo za gikristo", "chorale rwanda",
  "indirimbo z'urukundo", "afrobeats", "african music", "african music rwanda",
  "bongo flava", "swahili music", "kenyan music", "ugandan music",
  "nigerian music", "amapiano", "african playlist", "rwandan music",
  "kinyarwanda songs", "kinyarwanda music", "kinyarwanda audio",
];

const LANGUAGES_REGIONS = [
  "kinyarwanda", "swahili", "english", "french", "rwanda", "kigali", "east africa",
  "africa streaming", "african-first streaming", "rwanda video platform",
  "african netflix", "african youtube", "streaming rwanda", "streaming africa",
  "streaming kinyarwanda", "streaming swahili", "streaming amakuru",
];

const ACTIONS = [
  "watch", "stream", "reba", "kureba", "kureba amafilime", "reba film",
  "download", "kuramura", "sub", "subtitle", "captions", "insobanuro",
  "mu kinyarwanda", "in kinyarwanda", "yasobanuwe mu kinyarwanda",
  "watch online", "watch free", "hd online", "full movie", "full film",
  "kureba kuri interineti", "kureba ubuntu", "kureba ku ibona",
];

// Expand with combinations (~ each core term × each action = long-tail)
const combos: string[] = [];
for (const c of ["agasobanuye", "film nyarwanda", "amakuru", "ibona", "rebalive"]) {
  for (const a of ["online", "free", "hd", "2024", "2025", "2026", "app", "website", "streaming", "download", "youtube", "telegram", "new", "latest", "best", "top", "trending", "kinyarwanda", "swahili", "english"]) {
    combos.push(`${c} ${a}`);
  }
}

export const IBONA_KEYWORDS_LIST = [
  ...CORE,
  ...AGASOBANUYE,
  ...NARRATORS,
  ...KINYARWANDA_CONTENT,
  ...COMEDY_MUSIC_GOSPEL,
  ...LANGUAGES_REGIONS,
  ...ACTIONS,
  ...combos,
];

// De-dupe while preserving order.
const seen = new Set<string>();
const deduped = IBONA_KEYWORDS_LIST.filter((k) => {
  const key = k.toLowerCase().trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

export const IBONA_KEYWORDS = deduped.join(", ");
export const IBONA_KEYWORDS_COUNT = deduped.length;
