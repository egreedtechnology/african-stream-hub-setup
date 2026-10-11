import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2, Search as SearchIcon, Sparkles, EyeOff, SlidersHorizontal, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import {
  searchAll,
  dbToVideo,
  fetchAdvancedSearchPage,
  fetchFacetCounts,
  type FacetKey,
  type FacetCounts,
  type CreatorProfile,
  type DbVideo,
} from "@/lib/videos-api";

import { supabase } from "@/integrations/supabase/client";
import { semanticSearch } from "@/lib/search.functions";
import { isPopularAfrica, type Video } from "@/data/videos";
import { useAuth } from "@/contexts/AuthContext";
import { GENRES, COUNTRIES, recentYears } from "@/lib/taxonomy";

const PAGE_SIZE = 24;

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  actor: fallback(z.string(), "").default(""),
  director: fallback(z.string(), "").default(""),
  genre: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  year: fallback(z.number().int(), 0).default(0),
  language: fallback(z.string(), "").default(""),
  subtitles: fallback(z.string(), "").default(""),
  agasobanuye: fallback(z.boolean(), false).default(false),
  rating: fallback(z.number(), 0).default(0),
  duration: fallback(z.string(), "").default(""),
  quality: fallback(z.string(), "").default(""),
  collection: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "newest").default("newest"),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: ({ match }) => {
    const q = match.search.q;
    const title = q ? `Search · ${q} — IBONA` : "Advanced search — African movies, series & agasobanuye | IBONA";
    const desc = q
      ? `Search results for "${q}" on IBONA — find African videos, film nyarwanda, agasobanuye clips, music and creators matching your query.`
      : "Advanced search on IBONA: filter African movies, series, anime and agasobanuye by actor, director, genre, country, year, language, subtitles, rating, duration and quality.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: "https://rebalive.egreedtech.org/search" },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/search" }],
    };
  },
  component: SearchPage,
});

const LANGUAGES = ["Kinyarwanda", "Swahili", "English"];
const SUBTITLE_LANGS = ["rw", "en", "fr", "sw"];
const QUALITIES = ["SD", "HD", "FHD", "4K"];
const DURATIONS = [
  { value: "short", label: "Under 5 min" },
  { value: "medium", label: "5–40 min" },
  { value: "long", label: "Over 40 min" },
];
const COLLECTIONS = [
  { value: "featured", label: "Featured" },
  { value: "trending", label: "Trending now" },
  { value: "top_rated", label: "Top rated" },
  { value: "editors_choice", label: "Editor's choice" },
];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "title", label: "A–Z" },
  { value: "duration", label: "Longest" },
];

const fieldCls =
  "w-full rounded-xl bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-primary/60";

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { q } = search;
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [popularOnly, setPopularOnly] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [facetCounts, setFacetCounts] = useState<FacetCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);


  const hasFacets = useMemo(
    () =>
      Boolean(
        search.actor ||
          search.director ||
          search.genre ||
          search.country ||
          search.year ||
          search.language ||
          search.subtitles ||
          search.agasobanuye ||
          search.rating ||
          search.duration ||
          search.quality ||
          search.collection ||
          search.sort !== "newest",
      ),
    [search],
  );

  type SearchState = typeof search;
  const set = <K extends keyof SearchState>(key: K, value: SearchState[K]) =>
    navigate({ search: (prev: SearchState) => ({ ...prev, [key]: value }) });

  const clearAll = () =>
    navigate({
      search: {
        q,
        actor: "",
        director: "",
        genre: "",
        country: "",
        year: 0,
        language: "",
        subtitles: "",
        agasobanuye: false,
        rating: 0,
        duration: "",
        quality: "",
        collection: "",
        sort: "newest",
      },
    });

  const filters = useMemo(
    () => ({
      q,
      actor: search.actor,
      director: search.director,
      genre: search.genre,
      country: search.country,
      year: search.year || undefined,
      language: search.language,
      subtitles: search.subtitles,
      agasobanuye: search.agasobanuye,
      minRating: search.rating,
      duration: (search.duration || "") as "" | "short" | "medium" | "long",
      quality: search.quality,
      collection: (search.collection || "") as "" | "featured" | "trending" | "top_rated" | "editors_choice",
      sort: (search.sort || "newest") as "newest" | "popular" | "rating" | "title" | "duration",
      limit: PAGE_SIZE,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, JSON.stringify(search)],
  );

  useEffect(() => {
    if (!q.trim() && !hasFacets) {
      setVideos([]);
      setCreators([]);
      setCursor(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setCursor(null);

      // Facet-driven query is authoritative when any filter is active.
      if (hasFacets) {
        const page = await fetchAdvancedSearchPage(filters, null);
        if (cancelled) return;
        setVideos(page.items);
        setCursor(page.nextCursor);
        const { creators: cs } = q.trim()
          ? await searchAll(q, { includeDrafts, viewerId: user?.id ?? null })
          : { creators: [] as CreatorProfile[] };
        if (cancelled) return;
        setCreators(cs);
        setLoading(false);
        return;
      }

      const [textRes, semRes, firstPage] = await Promise.all([
        searchAll(q, { includeDrafts, viewerId: user?.id ?? null }),
        semanticSearch({ data: { q } }).catch(() => ({ ok: false, ids: [] as string[] })),
        fetchAdvancedSearchPage(filters, null),
      ]);
      if (cancelled) return;
      let semVideos: Video[] = [];
      const semIds = (semRes.ok ? semRes.ids : []).filter(Boolean);
      if (semIds.length) {
        const { data } = await supabase
          .from("videos")
          .select("*, profiles!videos_owner_profile_fk(display_name, username, avatar_url)")
          .in("id", semIds)
          .eq("visibility", "public")
          .eq("status", "ready");
        const byId = new Map<string, DbVideo>(((data as unknown as DbVideo[]) ?? []).map((v) => [v.id, v]));
        semVideos = semIds.map((id) => byId.get(id)).filter(Boolean).map((v) => dbToVideo(v!));
      }
      if (cancelled) return;
      const seen = new Set(semVideos.map((v) => v.id));
      const merged = [...semVideos];
      for (const v of [...textRes.videos, ...firstPage.items]) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        merged.push(v);
      }
      setVideos(merged);
      // Keep paging through the keyword window so long catalogs stay browsable.
      setCursor(firstPage.nextCursor);
      setCreators(textRes.creators);
      setLoading(false);
    };
    run();
    const onUpdate = () => run();
    if (typeof window !== "undefined") window.addEventListener("ibona:video-updated", onUpdate);
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") window.removeEventListener("ibona:video-updated", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, includeDrafts, user?.id, hasFacets, filters]);

  // Result counts for the active filter set and for each active facet on its own.
  useEffect(() => {
    if (!q.trim() && !hasFacets) {
      setFacetCounts(null);
      return;
    }
    let cancelled = false;
    setCountsLoading(true);
    fetchFacetCounts(filters)
      .then((c) => {
        if (!cancelled) setFacetCounts(c);
      })
      .catch(() => {
        if (!cancelled) setFacetCounts(null);
      })
      .finally(() => {
        if (!cancelled) setCountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasFacets, filters]);


  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    const page = await fetchAdvancedSearchPage(filters, cursor).catch(() => ({
      items: [] as Video[],
      nextCursor: null,
    }));
    setVideos((prev) => {
      const seen = new Set(prev.map((v) => v.id));
      return [...prev, ...page.items.filter((v) => !seen.has(v.id))];
    });
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }, [cursor, loadingMore, loading, filters]);

  // Infinite scroll — observes a sentinel below the grid (mobile-friendly, no button taps).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  const shownVideos = useMemo(
    () => (popularOnly ? videos.filter(isPopularAfrica) : videos),
    [videos, popularOnly],
  );

  const activeFacets = useMemo(() => {
    const list: Array<{ key: FacetKey; label: string; clear: () => void }> = [];
    if (search.genre) list.push({ key: "genre", label: `Genre: ${search.genre}`, clear: () => set("genre", "") });
    if (search.country)
      list.push({
        key: "country",
        label: `Country: ${COUNTRIES.find((c) => c.code === search.country)?.name ?? search.country}`,
        clear: () => set("country", ""),
      });
    if (search.year) list.push({ key: "year", label: `Year: ${search.year}`, clear: () => set("year", 0) });
    if (search.language)
      list.push({ key: "language", label: `Audio: ${search.language}`, clear: () => set("language", "") });
    if (search.subtitles)
      list.push({
        key: "subtitles",
        label: `Subtitles: ${search.subtitles.toUpperCase()}`,
        clear: () => set("subtitles", ""),
      });
    if (search.agasobanuye)
      list.push({ key: "agasobanuye", label: "Agasobanuye", clear: () => set("agasobanuye", false) });
    if (search.collection)
      list.push({
        key: "collection",
        label: COLLECTIONS.find((c) => c.value === search.collection)?.label ?? search.collection,
        clear: () => set("collection", ""),
      });
    if (search.quality)
      list.push({ key: "quality", label: `Quality: ${search.quality}`, clear: () => set("quality", "") });
    if (search.duration)
      list.push({
        key: "duration",
        label: DURATIONS.find((d) => d.value === search.duration)?.label ?? search.duration,
        clear: () => set("duration", ""),
      });
    if (search.actor.trim()) list.push({ key: "actor", label: `Actor: ${search.actor}`, clear: () => set("actor", "") });
    if (search.director.trim())
      list.push({ key: "director", label: `Director: ${search.director}`, clear: () => set("director", "") });
    if (search.rating)
      list.push({ key: "rating", label: `Rating ≥ ${search.rating.toFixed(1)}`, clear: () => set("rating", 0) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(search)]);


  return (
    <AppLayout>
      <div className="animate-fade-in space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <SearchIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {q ? <>Results for <span className="text-primary">"{q}"</span></> : "Advanced search"}
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border transition ${showFilters || hasFacets ? "border-primary text-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-elevated"}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </button>
            {q && (
              <button
                onClick={() => setPopularOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border transition ${popularOnly ? "text-primary-foreground border-transparent shadow-[var(--shadow-glow)]" : "border-border bg-surface hover:bg-surface-elevated"}`}
                style={popularOnly ? { background: "var(--gradient-brand)" } : undefined}
              >
                <Sparkles className="h-3.5 w-3.5" /> Popular Africa
              </button>
            )}
            {user && (
              <button
                onClick={() => setIncludeDrafts((v) => !v)}
                title="Include your private drafts in results"
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border transition ${includeDrafts ? "border-primary text-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-elevated"}`}
              >
                <EyeOff className="h-3.5 w-3.5" /> Include my drafts
              </button>
            )}
            {hasFacets && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border border-border bg-surface hover:bg-surface-elevated"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {(showFilters || hasFacets) && (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Refine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Actor</span>
                <input
                  className={fieldCls}
                  value={search.actor}
                  placeholder="e.g. Junior Giti"
                  onChange={(e) => set("actor", e.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Director</span>
                <input
                  className={fieldCls}
                  value={search.director}
                  placeholder="Director name"
                  onChange={(e) => set("director", e.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Genre</span>
                <select className={fieldCls} value={search.genre} onChange={(e) => set("genre", e.target.value)}>
                  <option value="">Any genre</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Country</span>
                <select className={fieldCls} value={search.country} onChange={(e) => set("country", e.target.value)}>
                  <option value="">Any country</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Year</span>
                <select
                  className={fieldCls}
                  value={String(search.year || "")}
                  onChange={(e) => set("year", Number(e.target.value) || 0)}
                >
                  <option value="">Any year</option>
                  {recentYears().map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Audio language</span>
                <select className={fieldCls} value={search.language} onChange={(e) => set("language", e.target.value)}>
                  <option value="">Any language</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Subtitles</span>
                <select className={fieldCls} value={search.subtitles} onChange={(e) => set("subtitles", e.target.value)}>
                  <option value="">Any subtitles</option>
                  {SUBTITLE_LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Quality</span>
                <select className={fieldCls} value={search.quality} onChange={(e) => set("quality", e.target.value)}>
                  <option value="">Any quality</option>
                  {QUALITIES.map((qy) => <option key={qy} value={qy}>{qy}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Duration</span>
                <select className={fieldCls} value={search.duration} onChange={(e) => set("duration", e.target.value)}>
                  <option value="">Any length</option>
                  {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Collection</span>
                <select className={fieldCls} value={search.collection} onChange={(e) => set("collection", e.target.value)}>
                  <option value="">All content</option>
                  {COLLECTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Min IMDb rating: {search.rating ? search.rating.toFixed(1) : "any"}
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={search.rating}
                  onChange={(e) => set("rating", Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Sort by</span>
                <select className={fieldCls} value={search.sort} onChange={(e) => set("sort", e.target.value)}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
            <button
              onClick={() => set("agasobanuye", !search.agasobanuye)}
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border transition ${search.agasobanuye ? "border-primary text-primary bg-primary/10" : "border-border bg-surface-elevated hover:bg-surface"}`}
            >
              Agasobanuye only
            </button>
          </section>
        )}

        {(q || hasFacets) && (
          <section className="space-y-3" aria-label="Active filters and result counts">
            <p className="text-sm text-muted-foreground">
              {countsLoading && !facetCounts ? (
                "Counting matches…"
              ) : (
                <>
                  <span className="font-bold text-foreground">{facetCounts?.total ?? shownVideos.length}</span>{" "}
                  total result{(facetCounts?.total ?? shownVideos.length) === 1 ? "" : "s"}
                  {activeFacets.length > 0 && " for the active filters"}
                </>
              )}
            </p>
            {activeFacets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFacets.map((f) => {
                  const n = facetCounts?.perFacet?.[f.key];
                  return (
                    <button
                      key={f.key}
                      onClick={f.clear}
                      title={`Remove filter — ${n ?? "?"} results match this facet alone`}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <span>{f.label}</span>
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                        {n === undefined ? "…" : n.toLocaleString()}
                      </span>
                      <X className="h-3 w-3 opacity-70" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}


        {!q && !hasFacets && (
          <p className="text-muted-foreground">Type in the search bar or open Filters to browse by genre, country, year, cast and more.</p>
        )}

        {loading && (
          <div className="py-10 flex justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        )}

        {!loading && (q || hasFacets) && creators.length === 0 && shownVideos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted-foreground">
            {popularOnly ? "No Popular Africa matches — try toggling off the filter." : "No matches found — try loosening your filters."}
          </div>
        )}

        {creators.length > 0 && (
          <section>
            <h2 className="font-bold mb-3">Creators</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {creators.map((c) => (
                <Link
                  key={c.id}
                  to="/c/$username"
                  params={{ username: c.username ?? "" }}
                  className="rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition flex items-center gap-3"
                >
                  <div
                    className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-primary/30"
                    style={c.avatar_url ? { backgroundImage: `url(${c.avatar_url})` } : { background: "var(--gradient-brand)" }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.display_name || c.username}</div>
                    {c.username && <div className="text-xs text-muted-foreground truncate">@{c.username}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {shownVideos.length > 0 && (
          <section>
            <h2 className="font-bold mb-3">
              Titles <span className="text-xs font-medium text-muted-foreground ml-1">· {shownVideos.length} result{shownVideos.length === 1 ? "" : "s"}{popularOnly && " · Popular Africa only"}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {shownVideos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>

            {/* Infinite-scroll sentinel + accessible fallback control */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
            {cursor && (
              <div className="flex justify-center py-8">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:bg-surface-elevated disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? "Loading more..." : "Load more results"}
                </button>
              </div>
            )}
            {!cursor && shownVideos.length > PAGE_SIZE && (
              <p className="py-8 text-center text-sm text-muted-foreground">End of results.</p>
            )}
          </section>
        )}

      </div>
    </AppLayout>
  );
}
