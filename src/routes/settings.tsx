import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Upload, LogOut } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: "/settings", mode: "login" } });
  },
  head: () => ({
    meta: [
      { title: "Settings — IBONA" },
      { name: "description", content: "Manage your IBONA profile, avatar, and playback preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { lowData, setLowData } = useSettings();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  if (!user) {
    return (
      <AppLayout>
        <div className="py-20 flex justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </AppLayout>
    );
  }

  const handleAvatar = async (file: File) => {
    if (file.size / (1024 * 1024) > 5) { toast.error("Avatar must be under 5 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Avatar must be an image"); return; }
    setUploadingAvatar(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar uploaded — click Save to apply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (trimmedUsername && trimmedUsername.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: trimmedUsername || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(/duplicate|unique/i.test(error.message) ? "That username is taken" : error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6 animate-fade-in">
        <h1 className="text-3xl font-black tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your profile, avatar, and playback preferences.</p>

        <section className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-bold mb-4">Profile</h2>

          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-20 w-20 rounded-full ring-2 ring-primary/40 bg-cover bg-center"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : { background: "var(--gradient-brand)" }}
            />
            <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background hover:bg-surface-elevated px-4 py-2 text-sm font-semibold cursor-pointer">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingAvatar ? "Uploading…" : "Change avatar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
              />
            </label>
          </div>

          <Field label="Display name" hint="Shown on your videos & comments. Defaults to your registered name.">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              placeholder={user.email?.split("@")[0]}
              className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </Field>

          <Field label="Username" hint="Letters, numbers and underscores. Used in your public URL: /c/username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={30}
              placeholder="your_handle"
              className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </Field>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Tell viewers about your channel"
              className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </Field>

          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-muted-foreground">{user.email}</div>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-bold mb-4">Playback</h2>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="font-semibold text-sm">Low-data mode</div>
              <div className="text-xs text-muted-foreground">Disable autoplay previews and reduce data usage.</div>
            </div>
            <input
              type="checkbox"
              checked={lowData}
              onChange={(e) => setLowData(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-bold mb-2">Account</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign out of this device. You can sign back in any time.</p>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/50 text-destructive bg-background hover:bg-destructive/10 px-4 py-2 text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </div>
    </AppLayout>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {hint && <div className="text-[11px] text-muted-foreground mb-1.5">{hint}</div>}
      {!hint && <div className="h-1" />}
      {children}
    </div>
  );
}
