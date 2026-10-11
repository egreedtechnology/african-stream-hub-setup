import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { fetchVideosByGenre } from "@/lib/videos-api";
import { genreFromSlug, genreSlug } from "@/lib/taxonomy";

const BASE = "https://rebalive.egreedtech.org";

export const Route = createFileRoute("/genre/$genre")({
  head: ({ params }) => {
    const g = genreFromSlug(params.genre) || params.genre;
    const url = `${BASE}/genre/${params.genre}`;
    const desc = `${g} on IBONA — stream the best ${g} movies and shows in Kinyarwanda, Swahili, English, and French. Agasobanuye, film nyarwanda, African and world cinema.`;
    return {
      meta: [
        { title: `${g} — Movies & Shows | IBONA` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: `${g} — Movies & Shows | IBONA` },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${g} on IBONA`,
          description: desc,
          url,
          isPartOf: { "@type": "WebSite", name: "IBONA", url: BASE },
        }),
      }],
    };
  },
  component: GenrePage,
});

function GenrePage() {
  const { genre } = Route.useParams();
  const label = genreFromSlug(genre) || genre;
  const [list, setList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchVideosByGenre(label, 120).then((v) => { if (!cancelled) { setList(v); setLoading(false); } });
    return () => { cancelled = true; };
  }, [label]);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Genre</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{label}</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Discover the best {label} titles on IBONA — curated across Africa and the world.</p>
      </header>
      {!loading && list.length === 0 ? (
        <p className="text-muted-foreground">No {label} titles uploaded yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {list.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </AppLayout>
  );
}

// re-export helpers for consumers importing this file (currently just the sitemap)
export { genreSlug };
