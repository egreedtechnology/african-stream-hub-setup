import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Film, UserPlus, UserCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { VideoCard } from "@/components/VideoCard";
import { fetchProfileByUsername, fetchVideosByOwner, getFollowState, followCreator, unfollowCreator, type CreatorProfile } from "@/lib/videos-api";
import { findMockCreator } from "@/data/videos";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Video } from "@/data/videos";

interface CreatorLoaderVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  ai_thumbnail_url: string | null;
  description: string | null;
  created_at: string | null;
  views: number | null;
  language: string | null;
}
interface CreatorLoaderProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

async function loadCreatorForHead(username: string): Promise<{ profile: CreatorLoaderProfile | null; videos: CreatorLoaderVideo[] }> {
  const base = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL;
  const key = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return { profile: null, videos: [] };
  try {
    const pRes = await fetch(
      `${base}/rest/v1/profiles?select=id,username,display_name,avatar_url,bio&username=eq.${encodeURIComponent(username)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const pRows = pRes.ok ? ((await pRes.json()) as CreatorLoaderProfile[]) : [];
    const profile = pRows[0] ?? null;
    if (!profile) return { profile: null, videos: [] };
    const vRes = await fetch(
      `${base}/rest/v1/videos?select=id,title,thumbnail_url,ai_thumbnail_url,description,created_at,views,language&owner_id=eq.${profile.id}&visibility=eq.public&status=eq.ready&order=created_at.desc&limit=24`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const videos = vRes.ok ? ((await vRes.json()) as CreatorLoaderVideo[]) : [];
    return { profile, videos };
  } catch {
    return { profile: null, videos: [] };
  }
}

export const Route = createFileRoute("/c/$username")({
  loader: ({ params }) => loadCreatorForHead(params.username),
  head: ({ params, loaderData }) => {
    const url = `https://rebalive.egreedtech.org/c/${params.username}`;
    const profile = loaderData?.profile;
    const videos = loaderData?.videos ?? [];
    const name = profile?.display_name || `@${params.username}`;
    const title = `${name} — Creator on IBONA`;
    const desc = (profile?.bio ||
      `Watch ${videos.length || ""} videos from ${name} on IBONA — African-first streaming for agasobanuye, film nyarwanda, music and shorts.`).slice(0, 300);
    const img = profile?.avatar_url || undefined;

    const person = {
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      alternateName: params.username,
      url,
      ...(img ? { image: img } : {}),
      ...(profile?.bio ? { description: profile.bio } : {}),
      mainEntityOfPage: url,
    };

    const profilePage = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      name: title,
      description: desc,
      mainEntity: person,
      isPartOf: { "@type": "WebSite", name: "IBONA", url: "https://rebalive.egreedtech.org" },
    };

    const itemList = videos.length
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Videos by ${name}`,
          numberOfItems: videos.length,
          itemListElement: videos.slice(0, 24).map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "VideoObject",
              name: v.title,
              description: (v.description || v.title).slice(0, 300),
              thumbnailUrl: [v.ai_thumbnail_url || v.thumbnail_url].filter(Boolean),
              uploadDate: v.created_at || new Date().toISOString(),
              contentUrl: `https://rebalive.egreedtech.org/watch/${v.id}`,
              embedUrl: `https://rebalive.egreedtech.org/watch/${v.id}`,
              inLanguage: v.language || "rw",
              author: person,
              publisher: {
                "@type": "Organization",
                name: "IBONA",
                url: "https://rebalive.egreedtech.org",
              },
              interactionStatistic: {
                "@type": "InteractionCounter",
                interactionType: { "@type": "http://schema.org/WatchAction" },
                userInteractionCount: v.views || 0,
              },
            },
          })),
        }
      : null;

    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "IBONA", item: "https://rebalive.egreedtech.org" },
        { "@type": "ListItem", position: 2, name: "Creators", item: "https://rebalive.egreedtech.org/search?q=creator" },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { property: "profile:username", content: params.username },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc.slice(0, 160) },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(profilePage) },
        ...(itemList ? [{ type: "application/ld+json", children: JSON.stringify(itemList) }] : []),
        { type: "application/ld+json", children: JSON.stringify(breadcrumbs) },
      ],
    };
  },
  component: CreatorPage,
});

function CreatorPage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const p = await fetchProfileByUsername(username);
      if (cancelled) return;
      if (!p) {
        // Fallback: seeded mock creator from the Popular Africa catalog
        const mock = findMockCreator(username);
        if (mock) {
          setProfile({
            id: `mock:${mock.username}`,
            username: mock.username,
            display_name: mock.display_name,
            avatar_url: null,
            banner_url: null,
            bio: `Featured creator on IBONA — ${mock.videos.length} popular African ${mock.videos.length === 1 ? "video" : "videos"}.`,
          });
          setVideos(mock.videos);
          setFollowing(false);
          setFollowers(0);
          setLoading(false);
          return;
        }
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(p);
      const [vids, state] = await Promise.all([
        fetchVideosByOwner(p.id),
        getFollowState(p.id, user?.id ?? null),
      ]);
      if (!cancelled) {
        setVideos(vids);
        setFollowing(state.following);
        setFollowers(state.followers);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username, user?.id]);

  const isOwnProfile = !!user && !!profile && user.id === profile.id;
  const isMockProfile = !!profile && profile.id.startsWith("mock:");

  const toggleFollow = async () => {
    if (!profile) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/c/${username}`, mode: "login" } });
      return;
    }
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowCreator(profile.id, user.id);
        setFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      } else {
        await followCreator(profile.id, user.id);
        setFollowing(true);
        setFollowers((n) => n + 1);
        toast.success(`Following ${profile.display_name || profile.username}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update follow");
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading creator…
        </div>
      </AppLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">Creator not found</h2>
          <p className="text-muted-foreground mb-4">No account exists for @{username}.</p>
          <Link to="/" className="text-primary font-semibold hover:underline">Back home</Link>
        </div>
      </AppLayout>
    );
  }

  const display = profile.display_name || profile.username || "Creator";
  

  return (
    <AppLayout>
      <section
        className="relative overflow-hidden rounded-3xl mb-8"
        style={{ background: profile.banner_url ? `url(${profile.banner_url}) center/cover` : "var(--gradient-brand)" }}
      >
        <div className="bg-black/30 p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-6 text-primary-foreground">
          <div
            className="h-24 w-24 rounded-full ring-4 ring-background bg-cover bg-center shrink-0"
            style={
              profile.avatar_url
                ? { backgroundImage: `url(${profile.avatar_url})` }
                : { background: "var(--gradient-brand)" }
            }
          />
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">Creator</div>
            <h1 className="text-3xl sm:text-4xl font-black truncate">{display}</h1>
            {profile.username && (
              <p className="opacity-90 mt-1">
                @{profile.username} · {followers.toLocaleString()} {followers === 1 ? "follower" : "followers"} · {videos.length} {videos.length === 1 ? "video" : "videos"}
              </p>
            )}
            {profile.bio && <p className="mt-2 opacity-95 max-w-xl">{profile.bio}</p>}
          </div>
          {!isOwnProfile && !isMockProfile && (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                following
                  ? "bg-background/90 text-foreground hover:bg-background"
                  : "bg-primary-foreground text-primary hover:scale-105"
              }`}
            >
              {followBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : following ? (
                <><UserCheck className="h-4 w-4" /> Following</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Follow</>
              )}
            </button>
          )}
        </div>
      </section>

      <h2 className="text-xl font-bold mb-4 px-1">Videos</h2>
      {videos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-3">
            <Film className="h-6 w-6" />
          </div>
          <div className="font-semibold">No videos yet</div>
          <p className="text-sm text-muted-foreground mt-1">This creator hasn't published any videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </AppLayout>
  );
}
