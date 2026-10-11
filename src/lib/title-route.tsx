import type { Video } from "@/data/videos";

const BASE = "https://rebalive.egreedtech.org";

export function toISODuration(sec?: number): string | undefined {
  if (!sec) return undefined;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `PT${h ? h + "H" : ""}${m ? m + "M" : ""}${s ? s + "S" : "0S"}`;
}

/** Build the meta/links/scripts head object for a movie/series/tv/anime/drama/documentary page. */
export function buildTitleHead(v: Video | null | undefined, kind: string, slug: string) {
  const url = `${BASE}/${kind}/${slug}`;
  if (!v) {
    return {
      meta: [
        { title: `Not found — IBONA` },
        { name: "robots", content: "noindex" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  }
  const desc = (v.description || `Watch ${v.title} on IBONA — ${kind}, ${v.category}, ${v.language}.`).slice(0, 300);
  const image = v.posterUrl || v.backdropUrl || v.thumbnail;
  const kwParts = [
    v.title, v.originalTitle, kind, v.category, v.language,
    ...(v.genres || []), ...(v.tags || []), ...(v.cast || []),
    v.director, v.countryCode, v.releaseYear ? String(v.releaseYear) : undefined,
    "agasobanuye", "film nyarwanda", "IBONA", "Rebalive",
  ].filter(Boolean) as string[];

  const schemaType = kind === "series" || kind === "tv" || kind === "anime" || kind === "drama"
    ? "TVSeries"
    : "Movie";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: v.title,
    alternateName: v.originalTitle || undefined,
    description: desc,
    url,
    image,
    inLanguage: v.language,
    genre: v.genres && v.genres.length ? v.genres : [v.category],
    datePublished: v.releaseYear ? `${v.releaseYear}-01-01` : v.createdAt,
    countryOfOrigin: v.countryCode ? { "@type": "Country", name: v.countryCode.toUpperCase() } : undefined,
    director: v.director ? { "@type": "Person", name: v.director } : undefined,
    actor: v.cast?.map((c) => ({ "@type": "Person", name: c })),
    aggregateRating: v.imdbRating
      ? { "@type": "AggregateRating", ratingValue: v.imdbRating, bestRating: 10, ratingCount: Math.max(1, v.viewsRaw || 1) }
      : undefined,
    trailer: v.trailerUrl ? { "@type": "VideoObject", name: `${v.title} — Trailer`, embedUrl: v.trailerUrl, thumbnailUrl: image } : undefined,
    duration: toISODuration(v.durationSeconds),
    publisher: { "@type": "Organization", name: "IBONA", url: BASE },
  };

  return {
    meta: [
      { title: `${v.title}${v.releaseYear ? ` (${v.releaseYear})` : ""} — Watch on IBONA` },
      { name: "description", content: desc.slice(0, 160) },
      { name: "keywords", content: kwParts.join(", ") },
      { property: "og:type", content: schemaType === "Movie" ? "video.movie" : "video.tv_show" },
      { property: "og:url", content: url },
      { property: "og:title", content: v.title },
      { property: "og:description", content: desc.slice(0, 160) },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: v.title },
      { name: "twitter:description", content: desc.slice(0, 160) },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "IBONA", item: BASE },
            { "@type": "ListItem", position: 2, name: kind.charAt(0).toUpperCase() + kind.slice(1) + "s", item: `${BASE}/${kind === "movie" ? "movies" : kind}` },
            { "@type": "ListItem", position: 3, name: v.title, item: url },
          ],
        }),
      },
    ],
  };
}
