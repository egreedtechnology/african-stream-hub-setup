import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { fetchVideosByCountry } from "@/lib/videos-api";
import { COUNTRIES } from "@/lib/taxonomy";

const BASE = "https://rebalive.egreedtech.org";

export const Route = createFileRoute("/country/$country")({
  head: ({ params }) => {
    const c = COUNTRIES.find((x) => x.code === params.country.toLowerCase());
    const label = c?.name || params.country.toUpperCase();
    const url = `${BASE}/country/${params.country}`;
    const desc = `Movies and shows from ${label} — stream ${label}n cinema, drama, documentaries, and music on IBONA. Watch in original languages with subtitles.`;
    return {
      meta: [
        { title: `${label} Movies & Shows | IBONA` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: `${label} Movies & Shows | IBONA` },
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
          name: `${label} on IBONA`,
          description: desc,
          url,
        }),
      }],
    };
  },
  component: CountryPage,
});

function CountryPage() {
  const { country } = Route.useParams();
  const label = COUNTRIES.find((x) => x.code === country.toLowerCase())?.name || country.toUpperCase();
  const [list, setList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchVideosByCountry(country.toLowerCase(), 120).then((v) => { if (!cancelled) { setList(v); setLoading(false); } });
    return () => { cancelled = true; };
  }, [country]);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Country</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{label}</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Movies, series, and documentaries from {label} — streaming on IBONA.</p>
      </header>
      {!loading && list.length === 0 ? (
        <p className="text-muted-foreground">No titles from {label} uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {list.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </AppLayout>
  );
}
