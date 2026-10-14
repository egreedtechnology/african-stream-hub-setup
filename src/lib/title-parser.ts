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

export function parseTitle(raw: string): ParsedTitle {
  let s = ` ${raw.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[._\-\[\]()]+/g, " ")} `.replace(/\s+/g, " ");

  let quality: string | undefined;
  const q = s.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
  if (q) { quality = q[1].toLowerCase() === "4k" ? "4K" : q[1].toLowerCase(); s = s.replace(q[0], " "); }

  let partNumber: number | undefined;
  let totalParts: number | undefined;
  const p = s.match(/\b(?:part|pt|igice|episode|ep)\s*(\d{1,2})(?:\s*(?:of|kuri|\/)\s*(\d{1,2}))?\b/i);
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

  const title = s.replace(NOISE, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => (/^[ivx]+$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ")
    || raw;

  const seriesSlug = slugify([title, interpreter].filter(Boolean).join(" "));
  return { title, interpreter, partNumber, totalParts, releaseYear, quality, seriesSlug };
}
