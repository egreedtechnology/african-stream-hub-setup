// Canonical taxonomy for IBONA — used by category landing pages and sitemaps.
// Keeping these in one place so category routes and sitemap generators stay in sync.

export const GENRES = [
  "Action", "Adventure", "Animation", "Anime", "Biography", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Kids",
  "Music", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western",
  "Korean Drama", "Chinese Drama", "Japanese Drama", "Turkish Drama",
  "Indian Movies", "African Movies", "Hollywood", "Nollywood", "Rwandan Movies",
  "Agasobanuye",
] as const;
export type Genre = (typeof GENRES)[number];

export const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "rw", name: "Rwanda" },
  { code: "ke", name: "Kenya" },
  { code: "ng", name: "Nigeria" },
  { code: "za", name: "South Africa" },
  { code: "ug", name: "Uganda" },
  { code: "tz", name: "Tanzania" },
  { code: "et", name: "Ethiopia" },
  { code: "eg", name: "Egypt" },
  { code: "gh", name: "Ghana" },
  { code: "ma", name: "Morocco" },
  { code: "cd", name: "DR Congo" },
  { code: "sn", name: "Senegal" },
  { code: "ci", name: "Ivory Coast" },
  { code: "us", name: "USA" },
  { code: "gb", name: "United Kingdom" },
  { code: "in", name: "India" },
  { code: "kr", name: "South Korea" },
  { code: "cn", name: "China" },
  { code: "jp", name: "Japan" },
  { code: "tr", name: "Turkey" },
  { code: "fr", name: "France" },
  { code: "ph", name: "Philippines" },
];

export const MOVIE_TYPES = ["movie", "series", "tv", "anime", "drama", "documentary"] as const;
export type MovieType = (typeof MOVIE_TYPES)[number];

export function genreSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function genreFromSlug(slug: string): Genre | null {
  const target = slug.toLowerCase();
  return (GENRES as readonly string[]).find((g) => genreSlug(g) === target) as Genre | null;
}

/** Recent years for /year/$year routes — last 26 years (typical release-year range users browse). */
export function recentYears(): number[] {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = 0; i <= 25; i++) out.push(y - i);
  return out;
}
