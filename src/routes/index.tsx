import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Hero } from "@/components/Hero";
import { VideoRail } from "@/components/VideoRail";
import { VideoCard } from "@/components/VideoCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ContinueWatchingRail } from "@/components/ContinueWatchingRail";
import { isPopularAfrica, type Video } from "@/data/videos";
import { fetchPrioritizedFeed, fetchContinueWatching, fetchVideoById, fetchTopRatedVideos, fetchTrendingVideos, type ContinueWatchingItem } from "@/lib/videos-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { forYouFeed } from "@/lib/recommend.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IBONA — Agasobanuye, Film Nyarwanda & African Music Streaming" },
      { name: "description", content: "IBONA is the #1 African-first streaming platform for agasobanuye, film nyarwanda, amakuru, news shorts, comedy and African music in Kinyarwanda, Swahili and English." },
      { property: "og:title", content: "IBONA — African-First Video Streaming" },
      { property: "og:description", content: "Premium African video streaming. Music, film nyarwanda, agasobanuye, comedy and news shorts — free to stream." },
      { property: "og:url", content: "https://rebalive.egreedtech.org/" },
    ],
    links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/" }],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const [category, setCategory] = useState("All");
  const [feed, setFeed] = useState<Video[]>([]);
  const [continueItems, setContinueItems] = useState<ContinueWatchingItem[]>([]);
  const [forYou, setForYou] = useState<Video[]>([]);
  const [topRated, setTopRated] = useState<Video[]>([]);
  const [trendingNow, setTrendingNow] = useState<Video[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchPrioritizedFeed(user?.id ?? null).then((list) => {
      if (!cancelled) setFeed(list);
    });
    load();
    const ch = supabase
      .channel("videos-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "videos" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "videos" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => load())
      .subscribe();
    const onLocalUpdate = () => load();
    if (typeof window !== "undefined") window.addEventListener("ibona:video-updated", onLocalUpdate);
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
      if (typeof window !== "undefined") window.removeEventListener("ibona:video-updated", onLocalUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setContinueItems([]); setForYou([]); return; }
    let cancelled = false;
    fetchContinueWatching(user.id).then((items) => { if (!cancelled) setContinueItems(items); });
    // AI "For You" — recommendations driven by watch history, language, country, category
    forYouFeed({ data: { limit: 18 } })
      .then(async (r: { ok?: boolean; ids?: string[] }) => {
        if (cancelled || !r?.ok || !r.ids?.length) return;
        const items = (await Promise.all(r.ids.map((id) => fetchVideoById(id)))).filter(Boolean) as Video[];
        if (!cancelled) setForYou(items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    fetchTopRatedVideos(12).then((v) => { if (!cancelled) setTopRated(v); });

    // Trending is recomputed on a schedule in the backend; keep the rail in sync
    // by refetching periodically and whenever the ranking table changes.
    const loadTrending = () => fetchTrendingVideos(12).then((v) => { if (!cancelled) setTrendingNow(v); });
    loadTrending();
    const timer = setInterval(loadTrending, 5 * 60 * 1000);
    const ch = supabase
      .channel("trending-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "trending_scores" }, () => loadTrending())
      .subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") loadTrending(); };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(ch);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const featured = feed[0];
  const recentlyAdded = useMemo(() => feed.slice(0, 12), [feed]);
  const slides = useMemo(() => feed.slice(0, 6), [feed]);
  const filtered = useMemo(() => {
    if (category === "All") return feed;
    if (category === "Popular Africa") return feed.filter(isPopularAfrica);
    return feed.filter((v) => v.category === category);
  }, [feed, category]);

  return (
    <AppLayout>
      <div className="space-y-10 animate-fade-in">
        {featured && <Hero video={featured} />}

        <FeaturedSlider slides={slides} />

        {continueItems.length > 0 && <ContinueWatchingRail items={continueItems} />}

        {forYou.length > 0 && <VideoRail title="For you" emoji="✨" videos={forYou} />}

        {trendingNow.length > 0 && <VideoRail title="Trending now" emoji="🔥" videos={trendingNow} />}

        <VideoRail title="Recently added" emoji="🆕" videos={recentlyAdded} />

        {topRated.length > 0 && <VideoRail title="Top rated" emoji="⭐" videos={topRated} />}

        <section>
          <div className="flex items-end justify-between mb-4 px-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Browse by category</h2>
          </div>
          <CategoryFilter active={category} onChange={setCategory} />
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 px-1">{category === "All" ? "Latest on IBONA" : category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function FeaturedSlider({ slides }: { slides: Video[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const go = (n: number) => setIdx((n + count) % count);

  return (
    <section
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-3xl border border-border bg-surface"
    >
      <div className="relative h-[260px] sm:h-[360px]">
        {slides.map((s, i) => (
          <Link
            key={s.id}
            to="/watch/$videoId"
            params={{ videoId: s.id }}
            aria-hidden={i !== idx}
            tabIndex={i === idx ? 0 : -1}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${s.thumbnail})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">Featured · {s.category}</div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight line-clamp-2 max-w-3xl">{s.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-2xl">{s.creator} · {s.views} views</p>
            </div>
          </Link>
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={(e) => { e.preventDefault(); go(idx - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/70 backdrop-blur border border-border flex items-center justify-center hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={(e) => { e.preventDefault(); go(idx + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/70 backdrop-blur border border-border flex items-center justify-center hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setIdx(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-foreground/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
