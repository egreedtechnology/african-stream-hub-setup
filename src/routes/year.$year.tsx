import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { fetchVideosByYear } from "@/lib/videos-api";

const BASE = "https://rebalive.egreedtech.org";

export const Route = createFileRoute("/year/$year")({
  head: ({ params }) => {
    const url = `${BASE}/year/${params.year}`;
    const desc = `The best movies and shows from ${params.year} — streaming on IBONA. Watch ${params.year} releases across all genres and languages.`;
    return {
      meta: [
        { title: `${params.year} Movies & Shows | IBONA` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: `${params.year} Releases | IBONA` },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: YearPage,
});

function YearPage() {
  const { year } = Route.useParams();
  const y = parseInt(year, 10);
  const [list, setList] = useState<Video[]>([]);
  useEffect(() => {
    if (!Number.isFinite(y)) return;
    fetchVideosByYear(y, 120).then(setList);
  }, [y]);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Release year</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{year}</h1>
      </header>
      {list.length === 0 ? (
        <p className="text-muted-foreground">No titles from {year} yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {list.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </AppLayout>
  );
}
