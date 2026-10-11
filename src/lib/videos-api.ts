import { supabase } from "@/integrations/supabase/client";
import { GENRES } from "@/lib/taxonomy";
import type { Video } from "@/data/videos";

export interface DbVideo {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  language: "Kinyarwanda" | "Swahili" | "English";
  category: "Music" | "Comedy" | "Films" | "Agasobanuye";
  visibility: "public" | "unlisted" | "private";
  status: "processing" | "ready" | "failed";
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  views: number;
  likes: number;
  created_at: string;
  media_type?: "video" | "audio" | null;
  // Extended metadata columns
  slug?: string | null;
  original_title?: string | null;
  release_year?: number | null;
  country_code?: string | null;
  director?: string | null;
  cast?: string[] | null;
  genres?: string[] | null;
  tags?: string[] | null;
  imdb_rating?: number | null;
  imdb_id?: string | null;
  quality?: string | null;
  trailer_url?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  movie_type?: "movie" | "series" | "tv" | "anime" | "drama" | "documentary" | null;
  episode_number?: number | null;
  season_number?: number | null;
  series_slug?: string | null;
  is_featured?: boolean | null;
  is_trending?: boolean | null;
  is_top_rated?: boolean | null;
  is_editors_choice?: boolean | null;
  has_agasobanuye?: boolean | null;
  profiles?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

const FALLBACK_THUMB = "/placeholder.svg";
const SELECT_COLS = "*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)";

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(s: number | null | undefined): string {
  if (!s || s < 1) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function dbToVideo(v: DbVideo): Video {
  const creator = v.profiles?.display_name || v.profiles?.username || "Creator";
  return {
    id: v.id,
    title: v.title,
    creator,
    creatorId: v.owner_id,
    creatorUsername: v.profiles?.username ?? undefined,
    creatorAvatar: v.profiles?.avatar_url ?? undefined,
    thumbnail: v.poster_url || v.thumbnail_url || FALLBACK_THUMB,
    previewSrc: v.video_url,
    views: formatViews(v.views ?? 0),
    viewsRaw: v.views ?? 0,
    duration: formatDuration(v.duration_seconds),
    durationSeconds: v.duration_seconds ?? undefined,
    language: v.language,
    category: v.category,
    description: v.description ?? "",
    uploadedAt: relTime(v.created_at),
    createdAt: v.created_at,
    mediaType: v.media_type ?? "video",
    visibility: v.visibility === "private" ? "private" : "public",
    slug: v.slug ?? undefined,
    originalTitle: v.original_title ?? undefined,
    releaseYear: v.release_year ?? undefined,
    countryCode: v.country_code ?? undefined,
    director: v.director ?? undefined,
    cast: v.cast ?? undefined,
    genres: v.genres ?? undefined,
    tags: v.tags ?? undefined,
    imdbRating: v.imdb_rating ?? undefined,
    imdbId: v.imdb_id ?? undefined,
    quality: v.quality ?? undefined,
    trailerUrl: v.trailer_url ?? undefined,
    posterUrl: v.poster_url ?? undefined,
    backdropUrl: v.backdrop_url ?? undefined,
    movieType: v.movie_type ?? undefined,
    episodeNumber: v.episode_number ?? undefined,
    seasonNumber: v.season_number ?? undefined,
    seriesSlug: v.series_slug ?? undefined,
    isFeatured: v.is_featured ?? undefined,
    isTrending: v.is_trending ?? undefined,
    isTopRated: v.is_top_rated ?? undefined,
    isEditorsChoice: v.is_editors_choice ?? undefined,
    hasAgasobanuye: v.has_agasobanuye ?? undefined,
  };
}

// ---- New filtered fetchers for category landing pages ----

export async function fetchVideoBySlug(slug: string): Promise<Video | null> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("slug", slug).eq("visibility", "public").eq("status", "ready").maybeSingle();
  return data ? dbToVideo(data as unknown as DbVideo) : null;
}

export async function fetchVideosByGenre(genre: string, limit = 60): Promise<Video[]> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).contains("genres", [genre]).eq("visibility", "public").eq("status", "ready").order("created_at", { ascending: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

export async function fetchVideosByCountry(code: string, limit = 60): Promise<Video[]> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("country_code", code).eq("visibility", "public").eq("status", "ready").order("created_at", { ascending: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

export async function fetchVideosByYear(year: number, limit = 60): Promise<Video[]> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("release_year", year).eq("visibility", "public").eq("status", "ready").order("created_at", { ascending: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

export async function fetchVideosByType(type: string, limit = 60): Promise<Video[]> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("movie_type", type).eq("visibility", "public").eq("status", "ready").order("created_at", { ascending: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

export async function fetchTopRatedVideos(limit = 12): Promise<Video[]> {
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("visibility", "public").eq("status", "ready").order("imdb_rating", { ascending: false, nullsFirst: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

/**
 * Trending = the scheduled ranking in `trending_scores` (recent views, likes,
 * comments and freshness inside a rolling window, recomputed hourly).
 * Falls back to all-time views if the ranking table is empty.
 */
export async function fetchTrendingVideos(limit = 12): Promise<Video[]> {
  const { data: ranked } = await supabase
    .from("trending_scores")
    .select("video_id, rank")
    .order("rank", { ascending: true })
    .limit(limit);

  const ids = ((ranked as { video_id: string; rank: number }[] | null) ?? []).map((r) => r.video_id);
  if (ids.length) {
    const { data } = await supabase
      .from("videos")
      .select(SELECT_COLS)
      .in("id", ids)
      .eq("visibility", "public")
      .eq("status", "ready");
    const rows = (data as unknown as DbVideo[]) ?? [];
    const order = new Map(ids.map((id, i) => [id, i]));
    return rows
      .slice()
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
      .map(dbToVideo);
  }

  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("visibility", "public").eq("status", "ready").order("views", { ascending: false, nullsFirst: false }).limit(limit);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

/** When the trending order was last recomputed. */
export async function fetchTrendingComputedAt(): Promise<string | null> {
  const { data } = await supabase
    .from("trending_scores")
    .select("computed_at")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { computed_at: string } | null)?.computed_at ?? null;
}

export async function fetchRelatedVideos(video: Video, limit = 12): Promise<Video[]> {
  const q = supabase.from("videos").select(SELECT_COLS).eq("visibility", "public").eq("status", "ready").neq("id", video.id).limit(limit);
  if (video.genres && video.genres.length) {
    const { data } = await q.overlaps("genres", video.genres);
    return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
  }
  const { data } = await q.eq("category", video.category);
  return ((data as unknown as DbVideo[]) ?? []).map(dbToVideo);
}

export async function fetchPublishedVideos(limit = 50): Promise<Video[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
    .eq("visibility", "public")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as DbVideo[]).map(dbToVideo);
}

export async function fetchAllFeed(): Promise<Video[]> {
  // Real uploads only — mock catalog has been retired in favor of creator uploads.
  return await fetchPublishedVideos(100);
}

/** Returns feed with videos from creators the current user follows pinned to the top. */
export async function fetchPrioritizedFeed(userId: string | null): Promise<Video[]> {
  const all = await fetchAllFeed();
  if (!userId) return all;
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  const followedIds = new Set((data ?? []).map((r) => r.following_id as string));
  if (followedIds.size === 0) return all;
  const followed: Video[] = [];
  const others: Video[] = [];
  for (const v of all) {
    if (v.creatorId && followedIds.has(v.creatorId)) followed.push(v);
    else others.push(v);
  }
  return [...followed, ...others];
}

// ---- Follows ----

export async function getFollowState(creatorId: string, viewerId: string | null): Promise<{ following: boolean; followers: number }> {
  const [countRes, mine] = await Promise.all([
    supabase.rpc("get_follower_count", { _creator: creatorId }),
    viewerId
      ? supabase.from("follows").select("id").eq("follower_id", viewerId).eq("following_id", creatorId).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  const followers = typeof countRes.data === "number" ? countRes.data : Number(countRes.data ?? 0);
  return { following: !!(mine as { data: unknown }).data, followers };
}

export async function followCreator(creatorId: string, viewerId: string): Promise<void> {
  const { error } = await supabase.from("follows").insert({ follower_id: viewerId, following_id: creatorId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function unfollowCreator(creatorId: string, viewerId: string): Promise<void> {
  const { error } = await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", creatorId);
  if (error) throw error;
}

export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  if (!error && data) return dbToVideo(data as unknown as DbVideo);
  return null;
}

export async function incrementVideoView(id: string): Promise<void> {
  // Best-effort, fire-and-forget. UUID-shaped only.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  try {
    const { data } = await supabase.from("videos").select("views").eq("id", id).maybeSingle();
    if (data) {
      await supabase.from("videos").update({ views: (data.views ?? 0) + 1 }).eq("id", id);
    }
    // Time-stamped event so the scheduled trending window can measure recency.
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("video_view_events").insert({ video_id: id, viewer_id: auth?.user?.id ?? null });
  } catch {
    /* ignore */
  }
}

export interface ContinueWatchingItem extends Video {
  resumePosition: number;
}

/** Returns the user's most-recently-progressed videos with resume positions. */
export async function fetchContinueWatching(userId: string, limit = 10): Promise<ContinueWatchingItem[]> {
  const { data: prog } = await supabase
    .from("video_progress")
    .select("video_id, position_seconds, updated_at")
    .eq("user_id", userId)
    .gt("position_seconds", 5)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (!prog || prog.length === 0) return [];
  const ids = prog.map((p) => p.video_id as string);
  const { data: vids } = await supabase
    .from("videos")
    .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
    .in("id", ids)
    .eq("status", "ready");
  if (!vids) return [];
  const byId = new Map<string, DbVideo>((vids as unknown as DbVideo[]).map((v) => [v.id, v]));
  const out: ContinueWatchingItem[] = [];
  for (const p of prog) {
    const dbv = byId.get(p.video_id as string);
    if (!dbv) continue;
    // Skip near-finished items (>95% watched)
    const dur = dbv.duration_seconds ?? 0;
    const pos = (p.position_seconds as number) ?? 0;
    if (dur && pos >= dur * 0.95) continue;
    out.push({ ...dbToVideo(dbv), resumePosition: pos });
  }
  return out;
}

export interface CreatorProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
}

export async function fetchProfileByUsername(username: string): Promise<CreatorProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, banner_url, bio")
    .eq("username", username)
    .maybeSingle();
  return (data as CreatorProfile) ?? null;
}

// ---- Likes ----

export async function getLikeState(videoId: string, viewerId: string | null): Promise<{ liked: boolean; count: number }> {
  if (!/^[0-9a-f-]{36}$/i.test(videoId)) return { liked: false, count: 0 };
  const [vid, mine] = await Promise.all([
    supabase.from("videos").select("likes").eq("id", videoId).maybeSingle(),
    viewerId
      ? supabase.from("video_likes").select("user_id").eq("video_id", videoId).eq("user_id", viewerId).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  const count = Number((vid.data as { likes?: number } | null)?.likes ?? 0);
  return { liked: !!(mine as { data: unknown }).data, count };
}

export async function likeVideo(videoId: string, viewerId: string): Promise<void> {
  const { error } = await supabase.from("video_likes").insert({ video_id: videoId, user_id: viewerId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function unlikeVideo(videoId: string, viewerId: string): Promise<void> {
  const { error } = await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", viewerId);
  if (error) throw error;
}

// ---- Search ----

export async function searchAll(
  q: string,
  opts: { includeDrafts?: boolean; viewerId?: string | null } = {},
): Promise<{ videos: Video[]; creators: CreatorProfile[] }> {
  const term = q.trim();
  if (!term) return { videos: [], creators: [] };
  const like = `%${term.replace(/[%_]/g, (m) => "\\" + m)}%`;
  const includeDrafts = !!opts.includeDrafts && !!opts.viewerId;

  const publicVideosQ = supabase
    .from("videos")
    .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
    .eq("visibility", "public")
    .eq("status", "ready")
    .or(`title.ilike.${like},description.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(100);

  const draftVideosQ = includeDrafts
    ? supabase
        .from("videos")
        .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
        .eq("owner_id", opts.viewerId!)
        .neq("visibility", "public")
        .or(`title.ilike.${like},description.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(50)
    : Promise.resolve({ data: [] as unknown[] } as { data: unknown[] });

  const [vRes, dRes, cRes] = await Promise.all([
    publicVideosQ,
    draftVideosQ,
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, banner_url, bio")
      .or(`username.ilike.${like},display_name.ilike.${like}`)
      .limit(40),
  ]);
  const dbVideos = [
    ...(((dRes as { data: unknown }).data as DbVideo[] | null) ?? []).map(dbToVideo),
    ...((vRes.data as unknown as DbVideo[]) ?? []).map(dbToVideo),
  ];
  const dbCreators = (cRes.data as CreatorProfile[]) ?? [];
  return { videos: dbVideos, creators: dbCreators };
}

export async function fetchVideosByOwner(ownerId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
    .eq("owner_id", ownerId)
    .eq("visibility", "public")
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as DbVideo[]).map(dbToVideo);
}

// ---- Advanced search (Netflix-style filters) ----

export interface AdvancedSearchFilters {
  q?: string;
  actor?: string;
  director?: string;
  genre?: string;
  country?: string;
  year?: number;
  language?: string;
  subtitles?: string;
  agasobanuye?: boolean;
  minRating?: number;
  duration?: "short" | "medium" | "long" | "";
  quality?: string;
  collection?: "featured" | "trending" | "top_rated" | "editors_choice" | "";
  sort?: "newest" | "popular" | "rating" | "title" | "duration";
  limit?: number;
}

const sel = (s: string): string => s;

/** Opaque cursor: base64-encoded offset into the current filter/sort window. */
function encodeCursor(offset: number): string {
  return btoa(JSON.stringify({ o: offset }));
}
function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(atob(cursor)) as { o?: number };
    const o = Number(parsed.o);
    return Number.isFinite(o) && o >= 0 ? o : 0;
  } catch {
    return 0;
  }
}

export interface PagedVideos {
  items: Video[];
  nextCursor: string | null;
}

function applyFilters(f: AdvancedSearchFilters, ids?: string[], countOnly = false) {
  const like = (v: string) => `%${v.trim().replace(/[%_]/g, (m) => "\\" + m)}%`;

  let query = countOnly
    ? supabase.from("videos").select("id", { count: "exact", head: true })
    : supabase
        .from("videos")
        .select(sel("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)"));
  query = query.eq("visibility", "public").eq("status", "ready") as typeof query;


  if (f.q?.trim()) {
    const l = like(f.q);
    query = query.or(`title.ilike.${l},original_title.ilike.${l},description.ilike.${l},director.ilike.${l}`);
  }
  if (f.actor?.trim()) query = query.contains("cast", [f.actor.trim()]);
  if (f.director?.trim()) query = query.ilike("director", like(f.director));
  if (f.genre) query = query.contains("genres", [f.genre]);
  if (f.country) query = query.eq("country_code", f.country);
  if (f.year) query = query.eq("release_year", f.year);
  if (f.language) query = query.eq("language", f.language as "Kinyarwanda" | "Swahili" | "English");
  if (f.agasobanuye) query = query.eq("has_agasobanuye", true);
  if (typeof f.minRating === "number" && f.minRating > 0) query = query.gte("imdb_rating", f.minRating);
  if (f.quality) query = query.eq("quality", f.quality);
  if (f.collection === "featured") query = query.eq("is_featured", true);
  if (f.collection === "trending") query = query.eq("is_trending", true);
  if (f.collection === "top_rated") query = query.eq("is_top_rated", true);
  if (f.collection === "editors_choice") query = query.eq("is_editors_choice", true);

  if (f.duration === "short") query = query.lt("duration_seconds", 300);
  if (f.duration === "medium") query = query.gte("duration_seconds", 300).lt("duration_seconds", 2400);
  if (f.duration === "long") query = query.gte("duration_seconds", 2400);

  if (ids) query = query.in("id", ids);

  switch (f.sort) {
    case "popular":
      query = query.order("views", { ascending: false, nullsFirst: false });
      break;
    case "rating":
      query = query.order("imdb_rating", { ascending: false, nullsFirst: false });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "duration":
      query = query.order("duration_seconds", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  // Stable tiebreaker so cursor windows never overlap or skip rows.
  return query.order("id", { ascending: true });
}

async function subtitleIds(lang: string): Promise<string[]> {
  const { data: caps } = await supabase
    .from("video_captions")
    .select("video_id")
    .eq("language", lang)
    .limit(2000);
  return (caps ?? []).map((c) => c.video_id as string);
}

/**
 * Cursor-paginated multi-facet query. Requests one extra row to detect whether
 * another page exists, so mobile infinite scroll never fires a wasted round-trip.
 */
export async function fetchAdvancedSearchPage(
  f: AdvancedSearchFilters,
  cursor?: string | null,
): Promise<PagedVideos> {
  const pageSize = Math.max(1, f.limit ?? 24);
  const offset = decodeCursor(cursor);

  let ids: string[] | undefined;
  if (f.subtitles) {
    ids = await subtitleIds(f.subtitles);
    if (ids.length === 0) return { items: [], nextCursor: null };
  }

  const query = applyFilters(f, ids);
  const { data } = await query.range(offset, offset + pageSize).returns<DbVideo[]>();
  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const items = (hasMore ? rows.slice(0, pageSize) : rows).map(dbToVideo);
  return { items, nextCursor: hasMore ? encodeCursor(offset + pageSize) : null };
}

/** Backwards-compatible single-shot variant. */
export async function fetchAdvancedSearch(f: AdvancedSearchFilters): Promise<Video[]> {
  const { items } = await fetchAdvancedSearchPage({ ...f, limit: f.limit ?? 120 }, null);
  return items;
}

/** Total number of rows matching a filter set (no rows fetched). */
export async function countAdvancedSearch(f: AdvancedSearchFilters): Promise<number> {
  let ids: string[] | undefined;
  if (f.subtitles) {
    ids = await subtitleIds(f.subtitles);
    if (ids.length === 0) return 0;
  }
  const { count } = await applyFilters(f, ids, true);
  return count ?? 0;
}

export type FacetKey =
  | "genre"
  | "country"
  | "year"
  | "language"
  | "subtitles"
  | "agasobanuye"
  | "collection"
  | "quality"
  | "duration"
  | "actor"
  | "director"
  | "rating";

export interface FacetCounts {
  /** Rows matching the full active filter set. */
  total: number;
  /** Rows matching the query plus a single active facet (isolated). */
  perFacet: Partial<Record<FacetKey, number>>;
}

/**
 * Counts for the whole active filter set plus, for each active facet, the count
 * that facet would return on its own — so a user can see which facet narrows most.
 */
export async function fetchFacetCounts(f: AdvancedSearchFilters): Promise<FacetCounts> {
  const base: AdvancedSearchFilters = { q: f.q };
  const isolated: Array<[FacetKey, AdvancedSearchFilters]> = [];
  const add = (key: FacetKey, patch: AdvancedSearchFilters) => isolated.push([key, { ...base, ...patch }]);

  if (f.genre) add("genre", { genre: f.genre });
  if (f.country) add("country", { country: f.country });
  if (f.year) add("year", { year: f.year });
  if (f.language) add("language", { language: f.language });
  if (f.subtitles) add("subtitles", { subtitles: f.subtitles });
  if (f.agasobanuye) add("agasobanuye", { agasobanuye: true });
  if (f.collection) add("collection", { collection: f.collection });
  if (f.quality) add("quality", { quality: f.quality });
  if (f.duration) add("duration", { duration: f.duration });
  if (f.actor?.trim()) add("actor", { actor: f.actor });
  if (f.director?.trim()) add("director", { director: f.director });
  if (typeof f.minRating === "number" && f.minRating > 0) add("rating", { minRating: f.minRating });

  const [total, ...counts] = await Promise.all([
    countAdvancedSearch(f).catch(() => 0),
    ...isolated.map(([, filters]) => countAdvancedSearch(filters).catch(() => 0)),
  ]);

  const perFacet: Partial<Record<FacetKey, number>> = {};
  isolated.forEach(([key], i) => {
    perFacet[key] = counts[i] ?? 0;
  });
  return { total, perFacet };
}



// ---- Autocomplete suggestions ----

export type SuggestionKind = "title" | "actor" | "director" | "genre" | "collection" | "creator";

export interface Suggestion {
  kind: SuggestionKind;
  label: string;
  /** Extra context line, e.g. release year or handle. */
  hint?: string;
  /** Target slug/id for direct navigation when the suggestion is a title/creator. */
  slug?: string;
  movieType?: string | null;
  videoId?: string;
}

const COLLECTION_SUGGESTIONS: Array<{ label: string; value: string }> = [
  { label: "Featured", value: "featured" },
  { label: "Trending now", value: "trending" },
  { label: "Top rated", value: "top_rated" },
  { label: "Editor's choice", value: "editors_choice" },
];

/** Type-ahead suggestions across titles, cast, directors, genres, collections and creators. */
export async function fetchSuggestions(term: string, limit = 8): Promise<Suggestion[]> {
  const t = term.trim();
  if (t.length < 2) return [];
  const lower = t.toLowerCase();
  const like = `%${t.replace(/[%_]/g, (m) => "\\" + m)}%`;

  const [vidRes, creatorRes] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, slug, movie_type, release_year, director, cast, genres")
      .eq("visibility", "public")
      .eq("status", "ready")
      .or(`title.ilike.${like},original_title.ilike.${like},director.ilike.${like}`)
      .limit(40),
    supabase
      .from("profiles")
      .select("username, display_name")
      .or(`username.ilike.${like},display_name.ilike.${like}`)
      .limit(6),
  ]);

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    const key = `${s.kind}:${s.label.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  type Row = {
    id: string;
    title: string | null;
    slug: string | null;
    movie_type: string | null;
    release_year: number | null;
    director: string | null;
    cast: string[] | null;
    genres: string[] | null;
  };
  const rows = ((vidRes.data as unknown as Row[]) ?? []);

  for (const r of rows) {
    if (r.title && r.title.toLowerCase().includes(lower)) {
      push({
        kind: "title",
        label: r.title,
        hint: r.release_year ? String(r.release_year) : undefined,
        slug: r.slug ?? undefined,
        movieType: r.movie_type,
        videoId: r.id,
      });
    }
  }
  for (const r of rows) {
    if (r.director && r.director.toLowerCase().includes(lower)) {
      push({ kind: "director", label: r.director, hint: "Director" });
    }
    for (const actor of r.cast ?? []) {
      if (actor.toLowerCase().includes(lower)) push({ kind: "actor", label: actor, hint: "Actor" });
    }
  }

  // Cast/director hits can also live on rows whose title didn't match the term.
  if (out.filter((s) => s.kind === "actor").length === 0) {
    const { data } = await supabase
      .from("videos")
      .select("cast")
      .eq("visibility", "public")
      .eq("status", "ready")
      .overlaps("cast", [t])
      .limit(5);
    for (const r of ((data as { cast: string[] | null }[]) ?? [])) {
      for (const actor of r.cast ?? []) {
        if (actor.toLowerCase().includes(lower)) push({ kind: "actor", label: actor, hint: "Actor" });
      }
    }
  }

  for (const g of GENRES) {
    if (g.toLowerCase().includes(lower)) push({ kind: "genre", label: g, hint: "Genre" });
  }
  for (const c of COLLECTION_SUGGESTIONS) {
    if (c.label.toLowerCase().includes(lower)) push({ kind: "collection", label: c.label, hint: "Collection", slug: c.value });
  }
  for (const c of ((creatorRes.data as { username: string | null; display_name: string | null }[]) ?? [])) {
    const label = c.display_name || c.username;
    if (label) push({ kind: "creator", label, hint: c.username ? `@${c.username}` : undefined, slug: c.username ?? undefined });
  }

  return out.slice(0, limit);
}

