import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Languages,
  X,
  Check,
  Volume2,
  VolumeX,
  Maximize2,
  Pause,
  Play,
  Send,
  Subtitles,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { getVideoById, type Language, type Video } from "@/data/videos";
import { fetchVideoById, fetchAllFeed, incrementVideoView, getLikeState, likeVideo, unlikeVideo } from "@/lib/videos-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { loadPrefs, savePrefs } from "@/lib/playback-prefs";
import { toast } from "sonner";
import { classifyVideoSource } from "@/lib/video-embed";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/watch/$videoId")({
  loader: ({ params }) => {
    // Initial loader returns mock if available; live data loaded client-side.
    const video = getVideoById(params.videoId);
    return { initialVideo: video ?? null, videoId: params.videoId };
  },
  head: ({ loaderData, params }) => {
    const v = loaderData?.initialVideo;
    const url = `https://rebalive.egreedtech.org/watch/${params.videoId}`;
    if (!v) {
      return { meta: [{ title: "Watch — IBONA" }], links: [{ rel: "canonical", href: url }] };
    }
    const kwList = [v.title, v.creator, v.category, v.language, "agasobanuye", "film nyarwanda", "amakuru", "IBONA", "Rebalive"]
      .filter(Boolean).join(", ");
    // Convert "mm:ss" or "hh:mm:ss" duration to ISO 8601 PTxxMxxS
    const toISODuration = (d?: string): string | undefined => {
      if (!d) return undefined;
      const parts = d.split(":").map((n) => parseInt(n, 10));
      if (parts.some(isNaN)) return undefined;
      let h = 0, m = 0, s = 0;
      if (parts.length === 3) [h, m, s] = parts;
      else if (parts.length === 2) [m, s] = parts;
      else [s] = parts;
      return `PT${h ? h + "H" : ""}${m ? m + "M" : ""}${s ? s + "S" : "0S"}`;
    };
    const viewsNum = parseInt(String(v.views ?? "0").replace(/[^\d]/g, ""), 10) || 0;
    const description = (v.description || `Watch ${v.title} by ${v.creator} on IBONA — agasobanuye, film nyarwanda and African content.`).slice(0, 300);
    return {
      meta: [
        { title: `${v.title} — IBONA` },
        { name: "description", content: description.slice(0, 160) },
        { name: "keywords", content: kwList },
        { property: "og:type", content: "video.other" },
        { property: "og:url", content: url },
        { property: "og:title", content: v.title },
        { property: "og:description", content: description.slice(0, 160) },
        { property: "og:image", content: v.thumbnail },
        { property: "og:video", content: v.previewSrc ?? "" },
        { property: "og:video:type", content: "video/mp4" },
        { property: "video:duration", content: String(toISODuration(v.duration) ?? "") },
        { name: "twitter:card", content: "player" },
        { name: "twitter:title", content: v.title },
        { name: "twitter:image", content: v.thumbnail },
        { name: "twitter:player", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: v.title,
            description,
            thumbnailUrl: [v.thumbnail],
            uploadDate: new Date().toISOString(),
            duration: toISODuration(v.duration),
            contentUrl: v.previewSrc,
            embedUrl: url,
            inLanguage: v.language,
            keywords: kwList,
            genre: v.category,
            isFamilyFriendly: true,
            publisher: {
              "@type": "Organization",
              name: "IBONA",
              url: "https://rebalive.egreedtech.org",
              logo: { "@type": "ImageObject", url: "https://rebalive.egreedtech.org/favicon.ico" },
            },
            author: { "@type": "Person", name: v.creator },
            interactionStatistic: {
              "@type": "InteractionCounter",
              interactionType: { "@type": "http://schema.org/WatchAction" },
              userInteractionCount: viewsNum,
            },
            potentialAction: {
              "@type": "SeekToAction",
              target: `${url}?t={seek_to_second_number}`,
              "startOffset-input": "required name=seek_to_second_number",
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "IBONA", item: "https://rebalive.egreedtech.org" },
              { "@type": "ListItem", position: 2, name: v.category, item: `https://rebalive.egreedtech.org/search?q=${encodeURIComponent(v.category)}` },
              { "@type": "ListItem", position: 3, name: v.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <AppLayout>
      <div className="py-20 text-center text-muted-foreground">{error.message}</div>
    </AppLayout>
  ),
  notFoundComponent: () => (
    <AppLayout>
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Video not found</h2>
        <Link to="/" className="text-primary underline">Back home</Link>
      </div>
    </AppLayout>
  ),
  component: WatchPage,
});

const ALL_LANGS: Language[] = ["Kinyarwanda", "Swahili", "English"];
// Fallback (mock) VTTs used only when no AI captions exist for a video.
const FALLBACK_VTT_BY_LANG: Record<Language, string> = {
  Kinyarwanda: "/subtitles/v1.rw.vtt",
  Swahili: "/subtitles/v1.sw.vtt",
  English: "/subtitles/v1.en.vtt",
};
const LANG_CODE: Record<Language, string> = {
  Kinyarwanda: "rw",
  Swahili: "sw",
  English: "en",
};
const CODE_TO_LANG: Record<string, Language> = { rw: "Kinyarwanda", sw: "Swahili", en: "English" };

interface DbCaption { language: string; vtt_url: string; is_default: boolean }

interface DbComment {
  id: string;
  user_id: string;
  video_id: string;
  body: string;
  created_at: string;
  edited: boolean;
  profiles?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function WatchPage() {
  const { initialVideo, videoId } = Route.useLoaderData();
  const { user, profile } = useAuth();
  const { shouldReducePreviews } = useSettings();

  const [video, setVideo] = useState<Video | null>(initialVideo);
  const [loadingVideo, setLoadingVideo] = useState(!initialVideo);
  const [suggestions, setSuggestions] = useState<Video[]>([]);

  // UI state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [language, setLanguage] = useState<Language>(initialVideo?.language ?? "Kinyarwanda");
  const [subsOn, setSubsOn] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showAgaPanel, setShowAgaPanel] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showMini, setShowMini] = useState(false);

  // Comments
  const [comments, setComments] = useState<DbComment[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const miniRef = useRef<HTMLVideoElement>(null);
  const restoredRef = useRef(false);
  const lastSavedRef = useRef(0);

  // ── Captions from DB ───────────────────────────────────────────────────────
  const [dbCaptions, setDbCaptions] = useState<DbCaption[]>([]);
  useEffect(() => {
    if (!isUuid(videoId)) { setDbCaptions([]); return; }
    let cancelled = false;
    supabase
      .from("video_captions")
      .select("language, vtt_url, is_default")
      .eq("video_id", videoId)
      .then(({ data }) => {
        if (!cancelled) setDbCaptions((data as DbCaption[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [videoId]);

  const captionByLang = useMemo(() => {
    const m: Record<Language, string> = { ...FALLBACK_VTT_BY_LANG };
    for (const c of dbCaptions) {
      const lang = CODE_TO_LANG[c.language];
      if (lang) m[lang] = c.vtt_url;
    }
    return m;
  }, [dbCaptions]);

  // ── Fetch real video + suggestions ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isUuid(videoId)) {
        const v = await fetchVideoById(videoId);
        if (!cancelled && v) {
          setVideo(v);
          setLanguage(v.language);
        } else if (!cancelled && !initialVideo) {
          throw notFound();
        }
      }
      if (!cancelled) setLoadingVideo(false);
      const all = await fetchAllFeed();
      if (!cancelled) setSuggestions(all.filter((v) => v.id !== videoId).slice(0, 6));
    })();
    incrementVideoView(videoId);
    return () => { cancelled = true; };
  }, [videoId, initialVideo]);

  // ── Like state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isUuid(videoId)) { setLiked(false); setLikeCount(0); return; }
    let cancelled = false;
    getLikeState(videoId, user?.id ?? null).then((s) => {
      if (cancelled) return;
      setLiked(s.liked);
      setLikeCount(s.count);
    });
    return () => { cancelled = true; };
  }, [videoId, user?.id]);

  const toggleLike = async () => {
    if (!isUuid(videoId)) return;
    if (!user) { toast.error("Sign in to like"); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) await likeVideo(videoId, user.id);
      else await unlikeVideo(videoId, user.id);
    } catch {
      // revert on failure
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error("Couldn't update like");
    }
  };

  // ── Restore prefs from localStorage ────────────────────────────────────────
  useEffect(() => {
    const prefs = loadPrefs(videoId);
    if (prefs.muted !== undefined) setMuted(prefs.muted);
    if (prefs.subtitlesOn !== undefined) setSubsOn(prefs.subtitlesOn);
    if (prefs.subtitleLang && (ALL_LANGS as string[]).includes(prefs.subtitleLang)) {
      setLanguage(prefs.subtitleLang as Language);
    }
  }, [videoId]);

  // ── Restore server-side progress when authed ───────────────────────────────
  useEffect(() => {
    if (!user || !isUuid(videoId)) return;
    supabase
      .from("video_progress")
      .select("position_seconds, muted, subtitle_lang")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (typeof data.muted === "boolean") setMuted(data.muted);
        if (data.subtitle_lang && (ALL_LANGS as string[]).includes(data.subtitle_lang)) {
          setLanguage(data.subtitle_lang as Language);
        }
        const v = videoRef.current;
        if (v && data.position_seconds && data.position_seconds > 1) {
          v.currentTime = data.position_seconds;
        }
      });
  }, [user, videoId]);

  // ── Apply muted to <video> ─────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    if (miniRef.current) miniRef.current.muted = muted;
  }, [muted]);

  // ── Switch active text track without reloading the video ──────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!subsOn) {
        t.mode = "disabled";
      } else {
        t.mode = t.language === LANG_CODE[language] ? "showing" : "disabled";
      }
    }
  }, [language, subsOn, video]);

  // ── Mini player on scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setShowMini(!e.isIntersecting), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [video]);

  // ── Restore position from localStorage once metadata is ready ─────────────
  const handleLoadedMeta = () => {
    if (restoredRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    const prefs = loadPrefs(videoId);
    if (prefs.position && prefs.position > 1 && prefs.position < (v.duration || Infinity) - 2) {
      v.currentTime = prefs.position;
    }
    restoredRef.current = true;
  };

  // ── Persist position (throttled), muted, subtitle lang ────────────────────
  const persistProgress = useCallback(
    (pos: number) => {
      savePrefs(videoId, { position: pos, muted, subtitlesOn: subsOn, subtitleLang: language });
      const now = Date.now();
      if (user && isUuid(videoId) && now - lastSavedRef.current > 5000) {
        lastSavedRef.current = now;
        supabase.from("video_progress").upsert(
          {
            user_id: user.id,
            video_id: videoId,
            position_seconds: pos,
            muted,
            subtitle_lang: subsOn ? language : null,
          },
          { onConflict: "user_id,video_id" }
        ).then(() => {});
      }
    },
    [user, videoId, muted, subsOn, language]
  );

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    persistProgress(v.currentTime);
  };

  // Save prefs immediately when language/mute/subs change
  useEffect(() => {
    savePrefs(videoId, { muted, subtitlesOn: subsOn, subtitleLang: language });
  }, [videoId, muted, subsOn, language]);

  // ── Comments: fetch + realtime ─────────────────────────────────────────────
  const loadComments = useCallback(async () => {
    if (!isUuid(videoId)) {
      setComments([]);
      return;
    }
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, video_id, body, created_at, edited, profiles!comments_user_profile_fk(display_name, username, avatar_url)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });
    setComments((data as unknown as DbComment[]) ?? []);
  }, [videoId]);

  useEffect(() => {
    loadComments();
    if (!isUuid(videoId)) return;
    const ch = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` },
        () => loadComments()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [videoId, loadComments]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    if (!isUuid(videoId)) {
      toast.error("Comments are only available on uploaded videos");
      return;
    }
    setPosting(true);
    const body = draft.trim().slice(0, 1000); // basic length cap
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      video_id: videoId,
      body,
    });
    setPosting(false);
    if (error) {
      toast.error("Couldn't post comment");
      return;
    }
    setDraft("");
    loadComments();
  };

  const startEdit = (c: DbComment) => {
    setEditingId(c.id);
    setEditDraft(c.body);
  };

  const saveEdit = async (id: string) => {
    const body = editDraft.trim().slice(0, 1000);
    if (!body) return;
    const { error } = await supabase.from("comments").update({ body }).eq("id", id);
    if (error) {
      toast.error("Couldn't save edit");
      return;
    }
    setEditingId(null);
    setEditDraft("");
    loadComments();
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    loadComments();
  };

  const isOwnComment = (c: DbComment) => user?.id === c.user_id;
  const isVideoOwner = useMemo(() => {
    // Best-effort moderation flag — owner can delete others' comments via RLS.
    return false;
  }, []);

  // ── Player controls ────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const toggleMini = () => {
    const v = miniRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
    setPlaying(!v.paused);
  };
  const toggleMute = () => setMuted((m) => !m);

  const handleShare = async () => {
    const url = `${window.location.origin}/watch/${videoId}`;
    const shareData = { title: video?.title ?? "IBONA", text: video?.description ?? "", url };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't share — copy this URL: " + url);
    }
  };

  if (loadingVideo) {
    return (
      <AppLayout>
        <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading video…
        </div>
      </AppLayout>
    );
  }
  if (!video) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">Video not found</h2>
          <Link to="/" className="text-primary underline">Back home</Link>
        </div>
      </AppLayout>
    );
  }

  const preload = shouldReducePreviews ? "metadata" : "auto";
  const isAudio = video.mediaType === "audio";
  const source = classifyVideoSource(video.previewSrc);
  const isIframe = source.kind === "iframe";
  const isUnsupported = source.kind === "unsupported";

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-fade-in">
        <div className="min-w-0">
          {/* Player */}
          <div
            ref={playerRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-border shadow-[var(--shadow-elegant)] group"
          >
            {isAudio && (
              <>
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="absolute inset-0 h-full w-full object-cover blur-xl opacity-60"
                  aria-hidden
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 pointer-events-none">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-44 w-44 sm:h-56 sm:w-56 rounded-2xl object-cover ring-1 ring-white/20 shadow-[var(--shadow-elegant)]"
                  />
                  <div className="text-center text-white">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Audio track</div>
                    <div className="font-bold text-lg sm:text-xl line-clamp-1">{video.title}</div>
                    <div className="text-sm opacity-80">{video.creator}</div>
                  </div>
                </div>
              </>
            )}
            {!isAudio && isIframe && (
              <iframe
                src={source.src}
                title={video.title}
                className="absolute inset-0 h-full w-full"
                allow={source.allow ?? "autoplay; encrypted-media; fullscreen"}
                allowFullScreen
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            )}
            {!isAudio && isUnsupported && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/60 backdrop-blur-sm">
                <img src={video.thumbnail} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 -z-10" />
                <div className="text-white">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Hosted on {source.provider}</div>
                  <div className="font-bold text-lg mb-1 line-clamp-2">{video.title}</div>
                  <p className="text-sm opacity-80 max-w-md">
                    This video is hosted externally and can't be played inline on IBONA.
                  </p>
                </div>
                <a
                  href={source.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:scale-105 transition"
                >
                  <ExternalLink className="h-4 w-4" /> Open on {source.provider}
                </a>
              </div>
            )}
            {!isIframe && !isUnsupported && (
              <video
                ref={videoRef}
                src={source.kind === "html5" ? source.src : video.previewSrc}
                poster={video.thumbnail}
                autoPlay={!shouldReducePreviews}
                loop
                playsInline
                preload={preload}
                crossOrigin="anonymous"
                className={`h-full w-full ${isAudio ? "opacity-0" : "object-cover"}`}
                onClick={togglePlay}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onLoadedMetadata={handleLoadedMeta}
                onTimeUpdate={handleTimeUpdate}
                onVolumeChange={(e) => setMuted((e.target as HTMLVideoElement).muted)}
                onError={() => toast.error("Couldn't load this video source.")}
              >
                {!isAudio && ALL_LANGS.map((l) => (
                  <track
                    key={l}
                    kind="subtitles"
                    src={captionByLang[l]}
                    srcLang={LANG_CODE[l]}
                    label={l}
                    default={l === language && subsOn}
                  />
                ))}
              </video>
            )}

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              <ActionPill icon={Heart} label={likeCount > 0 ? String(likeCount) : "Like"} active={liked} onClick={toggleLike} />
              <ActionPill icon={MessageCircle} label="Comments" active={showComments} onClick={() => setShowComments((p) => !p)} />
              <ActionPill icon={Share2} label="Share" onClick={handleShare} />
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={togglePlay}
                className="h-10 w-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center hover:scale-105 transition"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </button>
              <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-1/3" style={{ background: "var(--gradient-brand)" }} />
              </div>

              {/* Subtitles On/Off + language switcher */}
              <button
                onClick={() => setSubsOn((p) => !p)}
                title={subsOn ? "Subtitles on — click to turn off" : "Subtitles off — click to turn on"}
                aria-pressed={subsOn}
                aria-label={subsOn ? "Turn subtitles off" : "Turn subtitles on"}
                className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold backdrop-blur transition ${
                  subsOn ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Subtitles className="h-4 w-4" />
                <span>CC {subsOn ? "On" : "Off"}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSubMenu((p) => !p)}
                  className="h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur transition"
                  aria-label="Choose subtitle language"
                  aria-haspopup="menu"
                  aria-expanded={showSubMenu}
                >
                  <Languages className="h-4 w-4" />
                  <span className="hidden sm:inline">{LANG_CODE[language].toUpperCase()}</span>
                </button>
                {showSubMenu && (
                  <div
                    className="absolute bottom-12 right-0 w-64 rounded-xl border border-border bg-surface/95 backdrop-blur-xl p-2 shadow-[var(--shadow-elegant)] animate-scale-in z-10"
                    onMouseLeave={() => setShowSubMenu(false)}
                  >
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Subtitle language
                    </div>
                    {ALL_LANGS.map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLanguage(l);
                          setSubsOn(true);
                          setShowSubMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          language === l && subsOn ? "bg-primary/15 text-primary" : "hover:bg-surface-elevated"
                        }`}
                      >
                        <span className="font-semibold">{l}</span>
                        {language === l && subsOn && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                    <div className="mt-1 border-t border-border pt-1">
                      <button
                        onClick={() => { setSubsOn(false); setShowSubMenu(false); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                      >
                        <span className="font-semibold">Turn subtitles off</span>
                        {!subsOn && <Check className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={toggleMute}
                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => videoRef.current?.requestFullscreen?.()}
                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Comments overlay panel */}
            {showComments && (
              <div className="absolute inset-y-0 right-0 w-full sm:w-[360px] bg-background/95 backdrop-blur-xl border-l border-border flex flex-col animate-slide-in-right z-20">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-primary">Live</div>
                    <div className="font-bold">{comments.length} comments</div>
                  </div>
                  <button
                    onClick={() => setShowComments(false)}
                    className="h-8 w-8 rounded-full bg-surface flex items-center justify-center hover:bg-surface-elevated"
                    aria-label="Close comments"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {comments.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      {isUuid(videoId) ? "Be the first to comment." : "Comments are available on uploaded videos."}
                    </div>
                  )}
                  {comments.map((c) => {
                    const name = c.profiles?.display_name || c.profiles?.username || "User";
                    const own = isOwnComment(c);
                    const editing = editingId === c.id;
                    return (
                      <div key={c.id} className="flex gap-3 group/comment">
                        <div
                          className="h-8 w-8 shrink-0 rounded-full ring-2 ring-border bg-cover bg-center"
                          style={
                            c.profiles?.avatar_url
                              ? { backgroundImage: `url(${c.profiles.avatar_url})` }
                              : { background: "var(--gradient-brand)" }
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {relTime(c.created_at)}{c.edited ? " • edited" : ""}
                            </span>
                          </div>
                          {editing ? (
                            <div className="mt-1 flex flex-col gap-1.5">
                              <textarea
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                rows={2}
                                className="w-full rounded-md bg-surface border border-border px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(c.id)}
                                  className="rounded-full px-3 py-1 text-xs font-bold text-primary-foreground"
                                  style={{ background: "var(--gradient-brand)" }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditingId(null); setEditDraft(""); }}
                                  className="rounded-full px-3 py-1 text-xs font-semibold border border-border hover:bg-surface-elevated"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground/90 break-words">{c.body}</p>
                          )}
                          {(own || isVideoOwner) && !editing && (
                            <div className="mt-1 flex gap-2 opacity-0 group-hover/comment:opacity-100 transition">
                              {own && (
                                <button
                                  onClick={() => startEdit(c)}
                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => deleteComment(c.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {user ? (
                  <form onSubmit={submitComment} className="p-3 border-t border-border flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={isUuid(videoId) ? `Comment as ${profile?.display_name || profile?.username || "you"}…` : "Comments only on uploaded videos"}
                      maxLength={1000}
                      disabled={!isUuid(videoId) || posting}
                      className="flex-1 rounded-full bg-surface border border-border px-4 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      className="h-10 w-10 rounded-full text-primary-foreground flex items-center justify-center disabled:opacity-50"
                      style={{ background: "var(--gradient-brand)" }}
                      disabled={!draft.trim() || posting || !isUuid(videoId)}
                      aria-label="Post comment"
                    >
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                ) : (
                  <div className="p-3 border-t border-border text-center text-sm">
                    <Link
                      to="/auth"
                      search={{ redirect: `/watch/${videoId}`, mode: "login" }}
                      className="font-bold text-primary hover:underline"
                    >
                      Sign in to comment
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div className="mt-5">
            <div className="flex flex-wrap gap-2 mb-3">
              <Tag>{video.category}</Tag>
              <Tag>{language}</Tag>
              <Tag>{video.views} views</Tag>
              <Tag>{video.uploadedAt}</Tag>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{video.title}</h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full ring-2 ring-primary/40 bg-cover bg-center"
                  style={
                    video.creatorAvatar
                      ? { backgroundImage: `url(${video.creatorAvatar})` }
                      : { background: "var(--gradient-brand)" }
                  }
                />
                <div>
                  <div className="font-semibold">{video.creator}</div>
                  <div className="text-xs text-muted-foreground">Creator</div>
                </div>
                <button
                  className="ml-2 rounded-full px-4 py-2 text-sm font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Subscribe
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleLike}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${liked ? "border-accent text-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-elevated"}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {liked ? "Liked" : "Like"} {likeCount > 0 && <span className="tabular-nums opacity-80">{likeCount}</span>}
                </button>
                <button
                  onClick={() => setShowComments(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-surface-elevated px-4 py-2 text-sm font-semibold transition"
                >
                  <MessageCircle className="h-4 w-4" /> Comment
                </button>
                <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-surface-elevated px-4 py-2 text-sm font-semibold transition">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAgaPanel(true)}
              className="mt-5 group relative w-full overflow-hidden rounded-2xl border border-secondary/40 p-5 text-left transition hover:border-secondary"
              style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 165 / 0.15), oklch(0.78 0.16 60 / 0.1))" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-secondary-foreground"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Languages className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">★ IBONA Signature</div>
                  <div className="text-lg font-bold">Watch in Kinyarwanda</div>
                  <p className="text-sm text-muted-foreground">
                    Switch language &amp; subtitles. Built for African storytelling.
                  </p>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-background/60 px-3 py-1.5 text-xs font-semibold border border-border">
                  Open
                </span>
              </div>
            </button>

            <div className="mt-5 rounded-2xl bg-surface border border-border p-4">
              <p className="text-sm text-foreground/90 whitespace-pre-line">{video.description}</p>
            </div>
          </div>

          <div className="lg:hidden mt-8">
            <h3 className="font-bold mb-4">Up next</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {suggestions.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <h3 className="font-bold mb-4">Up next</h3>
          <div className="space-y-4">
            {suggestions.map((v) => (
              <Link
                key={v.id}
                to="/watch/$videoId"
                params={{ videoId: v.id }}
                className="group flex gap-3"
              >
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-border group-hover:ring-primary/50 transition">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1 text-[10px] font-mono">
                    {v.duration}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition">
                    {v.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{v.creator}</div>
                  <div className="text-[11px] text-muted-foreground">{v.views} views</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {/* Floating mini player */}
      {showMini && !isIframe && !isUnsupported && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-40 w-72 animate-scale-in rounded-xl overflow-hidden ring-1 ring-border shadow-[var(--shadow-elegant)] bg-black">
          <div className="relative aspect-video group">
            <video
              ref={miniRef}
              src={video.previewSrc}
              poster={video.thumbnail}
              autoPlay={!shouldReducePreviews}
              loop
              muted
              playsInline
              preload={preload}
              className="h-full w-full object-cover"
              onClick={toggleMini}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <button
                onClick={toggleMini}
                className="h-11 w-11 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center hover:scale-110 transition"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
              </button>
            </div>
            <button
              onClick={() => setShowMini(false)}
              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
              aria-label="Close mini player"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-2.5 bg-surface flex items-center gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold line-clamp-1">{video.title}</div>
              <div className="text-[10px] text-muted-foreground">{video.creator}</div>
            </div>
          </div>
        </div>
      )}

      {/* Agasobanuye language panel */}
      {showAgaPanel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAgaPanel(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-surface p-6 animate-scale-in"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary">Agasobanuye Mode</div>
                <h3 className="text-xl font-bold mt-0.5">Choose your language</h3>
              </div>
              <button
                onClick={() => setShowAgaPanel(false)}
                className="h-8 w-8 rounded-full bg-background flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {ALL_LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLanguage(l);
                    setSubsOn(true);
                    setShowAgaPanel(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${language === l ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-surface-elevated"}`}
                >
                  <div>
                    <div className="font-semibold">{l}</div>
                    <div className="text-xs text-muted-foreground">
                      {l === "Kinyarwanda" ? "Ubusobanuro bwuzuye" : l === "Swahili" ? "Tafsiri kamili" : "Full subtitles"}
                    </div>
                  </div>
                  {language === l && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 cursor-pointer">
              <span className="text-sm font-semibold">Show subtitles</span>
              <input
                type="checkbox"
                checked={subsOn}
                onChange={(e) => setSubsOn(e.target.checked)}
                className="h-5 w-5 accent-[oklch(0.78_0.16_60)]"
              />
            </label>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function ActionPill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`pointer-events-auto h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-md transition hover:scale-110 ${active ? "bg-accent text-accent-foreground" : "bg-black/40 text-white hover:bg-black/60"}`}
    >
      <Icon className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
