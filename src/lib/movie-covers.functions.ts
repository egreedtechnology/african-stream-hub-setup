import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fetches REAL movie posters/backdrops from TMDB (themoviedb.org).
 * Looks up each video by its clean title (+ year when known) and saves
 * poster_url, backdrop_url and thumbnail_url so the whole site shows
 * the real movie cover instead of the fallback.
 *
 * Requires the TMDB_API_KEY secret (free key from themoviedb.org).
 */

const TMDB_API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

async function searchTmdb(apiKey: string, title: string, year?: number | null): Promise<TmdbMovie | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    query: title,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  if (year) params.set("year", String(year));

  let res = await fetch(`${TMDB_API}/search/movie?${params}`);
  let body = (await res.json()) as { results?: TmdbMovie[] };
  let hit = body.results?.find((r) => r.poster_path) ?? null;

  // Retry without year and as TV show if nothing found
  if (!hit && year) {
    params.delete("year");
    res = await fetch(`${TMDB_API}/search/movie?${params}`);
    body = (await res.json()) as { results?: TmdbMovie[] };
    hit = body.results?.find((r) => r.poster_path) ?? null;
  }
  if (!hit) {
    res = await fetch(`${TMDB_API}/search/tv?${params}`);
    body = (await res.json()) as { results?: TmdbMovie[] };
    hit = body.results?.find((r) => r.poster_path) ?? null;
  }
  return hit;
}

async function fillOne(
  supabase: any,
  apiKey: string,
  video: { id: string; title: string; release_year?: number | null },
) {
  const hit = await searchTmdb(apiKey, video.title, video.release_year ?? null);
  if (!hit) return { id: video.id, title: video.title, found: false as const };

  const update: Record<string, unknown> = {
    poster_url: hit.poster_path ? `${IMG}/w500${hit.poster_path}` : null,
    backdrop_url: hit.backdrop_path ? `${IMG}/w1280${hit.backdrop_path}` : null,
    thumbnail_url: hit.poster_path ? `${IMG}/w500${hit.poster_path}` : null,
  };
  if (hit.overview) update.description = hit.overview;
  const year = (hit.release_date || hit.first_air_date || "").slice(0, 4);
  if (year) update.release_year = Number(year);

  const { error } = await supabase.from("videos").update(update).eq("id", video.id);
  if (error) throw new Error(`Failed to save cover for "${video.title}": ${error.message}`);
  return { id: video.id, title: video.title, found: true as const, matched: hit.title || hit.name || "" };
}

/** Fill real covers for every video that has no poster yet (admin only). */
export const fetchMissingCovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("TMDB_API_KEY is not set. Add your free TMDB API key in the project secrets first.");
    }

    const { data: videos, error } = await supabase
      .from("videos")
      .select("id, title, release_year")
      .is("poster_url", null)
      .limit(100);
    if (error) throw new Error(`Could not load videos: ${error.message}`);

    const results = [];
    for (const v of videos ?? []) {
      try {
        results.push(await fillOne(supabase, apiKey, v));
      } catch (e) {
        results.push({ id: v.id, title: v.title, found: false as const, error: (e as Error).message });
      }
    }
    const found = results.filter((r) => r.found).length;
    return { total: results.length, found, results };
  });

/** Refresh the cover of a single video by id (admin / uploader). */
export const fetchCoverForVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { videoId: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("TMDB_API_KEY is not set. Add your free TMDB API key in the project secrets first.");
    }

    const { data: video, error } = await supabase
      .from("videos")
      .select("id, title, release_year")
      .eq("id", data.videoId)
      .single();
    if (error || !video) throw new Error("Video not found.");

    return fillOne(supabase, apiKey, video);
  });
