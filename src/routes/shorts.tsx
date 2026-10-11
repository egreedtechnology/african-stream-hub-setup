import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Share2, Music2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Video } from "@/data/videos";
import { fetchPublishedVideos } from "@/lib/videos-api";
import { MobileBottomNav } from "@/components/Sidebar";
import { IbonaLogo } from "@/components/IbonaLogo";

const SHORTS_DESC = "Endless vertical shorts from African creators on IBONA — quick agasobanuye clips, comedy, news shorts, music moments and dance in a snackable feed built for mobile.";

export const Route = createFileRoute("/shorts")({
  head: () => ({
    meta: [
      { title: "Shorts — Vertical African Videos | IBONA" },
      { name: "description", content: SHORTS_DESC },
      { property: "og:title", content: "Shorts — Vertical African Videos | IBONA" },
      { property: "og:description", content: SHORTS_DESC },
      { property: "og:url", content: "https://rebalive.egreedtech.org/shorts" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://rebalive.egreedtech.org/shorts" }],
  }),
  component: ShortsPage,
});

function ShortsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedVideos(100).then((v) => { if (!cancelled) setVideos(v); });
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <h1 className="sr-only">Shorts — vertical videos from African creators on IBONA</h1>
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <Link to="/"><IbonaLogo /></Link>
        <div className="text-sm font-bold uppercase tracking-widest text-primary" aria-hidden="true">Shorts</div>
      </header>
      {videos.length === 0 ? (
        <div className="h-screen flex items-center justify-center text-white/60">No shorts uploaded yet.</div>
      ) : (
        <div className="snap-y snap-mandatory h-screen overflow-y-scroll scrollbar-none">
          {videos.map((v) => <Short key={v.id} video={v} />)}
        </div>
      )}
      <MobileBottomNav />
    </div>
  );
}

function Short({ video }: { video: Video }) {
  const [liked, setLiked] = useState(false);
  return (
    <section className="snap-start relative h-screen w-full flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-black">
        <video src={video.previewSrc} poster={video.thumbnail} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

        {/* Right action rail */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
          <ShortAction icon={Heart} label="12.4K" active={liked} onClick={() => setLiked((p) => !p)} />
          <ShortAction icon={MessageCircle} label="892" />
          <ShortAction icon={Share2} label="Share" />
          <div className="h-10 w-10 rounded-lg ring-2 ring-white animate-spin-slow" style={{ background: "var(--gradient-brand)", animationDuration: "6s" }}>
            <Music2 className="h-full w-full p-2 text-white" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-24 left-4 right-20">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-full ring-2 ring-white/40" style={{ background: "var(--gradient-brand)" }} />
            <span className="font-bold">@{video.creator.toLowerCase().replace(/\s/g, "")}</span>
            <button className="ml-1 rounded-full border border-white/60 px-3 py-0.5 text-xs font-bold">Follow</button>
          </div>
          <p className="text-sm font-medium line-clamp-2">{video.title}</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase">{video.language}</span>
            <span className="rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase">{video.category}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShortAction({ icon: Icon, label, active, onClick }: { icon: typeof Heart; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className={`h-12 w-12 rounded-full backdrop-blur flex items-center justify-center transition active:scale-90 ${active ? "bg-accent" : "bg-white/15 hover:bg-white/25"}`}>
        <Icon className={`h-6 w-6 ${active ? "fill-current" : ""}`} />
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
