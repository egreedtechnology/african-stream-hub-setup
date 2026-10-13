import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns a one-time Streamtape upload URL for any signed-in user.
 * Credentials stay server-side (app_settings is admin-only under RLS).
 */
export const getStreamtapeUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("key, value")
      .in("key", ["streamtape_login", "streamtape_key"]);
    if (error) throw new Error("Could not load Streamtape settings");
    const map = Object.fromEntries(((data ?? []) as { key: string; value: string | null }[]).map((r) => [r.key, (r.value ?? "").trim()]));
    const login = map["streamtape_login"];
    const key = map["streamtape_key"];
    if (!login || !key) throw new Error("Streamtape is not set up yet. Ask an admin to save the Streamtape settings.");
    const params = new URLSearchParams({ login, key });
    const res = await fetch(`https://api.streamtape.com/file/ul?${params}`);
    const body = (await res.json()) as { status?: number; msg?: string; result?: { url?: string } };
    if (body.status !== 200 || !body.result?.url) throw new Error(`Streamtape: ${body.msg || res.statusText}`);
    return { url: body.result.url };
  });
