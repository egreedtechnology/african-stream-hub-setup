import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { fetchTrendingVideos, fetchTrendingComputedAt } from "@/lib/videos-api";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/data/videos";

const TRENDING_DESC = "See what Africa is watching right now on IBONA — the most-viewed agasobanuye, film nyarwanda, music, comedy and news shorts trending across the continent this week.";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — Most-Watched African Videos | IBONA" },
      { name: "description", content: TRENDING_DESC },
      { property: "og:title", content: "Trending — Most-Watched African Videos | IBONA" },
      { property: "og:description", content: TRENDING_DESC },
      { property: "og:url", content: "https://rebalive.egreedtech.org/trending" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/trending" }],
  }),
  component: TrendingPage,
});

function relTime(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h === 1 ? "1 hour ago" : `${h} hours ago`;
}

function TrendingPage() {
  const [list, setList] = useState<Video[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [videos, at] = await Promise.all([fetchTrendingVideos(60), fetchTrendingComputedAt()]);
    setList(videos);
    setUpdatedAt(at);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => { if (!cancelled) load(); };
    run();
    const timer = setInterval(run, 5 * 60 * 1000);
    const ch = supabase
      .channel("trending-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "trending_scores" }, run)
      .subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">🔥 Hot right now</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Trending</h1>
        <p className="text-muted-foreground mt-2">
          Ranked by views, likes and comments from the last 48 hours.
          {updatedAt && <span className="ml-1">Updated {relTime(updatedAt)}.</span>}
        </p>
      </header>
      {!loading && list.length === 0 ? (
        <p className="text-muted-foreground">No videos uploaded yet.</p>
      ) : (
        <section aria-labelledby="trending-grid-heading">
          <h2 id="trending-grid-heading" className="sr-only">Trending videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
            {list.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
