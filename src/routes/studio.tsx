import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { notifySitemapUpdated } from "@/lib/sitemap.functions";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { Upload as UploadIcon, Eye, Heart, Trash2, Edit3, Loader2, Film, X, Check, BarChart3, Users, MessageCircle, Sparkles, RefreshCw, Copy, Languages, FileText, Image as ImageIcon, Star } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { transcribeVideo, generateVideoMetadata, generateThumbnails, selectThumbnail, getAiStatus } from "@/lib/ai.functions";
import { importDaddymFilms } from "@/lib/import-daddym.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/studio")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: "/studio", mode: "login" } });
  },
  head: () => ({
    meta: [
      { title: "Creator Studio — IBONA" },
      { name: "description", content: "Manage your uploaded videos, edit details, and track performance." },
    ],
  }),
  component: StudioPage,
});

interface Row {
  id: string;
  title: string;
  description: string | null;
  language: "Kinyarwanda" | "Swahili" | "English";
  category: "Music" | "Comedy" | "Films" | "Agasobanuye";
  visibility: "public" | "unlisted" | "private";
  status: string;
  thumbnail_url: string | null;
  ai_thumbnail_url: string | null;
  thumbnail_generation_status: string;
  video_url: string;
  media_type: "video" | "audio";
  views: number;
  likes: number;
  duration_seconds: number | null;
  created_at: string;
}

function StudioPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [aiVideoId, setAiVideoId] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const navigate = useNavigate();

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("id, title, description, language, category, visibility, status, thumbnail_url, ai_thumbnail_url, thumbnail_generation_status, video_url, media_type, views, likes, duration_seconds, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) || []);
    const ids = (data || []).map((r) => r.id);
    if (ids.length) {
      const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).in("video_id", ids);
      setCommentCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const onUpdate = () => refresh();
    if (typeof window !== "undefined") window.addEventListener("ibona:video-updated", onUpdate);
    const ch = supabase
      .channel(`studio-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "videos", filter: `owner_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("ibona:video-updated", onUpdate);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [user?.id]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Video deleted");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const totalViews = rows.reduce((a, r) => a + (r.views || 0), 0);
  const totalLikes = rows.reduce((a, r) => a + (r.likes || 0), 0);

  const [backfilling, setBackfilling] = useState<{ done: number; total: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const runImport = useServerFn(importDaddymFilms);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user?.id]);

  const importDaddym = async (dryRun: boolean) => {
    if (!dryRun && !confirm("Import all Daddy M Films into IBONA? You confirmed you own or license this content.")) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await runImport({ data: { dryRun } });
      const msg = dryRun
        ? `Dry run: ${res.totalFound} found, ${res.toImport} would import, ${res.skipped} already imported.`
        : `Imported ${res.imported} of ${res.totalFound} (${res.skipped} already existed).`;
      setImportResult(msg);
      toast.success(msg);
      if (!dryRun) refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      setImportResult(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const backfillThumbnails = async () => {
    if (!user) return;
    const targets = rows.filter((r) => r.media_type === "video" && r.thumbnail_generation_status !== "done");
    if (targets.length === 0) { toast.info("All videos already have AI thumbnails."); return; }
    if (!confirm(`Generate AI thumbnails for ${targets.length} video(s)? This will run in your browser and may take a few minutes.`)) return;
    setBackfilling({ done: 0, total: targets.length });
    const { extractCandidateFrames, uploadFramesForRanking } = await import("@/lib/thumbnail-extractor");
    const { generateThumbnails } = await import("@/lib/ai.functions");
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const v = targets[i];
      try {
        const frames = await extractCandidateFrames(v.video_url, { samples: 14, top: 6 });
        if (frames.length === 0) throw new Error("No frames");
        const uploaded = await uploadFramesForRanking({ supabase, ownerId: user.id, videoId: v.id, frames });
        if (uploaded.length === 0) throw new Error("Upload failed");
        await generateThumbnails({ data: { videoId: v.id, frames: uploaded } });
        ok++;
      } catch { fail++; }
      setBackfilling({ done: i + 1, total: targets.length });
    }
    setBackfilling(null);
    toast.success(`AI thumbnails: ${ok} done, ${fail} failed`);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ibona:video-updated"));
    refresh();
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Creator Studio</div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{profile?.display_name || "Welcome"}</h1>
            <p className="text-muted-foreground mt-1">Manage your videos, edit metadata, and track performance.</p>
          </div>
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-brand)" }}>
            <UploadIcon className="h-4 w-4" /> Upload new
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat icon={Film} label="Videos" value={rows.length} />
          <Stat icon={Eye} label="Total views" value={totalViews} />
          <Stat icon={Heart} label="Total likes" value={totalLikes} />
          <Stat icon={MessageCircle} label="Comments" value={commentCount} />
        </div>

        {isAdmin && (
          <div className="mb-6 rounded-3xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Admin · Bulk import</div>
                <h2 className="text-lg font-bold">Import Daddy M Films catalog</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Pulls all 441 films from daddymfilms.com (Sanity CMS) into IBONA. Only run if you own or license this content — imported films are added under your account.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => importDaddym(true)}
                  disabled={importing}
                  className="rounded-full px-4 py-2 text-xs font-bold bg-surface-elevated hover:bg-surface border border-border disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Dry run"}
                </button>
                <button
                  onClick={() => importDaddym(false)}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                  {importing ? "Importing…" : "Import all"}
                </button>
              </div>
            </div>
            {importResult && (
              <div className="mt-3 text-xs text-muted-foreground rounded-lg bg-surface-elevated/70 px-3 py-2">{importResult}</div>
            )}
          </div>
        )}

        <div className="rounded-3xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Your videos</div>
            <div className="flex items-center gap-3">
              <button
                onClick={backfillThumbnails}
                disabled={!!backfilling}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50"
                title="Generate AI thumbnails for every video that doesn't have one"
              >
                {backfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {backfilling ? `Generating ${backfilling.done}/${backfilling.total}` : "Generate AI thumbnails for all"}
              </button>
              <div className="text-xs text-muted-foreground">{rows.length} total</div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3"><Film className="h-6 w-6" /></div>
              <div className="font-bold mb-1">No videos yet</div>
              <p className="text-sm text-muted-foreground mb-4">Upload your first video to get started.</p>
              <Link to="/upload" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
                <UploadIcon className="h-4 w-4" /> Upload video
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="p-4 flex flex-wrap sm:flex-nowrap items-center gap-4 hover:bg-surface-elevated/50 transition">
                  <div
                    className="h-16 w-28 shrink-0 rounded-lg bg-cover bg-center bg-surface-elevated"
                    style={r.thumbnail_url ? { backgroundImage: `url(${r.thumbnail_url})` } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate({ to: "/watch/$videoId", params: { videoId: r.id } })} className="font-semibold text-left hover:text-primary transition truncate block w-full">
                      {r.title}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      <span className="rounded bg-primary/15 text-primary px-2 py-0.5">{r.category}</span>
                      <span className="rounded bg-secondary/15 text-secondary px-2 py-0.5">{r.language}</span>
                      <span className="rounded bg-surface-elevated text-muted-foreground px-2 py-0.5">{r.visibility}</span>
                    </div>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <Metric label="Views" value={r.views} />
                    <Metric label="Likes" value={r.likes} />
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => setAiVideoId(r.id)} title="AI assistant" className="h-9 w-9 rounded-full bg-surface-elevated hover:bg-primary/20 flex items-center justify-center transition" aria-label="AI"><Sparkles className="h-4 w-4 text-primary" /></button>
                    <button onClick={() => setEditing(r)} className="h-9 w-9 rounded-full bg-surface-elevated hover:bg-primary/20 flex items-center justify-center transition" aria-label="Edit"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(r.id)} className="h-9 w-9 rounded-full bg-surface-elevated hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card icon={Users} title="Audience" desc="Follower analytics coming soon." />
          <Card icon={BarChart3} title="Earnings" desc="Monetization opens at 1K subscribers." />
        </div>
      </div>

      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {aiVideoId && user && (() => {
        const row = rows.find((r) => r.id === aiVideoId);
        return row ? (
          <AiAssistantModal
            videoId={aiVideoId}
            ownerId={user.id}
            videoUrl={row.video_url}
            mediaType={row.media_type}
            currentThumb={row.thumbnail_url}
            aiThumb={row.ai_thumbnail_url}
            onClose={() => setAiVideoId(null)}
            onApply={() => refresh()}
          />
        ) : null;
      })()}
    </AppLayout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="text-2xl font-black tabular-nums">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="text-center"><div className="font-bold tabular-nums">{value.toLocaleString()}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}
function Card({ icon: Icon, title, desc }: { icon: typeof Eye; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="h-9 w-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center mb-2"><Icon className="h-4 w-4" /></div>
      <div className="font-semibold">{title}</div>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

const LANGUAGES = ["Kinyarwanda", "Swahili", "English"] as const;
const CATEGORIES = ["Music", "Comedy", "Films", "Agasobanuye"] as const;
const VISIBILITIES = ["public", "unlisted", "private"] as const;

function EditModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description || "");
  const [language, setLanguage] = useState<typeof LANGUAGES[number]>(row.language);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>(row.category);
  const [visibility, setVisibility] = useState<typeof VISIBILITIES[number]>(row.visibility);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("videos").update({ title: title.trim(), description, language, category, visibility }).eq("id", row.id);
    if (!error && visibility === "public") void notifySitemapUpdated().catch(() => {});
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-border bg-popover p-6 shadow-[var(--shadow-elegant)] animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Edit video</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-surface flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none" />
          <div className="grid grid-cols-3 gap-2 text-xs">
            <select value={language} onChange={(e) => setLanguage(e.target.value as typeof LANGUAGES[number])} className="rounded-xl bg-surface border border-border px-3 py-2.5">{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className="rounded-xl bg-surface border border-border px-3 py-2.5">{CATEGORIES.map((l) => <option key={l}>{l}</option>)}</select>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as typeof VISIBILITIES[number])} className="rounded-xl bg-surface border border-border px-3 py-2.5">{VISIBILITIES.map((l) => <option key={l}>{l}</option>)}</select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border bg-surface hover:bg-surface-elevated px-5 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-brand)" }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface AiJob { kind: string; status: string; error: string | null; updated_at: string }
interface AiMeta {
  seo_title: string | null; seo_description: string | null;
  summary_short: string | null; summary_long: string | null;
  key_takeaways: string[] | null; tags: string[] | null; hashtags: string[] | null;
  category_suggested: string | null; topic: string | null; audience: string | null;
  social_posts: { x?: string; facebook?: string; linkedin?: string } | null;
  detected_language: string | null;
}
interface AiCap { language: string; vtt_url: string; is_default: boolean }
interface AiThumb { id: string; url: string; source: 'frame' | 'ai' | 'custom'; selected: boolean; score?: number; reason?: string | null; timestamp_seconds?: number | null; created_at: string }

function AiAssistantModal({ videoId, ownerId, videoUrl, mediaType, currentThumb, aiThumb, onClose, onApply }: { videoId: string; ownerId: string; videoUrl: string; mediaType: "video" | "audio"; currentThumb: string | null; aiThumb: string | null; onClose: () => void; onApply: () => void }) {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [meta, setMeta] = useState<AiMeta | null>(null);
  const [captions, setCaptions] = useState<AiCap[]>([]);
  const [thumbs, setThumbs] = useState<AiThumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"captions" | "metadata" | "thumbnails" | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      const r = await getAiStatus({ data: { videoId } });
      setJobs(r.jobs as AiJob[]);
      setMeta((r.metadata as AiMeta | null) ?? null);
      setCaptions((r.captions as AiCap[]) ?? []);
      setThumbs(((r as unknown as { thumbnails?: AiThumb[] }).thumbnails) ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const runCaptions = async () => {
    setBusy("captions");
    try {
      const r = await transcribeVideo({ data: { videoId } });
      if ((r as { ok: boolean }).ok) toast.success("Captions generated");
      else toast.error("Caption generation failed", { description: (r as { error?: string }).error });
    } catch (e) { toast.error("Caption generation failed", { description: (e as Error).message }); }
    setBusy(null); load();
  };
  const runMetadata = async () => {
    setBusy("metadata");
    try {
      const r = await generateVideoMetadata({ data: { videoId } });
      if ((r as { ok: boolean }).ok) toast.success("AI metadata ready");
      else toast.error("Metadata generation failed", { description: (r as { error?: string }).error });
    } catch (e) { toast.error("Metadata generation failed", { description: (e as Error).message }); }
    setBusy(null); load();
  };
  const [extractProgress, setExtractProgress] = useState<{ done: number; total: number } | null>(null);
  const runThumbs = async () => {
    if (mediaType !== "video") { toast.error("AI thumbnails only work for video uploads."); return; }
    setBusy("thumbnails");
    setExtractProgress({ done: 0, total: 1 });
    try {
      const { extractCandidateFrames, uploadFramesForRanking } = await import("@/lib/thumbnail-extractor");
      toast.info("Analyzing video for candidate frames…");
      const frames = await extractCandidateFrames(videoUrl, {
        samples: 16, top: 6,
        onProgress: (done, total) => setExtractProgress({ done, total }),
      });
      if (frames.length === 0) throw new Error("Could not read any frames from the video.");
      const uploaded = await uploadFramesForRanking({ supabase, ownerId, videoId, frames });
      if (uploaded.length === 0) throw new Error("Frame upload failed.");
      const r = await generateThumbnails({ data: { videoId, frames: uploaded } });
      if ((r as { ok: boolean }).ok) toast.success("AI ranked and selected the best thumbnail");
      else toast.error("Ranking failed", { description: (r as { error?: string }).error });
    } catch (e) { toast.error("Thumbnail generation failed", { description: (e as Error).message }); }
    setBusy(null); setExtractProgress(null); load();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ibona:video-updated"));
  };
  const pickThumb = async (url: string) => {
    try {
      await selectThumbnail({ data: { videoId, url } });
      toast.success("Thumbnail set");
      load();
      onApply();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("ibona:video-updated"));
    } catch (e) { toast.error("Could not set thumbnail", { description: (e as Error).message }); }
  };
  const uploadCustom = async (file: File) => {
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${ownerId}/${videoId}/custom-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("thumbnails").upload(path, file, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("thumbnails").getPublicUrl(path);
      await supabase.from("thumbnail_candidates").update({ selected: false }).eq("video_id", videoId);
      await supabase.from("thumbnail_candidates").insert({
        video_id: videoId, owner_id: ownerId, url: pub.publicUrl, source: "custom", position: 99, selected: true,
      });
      await supabase.from("videos").update({ thumbnail_url: pub.publicUrl }).eq("id", videoId);
      toast.success("Custom thumbnail uploaded");
      load(); onApply();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("ibona:video-updated"));
    } catch (e) { toast.error("Upload failed", { description: (e as Error).message }); }
  };

  const applyMetadata = async () => {
    if (!meta?.seo_title) return;
    const { error } = await supabase.from("videos").update({
      title: meta.seo_title,
      description: meta.seo_description ?? meta.summary_long ?? "",
    }).eq("id", videoId);
    if (error) { toast.error(error.message); return; }
    toast.success("Applied AI title & description");
    onApply();
  };
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  const jobStatus = (kind: string) => jobs.find((j) => j.kind === kind);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-popover p-6 shadow-[var(--shadow-elegant)] animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h3 className="text-xl font-bold">AI Assistant</h3></div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-surface flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        {loading ? <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
          <div className="space-y-5">
            {/* Thumbnails */}
            <section className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold"><ImageIcon className="h-4 w-4 text-primary" /> Thumbnails</div>
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCustom(f); e.target.value = ""; }} />
                  <button onClick={() => fileRef.current?.click()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border border-border bg-background hover:bg-surface-elevated disabled:opacity-50">
                    <UploadIcon className="h-3.5 w-3.5" /> Upload custom
                  </button>
                  <button onClick={runThumbs} disabled={busy !== null || mediaType !== "video"} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50">
                    {busy === "thumbnails" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {thumbs.length ? "Regenerate AI thumbnails" : "Generate AI thumbnail"}
                  </button>
                </div>
              </div>
              <JobBadge job={jobStatus("thumbnails")} />
              {busy === "thumbnails" && extractProgress && (
                <div className="mt-2 text-xs text-muted-foreground">Sampling frames {extractProgress.done}/{extractProgress.total}…</div>
              )}
              {mediaType !== "video" && (
                <p className="text-xs text-muted-foreground mt-1">AI thumbnails are generated from video frames. Audio tracks only support custom uploads.</p>
              )}

              {/* Original vs AI comparison */}
              {(currentThumb || aiThumb) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-surface-elevated">Current</div>
                    <div className="aspect-video bg-surface-elevated flex items-center justify-center">
                      {currentThumb ? <img src={currentThumb} alt="Current thumbnail" className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/40 overflow-hidden">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-primary/15 text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI pick</div>
                    <div className="aspect-video bg-surface-elevated flex items-center justify-center">
                      {aiThumb ? <img src={aiThumb} alt="AI best thumbnail" className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">Not generated yet</span>}
                    </div>
                  </div>
                </div>
              )}

              {thumbs.length > 0 ? (
                <>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All candidates — click to select</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {thumbs.map((t) => (
                      <button key={t.id} onClick={() => pickThumb(t.url)} className={`relative aspect-video overflow-hidden rounded-xl border-2 transition ${t.selected ? "border-primary shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/60"}`} title={t.reason || undefined}>
                        <img src={t.url} alt="" className="w-full h-full object-cover" />
                        {t.selected && (
                          <div className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5" /> SELECTED
                          </div>
                        )}
                        {typeof t.score === "number" && t.source !== "custom" && (
                          <div className="absolute top-1 left-1 rounded-full bg-background/80 text-foreground px-1.5 py-0.5 text-[9px] font-bold">
                            {(t.score * 100).toFixed(0)}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 truncate">{t.source}{t.reason ? ` · ${t.reason}` : ""}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : <p className="text-xs text-muted-foreground mt-2">No AI thumbnails yet. Click "Generate AI thumbnail" — we'll sample frames from the video, score them for faces, sharpness, emotion, and composition, then pick the best.</p>}
            </section>


            <section className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold"><Languages className="h-4 w-4 text-primary" /> Captions</div>
                <button onClick={runCaptions} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50">
                  {busy === "captions" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {captions.length ? "Regenerate" : "Generate"}
                </button>
              </div>
              <JobBadge job={jobStatus("captions")} />
              {captions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {captions.map((c) => (
                    <a key={c.language} href={c.vtt_url} target="_blank" rel="noreferrer" className="text-[11px] rounded-full bg-surface-elevated px-2.5 py-1 hover:bg-primary/15 hover:text-primary">
                      {c.language.toUpperCase()}{c.is_default ? " ★" : ""}
                    </a>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground mt-1">No captions yet. Generate to add Kinyarwanda + English + French + Swahili subtitles.</p>}
            </section>

            {/* Metadata */}
            <section className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-primary" /> SEO & Metadata</div>
                <button onClick={runMetadata} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50">
                  {busy === "metadata" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {meta?.seo_title ? "Regenerate" : "Generate"}
                </button>
              </div>
              <JobBadge job={jobStatus("metadata")} />
              {meta?.seo_title ? (
                <div className="mt-3 space-y-3 text-sm">
                  <Field label="Suggested title" value={meta.seo_title} onCopy={() => copy(meta.seo_title!)} />
                  <Field label="Suggested description" value={meta.seo_description ?? ""} multiline onCopy={() => meta.seo_description && copy(meta.seo_description)} />
                  {meta.summary_short && <Field label="Short summary" value={meta.summary_short} multiline />}
                  {meta.summary_long && <Field label="Detailed summary" value={meta.summary_long} multiline />}
                  {meta.key_takeaways && meta.key_takeaways.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Key takeaways</div>
                      <ul className="list-disc list-inside text-xs space-y-0.5">{meta.key_takeaways.map((k, i) => <li key={i}>{k}</li>)}</ul>
                    </div>
                  )}
                  {meta.tags && meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meta.tags.map((t) => <span key={t} className="text-[11px] rounded-full bg-surface-elevated px-2 py-0.5">{t}</span>)}
                    </div>
                  )}
                  {meta.hashtags && meta.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {meta.hashtags.map((t) => <span key={t} className="text-[11px] rounded-full bg-primary/15 text-primary px-2 py-0.5">{t}</span>)}
                    </div>
                  )}
                  {meta.social_posts && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Social posts</div>
                      {meta.social_posts.x && <Field label="X / Twitter" value={meta.social_posts.x} multiline onCopy={() => copy(meta.social_posts!.x!)} />}
                      {meta.social_posts.facebook && <Field label="Facebook" value={meta.social_posts.facebook} multiline onCopy={() => copy(meta.social_posts!.facebook!)} />}
                      {meta.social_posts.linkedin && <Field label="LinkedIn" value={meta.social_posts.linkedin} multiline onCopy={() => copy(meta.social_posts!.linkedin!)} />}
                    </div>
                  )}
                  <button onClick={applyMetadata} className="w-full rounded-full px-4 py-2 text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
                    Apply AI title & description to video
                  </button>
                </div>
              ) : <p className="text-xs text-muted-foreground mt-1">No metadata yet. Generate to get an SEO title, description, tags, hashtags, summaries, and social posts.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function JobBadge({ job }: { job: AiJob | undefined }) {
  if (!job) return null;
  const cls = job.status === "done" ? "bg-emerald-500/15 text-emerald-500"
    : job.status === "running" ? "bg-primary/15 text-primary"
    : job.status === "failed" ? "bg-destructive/15 text-destructive"
    : "bg-surface-elevated text-muted-foreground";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {job.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {job.status}{job.error ? ` · ${job.error.slice(0, 60)}` : ""}
    </div>
  );
}

function Field({ label, value, multiline, onCopy }: { label: string; value: string; multiline?: boolean; onCopy?: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</div>
        {onCopy && <button onClick={onCopy} className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</button>}
      </div>
      {multiline
        ? <p className="rounded-lg bg-surface border border-border px-3 py-2 text-xs whitespace-pre-wrap">{value}</p>
        : <p className="rounded-lg bg-surface border border-border px-3 py-2 text-xs">{value}</p>}
    </div>
  );
}
