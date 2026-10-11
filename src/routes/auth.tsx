import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { IbonaLogo } from "@/components/IbonaLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
    mode: s.mode === "signup" ? "signup" : "login",
  }),
  beforeLoad: async ({ search }) => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) throw redirect({ to: search.redirect || "/" });
  },
  head: () => {
    const desc = "Sign in or create an IBONA account to follow African creators, comment, save videos, and upload agasobanuye, film nyarwanda, music, comedy and news shorts.";
    return {
      meta: [
        { title: "Sign in — IBONA" },
        { name: "description", content: desc },
        { property: "og:title", content: "Sign in to IBONA — African-first streaming" },
        { property: "og:description", content: desc },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.mode as "login" | "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
        navigate({ to: search.redirect || "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: search.redirect || "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (search.redirect || "/"),
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: search.redirect || "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--gradient-glow), var(--background)" }}>
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12"
        style={{ background: "var(--gradient-brand)" }}>
        <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative z-10 max-w-md text-primary-foreground">
          <IbonaLogo />
          <h2 className="mt-8 text-5xl font-black tracking-tight leading-tight">
            African stories,<br />streamed your way.
          </h2>
          <p className="mt-4 text-lg opacity-90">
            Join creators across the continent. Watch in your language. Upload your story.
          </p>
          <div className="mt-10 flex gap-3 text-xs font-bold uppercase tracking-widest opacity-80">
            <span>★ Agasobanuye</span>
            <span>·</span>
            <span>Low-data</span>
            <span>·</span>
            <span>Creator Studio</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <IbonaLogo />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to continue to IBONA." : "Follow, comment, save, and upload."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-surface hover:bg-surface-elevated px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="flex-1 h-px bg-border" />or<div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={UserIcon} placeholder="Display name" value={displayName} onChange={setDisplayName} />
            )}
            <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} required autoComplete="email" />
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-xl bg-surface border border-border pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground text-center">
            {mode === "login" ? "New to IBONA?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
              className="font-bold text-primary hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Back to IBONA
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, type = "text", placeholder, value, onChange, required, autoComplete,
}: {
  icon: typeof Mail; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl bg-surface border border-border pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
