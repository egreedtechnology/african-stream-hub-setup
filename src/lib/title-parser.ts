/** Parses raw file names like "Extraction.2.2023.HD.Rocky.Kirabiranya.Part.1.of.4.mp4". */

export const KNOWN_INTERPRETERS: { name: string; aliases: string[] }[] = [
  { name: "Rocky Kirabiranya", aliases: ["rocky kirabiranya", "rocky"] },
  { name: "Junior Giti", aliases: ["junior giti", "junior"] },
  { name: "Yanga", aliases: ["yanga"] },
  { name: "Sankara", aliases: ["sankara"] },
  { name: "Gaheza", aliases: ["gaheza"] },
  { name: "Savimbi", aliases: ["savimbi"] },
  { name: "Didier", aliases: ["didier"] },
  { name: "Dylan Kabaka", aliases: ["dylan kabaka", "dylan"] },
  { name: "Kimomo", aliases: ["kimomo"] },
  { name: "Siniya", aliases: ["siniya"] },
  { name: "Sikov", aliases: ["sikov"] },
  { name: "Perfect", aliases: ["perfect"] },
  { name: "Lee Creator", aliases: ["lee creator"] },
];

export interface ParsedTitle {
  title: string;
  interpreter?: string;
  partNumber?: number;
  totalParts?: number;
  releaseYear?: number;
  quality?: string;
  seriesSlug: string;
}

const NOISE = /\b(hd|fhd|uhd|hdrip|webrip|web[- ]?dl|bluray|brrip|dvdrip|x264|x265|hevc|aac|agasobanuye|yasobanuwe|full movie|film|movie|mp4|mkv|avi|kinyarwanda|ibona)\b/gi;

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** True for real video files; Streamtape also lists its auto-made "Thumb_*.jpg" cover images. */
export function isVideoFile(name: string) {
  return /\.(mp4|mkv|avi|mov|webm|m4v|flv|wmv|ts)$/i.test(name) && !/^thumb_/i.test(name);
}

export function parseTitle(raw: string): ParsedTitle {
  const cleaned = raw
    .replace(/^\s*thumb[_\s]+/i, "")
    .replace(/(\.[a-z0-9]{2,4})+$/i, "")
    .replace(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|rw|co|tv)\b/gi, " ")
    .replace(/\b(?:www\s+)?agasobanuye\s*now\s+com\b/gi, " ")
    .replace(/\bwww\b/gi, " ")
    .replace(/\b(?:dl|hd)\b/gi, " ");
  let s = ` ${cleaned.replace(/[._\-\[\]()]+/g, " ")} `.replace(/\s+/g, " ");

  let quality: string | undefined;
  const q = s.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
  if (q) { quality = q[1].toLowerCase() === "4k" ? "4K" : q[1].toLowerCase(); s = s.replace(q[0], " "); }

  let partNumber: number | undefined;
  let totalParts: number | undefined;
  const p = s.match(/\b(?:part|pt|igice|episode|ep|e(?=\d))\s*(\d{1,2})(?:\s*(?:of|kuri|\/)\s*(\d{1,2}))?\b/i);
  if (p) { partNumber = +p[1]; if (p[2]) totalParts = +p[2]; s = s.replace(p[0], " "); }

  let releaseYear: number | undefined;
  const y = s.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (y) { releaseYear = +y[1]; s = s.replace(y[0], " "); }

  let interpreter: string | undefined;
  const lower = s.toLowerCase();
  outer: for (const it of KNOWN_INTERPRETERS) {
    for (const a of it.aliases) {
      const re = new RegExp(`\\b${a.replace(/ /g, "\\s+")}\\b`, "i");
      if (re.test(lower)) { interpreter = it.name; s = s.replace(re, " "); break outer; }
    }
  }

  s = s.replace(/\b(dj)\s*$/i, " ").replace(/\s+/g, " ");
  // Trailing "A"/"B" means part 1/2 in many Agasobanuye uploads
  const ab = s.match(/\s([AB])\s*$/);
  if (ab && !partNumber) { partNumber = ab[1] === "A" ? 1 : 2; s = s.slice(0, ab.index) + " "; }

  const title = s.replace(NOISE, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ")
    || raw;

  const seriesSlug = slugify([title, interpreter].filter(Boolean).join(" "));
  return { title, interpreter, partNumber, totalParts, releaseYear, quality, seriesSlug };
}

/** Cleans a stored title for display without changing real film names. */
export function cleanDisplayTitle(raw: string): string {
  let s = (raw || "")
    .replace(/^\s*thumb[_\s]+/i, "")
    .replace(/\(\s*download\s+links?\s*\)/gi, " ")
    .replace(/(\.(mp4|mkv|avi|jpg|png|crdownload))+$/i, "")
    .replace(/\bcrdownload\b/gi, " ")
    .replace(/(?:https?:\/\/)?(?:www\.)?agasobanuye\s*now\s*(?:\.|\s)com/gi, " ")
    .replace(/\bwww\b/gi, " ")
    .replace(/\b(?:hd|fhd|uhd)\b/gi, " ")
    .replace(/_/g, " ");
  for (const it of KNOWN_INTERPRETERS) {
    for (const a of it.aliases) {
      if (a.split(" ").length < 2 && ["junior", "rocky", "dylan", "perfect"].includes(a)) continue;
      s = s.replace(new RegExp(`\\s(?:ya\\s+|by\\s+|dj\\s+)?${a.replace(/ /g, "\\s+")}\\s*$`, "i"), " ");
    }
  }
  s = s.replace(/\s(?:ya|dj)\s+rocky\s*$/i, " ").replace(/\s+/g, " ").trim();
  return s || raw;
}

/** Finds the translator from the title, including "ya Rocky" / "DJ Didier" styles. */
export function findInterpreter(raw: string): string | undefined {
  const p = parseTitle(raw).interpreter;
  if (p) return p;
  if (/\b(?:ya|dj)\s+rocky\b/i.test(raw)) return "Rocky Kirabiranya";
  return undefined;
}
