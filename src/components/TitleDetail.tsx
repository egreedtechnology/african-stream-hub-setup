import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Bookmark, Heart, Share2, Star, Calendar, Globe, Clock, Film, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { toast } from "sonner";
import type { Video } from "@/data/videos";
import { fetchRelatedVideos } from "@/lib/videos-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { genreSlug } from "@/lib/taxonomy";

interface Props {
  video: Video;
}

export function TitleDetail({ video }: Props) {
  const { user } = useAuth();
  const [related, setRelated] = useState<Video[]>([]);
  const [inList, setInList] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    fetchRelatedVideos(video, 12).then(setRelated);
  }, [video]);

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("video_id").eq("user_id", user.id).eq("video_id", video.id).maybeSingle()
      .then(({ data }) => setInList(!!data));
    supabase.from("bookmarks").select("video_id").eq("user_id", user.id).eq("video_id", video.id).maybeSingle()
      .then(({ data }) => setBookmarked(!!data));
  }, [user, video.id]);

  const toggleFav = async () => {
    if (!user) return toast.error("Sign in to save to your list");
    if (inList) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("video_id", video.id);
      setInList(false); toast.success("Removed from My List");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, video_id: video.id });
      setInList(true); toast.success("Added to My List");
    }
  };

  const toggleBookmark = async () => {
    if (!user) return toast.error("Sign in to bookmark");
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("video_id", video.id);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, video_id: video.id });
      setBookmarked(true); toast.success("Bookmarked");
    }
  };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  const backdrop = video.backdropUrl || video.thumbnail;
  const poster = video.posterUrl || video.thumbnail;

  return (
    <AppLayout>
      {/* Hero backdrop */}
      <div className="relative -mt-8 mb-8 h-[300px] sm:h-[440px] overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-cover bg-center scale-110 blur-[2px]" style={{ backgroundImage: `url(${backdrop})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="relative flex h-full items-end p-6 sm:p-10 gap-6">
          <img src={poster} alt={video.title} className="hidden sm:block h-56 w-40 rounded-xl object-cover shadow-2xl ring-1 ring-border/50" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              {video.movieType && (
                <span className="rounded-md bg-primary/20 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-primary ring-1 ring-primary/30">
                  {video.movieType}
                </span>
              )}
              {video.hasAgasobanuye && (
                <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Agasobanuye</span>
              )}
              {video.quality && (
                <span className="rounded-md bg-background/70 backdrop-blur-md px-2 py-0.5 text-[11px] font-black uppercase text-foreground ring-1 ring-border">
                  {video.quality}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight line-clamp-2">{video.title}</h1>
            {video.originalTitle && video.originalTitle !== video.title && (
              <p className="mt-1 text-sm text-muted-foreground italic">{video.originalTitle}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {typeof video.imdbRating === "number" && video.imdbRating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-0.5 text-xs font-black text-black">
                  <Star className="h-3 w-3 fill-current" /> IMDb {video.imdbRating.toFixed(1)}
                </span>
              )}
              {video.releaseYear && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{video.releaseYear}</span>}
              {video.duration && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{video.duration}</span>}
              {video.countryCode && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{video.countryCode.toUpperCase()}</span>}
              <span className="inline-flex items-center gap-1"><Film className="h-3.5 w-3.5" />{video.language}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/watch/$videoId"
                params={{ videoId: video.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:brightness-110 transition-all hover-scale"
              >
                <Play className="h-5 w-5 fill-current" /> Watch Now
              </Link>
              <button onClick={toggleFav} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition ${inList ? "bg-primary/20 border-primary text-primary" : "bg-background/50 border-border text-foreground hover:bg-background/80"}`}>
                <Heart className={`h-4 w-4 ${inList ? "fill-current" : ""}`} /> {inList ? "In My List" : "My List"}
              </button>
              <button onClick={toggleBookmark} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold backdrop-blur-md transition ${bookmarked ? "bg-primary/20 border-primary text-primary" : "bg-background/50 border-border text-foreground hover:bg-background/80"}`}>
                <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} /> {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 backdrop-blur-md px-4 py-2.5 text-sm font-semibold hover:bg-background/80 transition">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata + description grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] mb-12">
        <div>
          <h2 className="text-lg font-bold mb-2">Storyline</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
            {video.description || "No description available yet."}
          </p>

          {video.trailerUrl && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Trailer</h3>
              <div className="aspect-video overflow-hidden rounded-2xl ring-1 ring-border">
                <iframe src={video.trailerUrl} title={`${video.title} trailer`} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
              </div>
            </div>
          )}

          {video.cast && video.cast.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2 inline-flex items-center gap-2"><Users className="h-5 w-5" /> Cast</h3>
              <div className="flex flex-wrap gap-2">
                {video.cast.map((c) => (
                  <span key={c} className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium ring-1 ring-border">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3 text-sm">
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <dl className="space-y-2">
              {video.director && <MetaRow label="Director" value={video.director} />}
              {video.releaseYear && <MetaRow label="Year" value={String(video.releaseYear)} />}
              {video.countryCode && <MetaRow label="Country" value={video.countryCode.toUpperCase()} />}
              <MetaRow label="Language" value={video.language} />
              {video.quality && <MetaRow label="Quality" value={video.quality} />}
              {video.duration && <MetaRow label="Duration" value={video.duration} />}
              <MetaRow label="Category" value={video.category} />
              {video.movieType && <MetaRow label="Type" value={video.movieType} />}
            </dl>
          </div>
          {video.genres && video.genres.length > 0 && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Genres</div>
              <div className="flex flex-wrap gap-1.5">
                {video.genres.map((g) => (
                  <Link key={g} to="/genre/$genre" params={{ genre: genreSlug(g) }} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition">
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {video.tags && video.tags.length > 0 && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted-foreground">#{t}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mb-12">
          <h2 id="related-heading" className="text-xl sm:text-2xl font-bold tracking-tight mb-4">Related titles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {related.map((r) => <VideoCard key={r.id} video={r} />)}
          </div>
        </section>
      )}
    </AppLayout>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground truncate max-w-[60%] text-right">{value}</dd>
    </div>
  );
}
