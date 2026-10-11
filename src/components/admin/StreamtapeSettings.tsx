import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Server, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_TABLE = "app_settings";
const LOGIN_KEY = "streamtape_login";
const API_KEY = "streamtape_key";

type SettingRow = { key: string; value: string | null };
type StreamtapeResponse = {
  status?: number;
  msg?: string;
  result?: { signup_at?: string | number };
};

/** Admin-only configuration panel for the Streamtape account used by uploads. */
export function StreamtapeSettings() {
  const [login, setLogin] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from(SETTINGS_TABLE)
        .select("key, value")
        .in("key", [LOGIN_KEY, API_KEY]);
      if (!cancelled && !error) {
        for (const row of (data as SettingRow[] | null) ?? []) {
          if (row.key === LOGIN_KEY) setLogin(row.value ?? "");
          if (row.key === API_KEY) setKey(row.value ?? "");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const testConnection = async () => {
    const trimmedLogin = login.trim();
    const trimmedKey = key.trim();
    if (!trimmedLogin || !trimmedKey) {
      setMessage({ ok: false, text: "Enter both the Streamtape Login ID and API Key." });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const url = new URL("https://api.streamtape.com/account/info");
      url.searchParams.set("login", trimmedLogin);
      url.searchParams.set("key", trimmedKey);
      const response = await fetch(url);
      const body = (await response.json()) as StreamtapeResponse;
      if (response.status === 200 && body.status === 200 && body.result?.signup_at) {
        setMessage({ ok: true, text: "Streamtape API Connected Successfully!" });
        toast.success("Streamtape API Connected Successfully!");
      } else {
        const text = body.msg || `Streamtape rejected the request (${response.status}).`;
        setMessage({ ok: false, text });
        toast.error("Streamtape API verification failed", { description: text });
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not reach Streamtape.";
      setMessage({ ok: false, text });
      toast.error("Streamtape API verification failed", { description: text });
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    const trimmedLogin = login.trim();
    const trimmedKey = key.trim();
    if (!trimmedLogin || !trimmedKey) {
      setMessage({ ok: false, text: "Enter both credentials before saving." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await (supabase as any).from(SETTINGS_TABLE).upsert(
      [
        { key: LOGIN_KEY, value: trimmedLogin },
        { key: API_KEY, value: trimmedKey },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
      toast.error("Could not save Streamtape configuration", { description: error.message });
      return;
    }
    toast.success("Streamtape configuration saved");
    setMessage({ ok: true, text: "Streamtape credentials saved." });
  };

  return (
    <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Admin settings</div>
          <h2 className="text-xl font-bold">Streamtape integration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configure and verify the account used for direct video uploads.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Streamtape Login ID
          <div className="relative mt-1.5">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={login} onChange={(e) => setLogin(e.target.value)} disabled={loading || testing || saving} autoComplete="off" className="w-full rounded-xl border border-border bg-background px-9 py-3 text-sm outline-none focus:border-primary disabled:opacity-60" placeholder="Login ID" />
          </div>
        </label>
        <label className="text-sm font-semibold">
          Streamtape API Key
          <div className="relative mt-1.5">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} disabled={loading || testing || saving} autoComplete="new-password" className="w-full rounded-xl border border-border bg-background px-9 py-3 text-sm outline-none focus:border-primary disabled:opacity-60" placeholder="API key" />
          </div>
        </label>
      </div>
      {message && (
        <div role="alert" className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${message.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
          {message.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={testConnection} disabled={loading || testing || saving} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-surface-elevated disabled:opacity-50">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
          {testing ? "Verifying…" : "Test & Verify Connection"}
        </button>
        <button type="button" onClick={saveConfiguration} disabled={loading || testing || saving} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-brand)" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </section>
  );
}

export default StreamtapeSettings;
