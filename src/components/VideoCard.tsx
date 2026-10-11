import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, Play, Star } from "lucide-react";
import type { Video } from "@/data/videos";
import { useSettings } from "@/contexts/SettingsContext";
import { cdnImage } from "@/lib/cdn-image";

interface Props {
  video: Video;
  size?: "default" | "wide";
}

function isNew(v: Video): boolean {
  if (!v.createdAt) return false;
  const days = (Date.now() - new Date(v.createdAt).getTime()) / 86400_000;
  return days <= 7;
}

export function VideoCard({ video, size = "default" }: Props) {
  const { shouldReducePreviews } = useSettings();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLAnchorElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.6;
        setInView(visible);
        if (shouldReducePreviews) return;
        const v = vidRef.current;
        if (!v) return;
        if (visible) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldReducePreviews]);

  const onEnter = () => {
    setHovered(true);
    if (shouldReducePreviews) return;
    const v = vidRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };
  const onLeave = () => {
    setHovered(false);
    if (!inView || shouldReducePreviews) vidRef.current?.pause();
  };
  const showVideo = !shouldReducePreviews && (hovered || inView);
  const mountVideo = !shouldReducePreviews && !!video.previewSrc && inView;

  // Route target: prefer typed detail page when we have a slug + movieType
  const typedLink = (() => {
    if (!video.slug || !video.movieType) return null;
    const s = video.slug;
    switch (video.movieType) {
      case "movie": return { to: "/movie/$slug" as const, params: { slug: s } };
      case "series": return { to: "/series/$slug" as const, params: { slug: s } };
      case "tv": return { to: "/tv/$slug" as const, params: { slug: s } };
      case "anime": return { to: "/anime/$slug" as const, params: { slug: s } };
      case "drama": return { to: "/drama/$slug" as const, params: { slug: s } };
      case "documentary": return { to: "/documentary/$slug" as const, params: { slug: s } };
      default: return null;
    }
  })();
  const linkProps = typedLink ?? { to: "/watch/$videoId" as const, params: { videoId: video.id } };

  const quality = video.quality?.toUpperCase();
  const newBadge = isNew(video);

  return (
    <Link
      ref={containerRef}
      {...linkProps}
      className={`group block ${size === "wide" ? "w-[340px] sm:w-[380px]" : "w-full"} shrink-0`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface ring-1 ring-border transition-all duration-300 group-hover:ring-primary/60 group-hover:scale-[1.03] group-hover:shadow-[var(--shadow-elegant)]">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-surface-elevated" />}
        <img
          src={cdnImage(video.thumbnail)}
          alt={video.title}
          loading="lazy"
          decoding="async"
          width={1024}
          height={576}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${showVideo ? "opacity-0 scale-105" : "opacity-100"}`}
        />
        {mountVideo && (
          <video
            ref={vidRef}
            src={video.previewSrc}
            muted
            playsInline
            loop
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showVideo ? "opacity-100" : "opacity-0"}`}
          />
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-card)" }} />

        {/* Top-left badges: category + language + status */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%]">
          <span className="rounded-md bg-background/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
            {video.category}
          </span>
          {video.hasAgasobanuye && (
            <span className="rounded-md bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Agasobanuye
            </span>
          )}
          {newBadge && (
            <span className="rounded-md bg-red-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              New
            </span>
          )}
          {video.isTrending && (
            <span className="rounded-md bg-orange-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              🔥 Trending
            </span>
          )}
          {video.isEditorsChoice && (
            <span className="rounded-md bg-purple-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              ★ Editor's
            </span>
          )}
          {video.visibility === "private" && (
            <span className="rounded-md bg-background/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-400/40">
              Draft
            </span>
          )}
        </div>

        {/* Top-right: language + quality */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <span className="rounded-md px-2 py-0.5 text-[10px] font-bold text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
            {video.language}
          </span>
          {quality && (
            <span className="rounded-md bg-background/85 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-black tracking-wide text-foreground ring-1 ring-border">
              {quality}
            </span>
          )}
        </div>

        {/* Bottom-left: IMDb rating */}
        {typeof video.imdbRating === "number" && video.imdbRating > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-yellow-400/95 px-1.5 py-0.5 text-[11px] font-black text-black shadow-sm">
            <Star className="h-3 w-3 fill-current" />
            {video.imdbRating.toFixed(1)}
          </div>
        )}

        {/* Duration */}
        <div className="absolute bottom-3 right-3 rounded-md bg-background/80 backdrop-blur-md px-1.5 py-0.5 text-[11px] font-mono font-medium">
          {video.duration}
        </div>

        {/* Hover play button */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/95 shadow-[var(--shadow-glow)]">
            <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full ring-2 ring-border bg-cover bg-center" style={video.creatorAvatar ? { backgroundImage: `url(${video.creatorAvatar})` } : { background: "var(--gradient-brand)" }} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          {video.creatorUsername ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate({ to: "/c/$username", params: { username: video.creatorUsername! } });
              }}
              className="mt-1 block text-xs text-muted-foreground truncate hover:text-primary transition-colors text-left"
            >
              {video.creator}
            </button>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground truncate">{video.creator}</p>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{video.views} views</span>
            <span className="mx-1">•</span>
            <span>{video.uploadedAt}</span>
            {video.releaseYear && (
              <>
                <span className="mx-1">•</span>
                <span>{video.releaseYear}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
