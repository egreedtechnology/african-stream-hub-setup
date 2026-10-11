import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard } from "./VideoCard";
import type { Video } from "@/data/videos";

interface Props {
  title: string;
  emoji?: string;
  videos: Video[];
}

export function VideoRail({ title, emoji, videos }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => {
    ref.current?.scrollBy({ left: dir === "l" ? -600 : 600, behavior: "smooth" });
  };

  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-4 px-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h2>
        <div className="hidden md:flex gap-1">
          <button onClick={() => scroll("l")} className="h-9 w-9 rounded-full bg-surface hover:bg-surface-elevated flex items-center justify-center border border-border transition" aria-label="Scroll left">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll("r")} className="h-9 w-9 rounded-full bg-surface hover:bg-surface-elevated flex items-center justify-center border border-border transition" aria-label="Scroll right">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} size="wide" />
        ))}
      </div>
    </section>
  );
}
