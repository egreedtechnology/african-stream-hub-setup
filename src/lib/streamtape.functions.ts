import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns a one-time Streamtape upload URL for any signed-in user.
 * Reads credentials safely via SECURITY DEFINER RPC without needing service role keys.
 */
export const getStreamtapeUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await (supabase as any).rpc("get_streamtape_credentials");
    if (error) {
      throw new Error(`Could not load Streamtape settings: ${error.message}`);
    }

    const rows = (data ?? []) as { key: string; value: string | null }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, (r.value ?? "").trim()]));
    const login = map["streamtape_login"];
    const key = map["streamtape_key"];

    if (!login || !key) {
      throw new Error("Streamtape is not configured. Please save your API Username and Password in Creator Studio.");
    }

    const params = new URLSearchParams({ login, key });
    const res = await fetch(`https://api.streamtape.com/file/ul?${params}`);
    const body = (await res.json()) as { status?: number; msg?: string; result?: { url?: string } };

    if (body.status !== 200 || !body.result?.url) {
      throw new Error(`Streamtape API error: ${body.msg || res.statusText}`);
    }

    return { url: body.result.url };
  });
