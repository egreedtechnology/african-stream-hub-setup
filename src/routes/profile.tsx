import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Settings as SettingsIcon, Upload as UploadIcon } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { useAuth } from "@/contexts/AuthContext";
import { fetchVideosByOwner } from "@/lib/videos-api";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/data/videos";

export const Route = createFileRoute("/profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: "/profile", mode: "login" } });
  },
  head: () => {
    const desc = "Your IBONA creator dashboard — manage uploaded videos, track views and likes, edit your creator profile, and upload new agasobanuye, film nyarwanda or music.";
    return {
      meta: [
        { title: "My profile — Creator dashboard | IBONA" },
        { name: "description", content: desc },
        { property: "og:title", content: "My IBONA creator profile" },
        { property: "og:description", content: desc },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchVideosByOwner(user.id).then((v) => {
      setVideos(v);
      setLoadingVideos(false);
    });
  }, [user]);

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="py-20 flex justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </AppLayout>
    );
  }

  const name = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Creator";
  const handle = profile?.username ? `@${profile.username}` : user.email;

  return (
    <AppLayout>
      <section className="relative overflow-hidden rounded-3xl mb-8" style={{ background: "var(--gradient-brand)" }}>
        <div className="p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-6 text-primary-foreground">
          <div
            className="h-24 w-24 rounded-full ring-4 ring-background bg-cover bg-center bg-background/30 backdrop-blur"
            style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}
          />
          <div className="text-center sm:text-left flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">Creator</div>
            <h1 className="text-3xl sm:text-4xl font-black">{name}</h1>
            <p className="opacity-90 mt-1">{handle} · {videos.length} {videos.length === 1 ? "upload" : "uploads"}</p>
            {profile?.bio && <p className="opacity-90 mt-2 max-w-xl">{profile.bio}</p>}
            <div className="mt-4 flex gap-2 justify-center sm:justify-start flex-wrap">
              <Link to="/settings" className="rounded-full bg-background text-foreground px-4 py-1.5 text-sm font-bold inline-flex items-center gap-1.5">
                <SettingsIcon className="h-4 w-4" /> Edit profile
              </Link>
              <Link to="/upload" className="rounded-full bg-background/20 backdrop-blur border border-background/40 px-4 py-1.5 text-sm font-bold inline-flex items-center gap-1.5">
                <UploadIcon className="h-4 w-4" /> Upload
              </Link>
              {profile?.username && (
                <Link
                  to="/c/$username"
                  params={{ username: profile.username }}
                  className="rounded-full bg-background/20 backdrop-blur border border-background/40 px-4 py-1.5 text-sm font-bold"
                >
                  View public page
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-xl font-bold mb-4">Your uploads</h2>
      {loadingVideos ? (
        <div className="py-10 flex justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading videos…
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted-foreground mb-4">You haven't uploaded anything yet.</p>
          <Link to="/upload" className="inline-flex rounded-full px-5 py-2 text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
            Upload your first video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </AppLayout>
  );
}
