import { useRef } from "react";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ContinueWatchingItem } from "@/lib/videos-api";
import { cdnImage } from "@/lib/cdn-image";

interface Props {
  items: ContinueWatchingItem[];
}

function parseDurationToSeconds(d: string): number {
  const [m, s] = d.split(":").map((n) => parseInt(n, 10) || 0);
  return m * 60 + s;
}

export function ContinueWatchingRail({ items }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  const scroll = (dir: "l" | "r") =>
    ref.current?.scrollBy({ left: dir === "l" ? -600 : 600, behavior: "smooth" });

  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-4 px-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          <span className="mr-2">▶️</span>Continue watching
        </h2>
        <div className="hidden md:flex gap-1">
          <button
            onClick={() => scroll("l")}
            className="h-9 w-9 rounded-full bg-surface hover:bg-surface-elevated flex items-center justify-center border border-border transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("r")}
            className="h-9 w-9 rounded-full bg-surface hover:bg-surface-elevated flex items-center justify-center border border-border transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2"
      >
        {items.map((v) => {
          const total = parseDurationToSeconds(v.duration);
          const pct = total > 0 ? Math.min(100, Math.max(2, (v.resumePosition / total) * 100)) : 5;
          return (
            <Link
              key={v.id}
              to="/watch/$videoId"
              params={{ videoId: v.id }}
              className="group relative shrink-0 w-[280px] sm:w-[320px] rounded-xl overflow-hidden bg-surface ring-1 ring-border hover:ring-primary/60 transition"
            >
              <div className="relative aspect-video bg-black">
                <img
                  src={cdnImage(v.thumbnail)}
                  alt={v.title}
                  loading="lazy"
                  className="h-full w-full object-cover group-hover:scale-[1.02] transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <PlayCircle className="absolute inset-0 m-auto h-12 w-12 text-white/95 opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm line-clamp-1">{v.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {v.creator} · {Math.round(pct)}% watched
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
