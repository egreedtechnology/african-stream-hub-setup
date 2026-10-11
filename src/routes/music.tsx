import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { fetchPublishedVideos } from "@/lib/videos-api";
import type { Video } from "@/data/videos";

const MUSIC_DESC = "Stream African music videos on IBONA — Afrobeats, gospel nyarwanda, hip hop, R&B, traditional and Amapiano from Rwandan and Pan-African artists in HD.";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music — Afrobeats, Gospel Nyarwanda & African Sound | IBONA" },
      { name: "description", content: MUSIC_DESC },
      { property: "og:title", content: "Music — Afrobeats, Gospel Nyarwanda & African Sound | IBONA" },
      { property: "og:description", content: MUSIC_DESC },
      { property: "og:url", content: "https://rebalive.egreedtech.org/music" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/music" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Music on IBONA",
        description: MUSIC_DESC,
        url: "https://rebalive.egreedtech.org/music",
        isPartOf: { "@type": "WebSite", name: "IBONA", url: "https://rebalive.egreedtech.org" },
      }),
    }],
  }),
  component: MusicPage,
});

function MusicPage() {
  const [list, setList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedVideos(200).then((all) => {
      if (cancelled) return;
      setList(all.filter((v) => v.category === "Music"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <AppLayout>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">🎵 Sound of Africa</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Music</h1>
      </header>
      {!loading && list.length === 0 ? (
        <p className="text-muted-foreground">No music uploads yet. Be the first to upload!</p>
      ) : (
        <section aria-labelledby="music-grid-heading">
          <h2 id="music-grid-heading" className="sr-only">All music videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
            {list.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
