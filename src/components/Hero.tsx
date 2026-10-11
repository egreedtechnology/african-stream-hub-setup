import { Link } from "@tanstack/react-router";
import { Play, Info, Languages } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Video } from "@/data/videos";
import { cdnImage } from "@/lib/cdn-image";

export function Hero({ video }: { video: Video }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    ref.current?.play().catch(() => {});
  }, []);

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden rounded-3xl">
      <img
        src={cdnImage(video.thumbnail)}
        alt={video.title}
        width={1920}
        height={1080}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {video.previewSrc && (
        <video
          ref={ref}
          src={video.previewSrc}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster={cdnImage(video.thumbnail)}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      )}

      {/* Gradient layers */}
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14 max-w-3xl animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
            ◉ Featured
          </span>
          <span className="rounded-full bg-background/60 backdrop-blur-md border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
            {video.category} · {video.language}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-3">
          {video.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mb-2">
          By <span className="text-foreground font-semibold">{video.creator}</span> · {video.views} views
        </p>
        <p className="hidden sm:block text-base text-foreground/80 max-w-2xl mb-6 line-clamp-2">
          {video.description}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/watch/$videoId"
            params={{ videoId: video.id }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105 shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Play className="h-4 w-4 fill-current" /> Watch Now
          </Link>
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur-md px-5 py-3 text-sm font-semibold hover:bg-surface transition">
            <Info className="h-4 w-4" /> More Info
          </button>
          <button className="hidden sm:inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 backdrop-blur-md px-5 py-3 text-sm font-semibold text-secondary hover:bg-secondary/20 transition">
            <Languages className="h-4 w-4" /> Agasobanuye Mode
          </button>
        </div>
      </div>
    </section>
  );
}
