import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { fetchPublishedVideos } from "@/lib/videos-api";
import type { Video } from "@/data/videos";

const MOVIES_DESC = "Stream premium African cinema on IBONA — full-length film nyarwanda, agasobanuye, drama, documentaries and short films from Rwanda and across the continent.";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movies — Film Nyarwanda & African Cinema | IBONA" },
      { name: "description", content: MOVIES_DESC },
      { property: "og:title", content: "Movies — Film Nyarwanda & African Cinema | IBONA" },
      { property: "og:description", content: MOVIES_DESC },
      { property: "og:url", content: "https://rebalive.egreedtech.org/movies" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/movies" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Movies on IBONA",
        description: MOVIES_DESC,
        url: "https://rebalive.egreedtech.org/movies",
        isPartOf: { "@type": "WebSite", name: "IBONA", url: "https://rebalive.egreedtech.org" },
      }),
    }],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const [list, setList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedVideos(200).then((all) => {
      if (cancelled) return;
      setList(all.filter((v) => v.category === "Films"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">🎬 Cinema</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Movies</h1>
      </header>
      {!loading && list.length === 0 ? (
        <p className="text-muted-foreground">No films uploaded yet.</p>
      ) : (
        <section aria-labelledby="movies-grid-heading">
          <h2 id="movies-grid-heading" className="sr-only">All movies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
            {list.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
