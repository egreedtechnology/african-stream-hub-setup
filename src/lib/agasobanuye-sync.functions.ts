import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Asks Streamtape to download each film URL into the admin's account (remote upload).
 * Optional proxyPrefix (e.g. your Vercel/Deno proxy "https://x.vercel.app/api/stream?url=")
 * lets Streamtape fetch files that need the agasobanuyenow.com Referer.
 */
export const sendToStreamtape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { urls: string[]; proxyPrefix?: string }) => ({
    urls: (d.urls ?? []).map((u) => String(u).trim()).filter((u) => /^https?:\/\//.test(u)).slice(0, 50),
    proxyPrefix: (d.proxyPrefix ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).rpc("get_streamtape_credentials");
    if (error) throw new Error("Could not load Streamtape settings.");
    const map = Object.fromEntries(((rows ?? []) as any[]).map((r) => [r.key, (r.value ?? "").trim()]));
    const login = map["streamtape_login"], key = map["streamtape_key"];
    if (!login || !key) throw new Error("Save your Streamtape username and password first.");
    const results: { url: string; ok: boolean; msg: string }[] = [];
    for (const url of data.urls) {
      const src = data.proxyPrefix ? data.proxyPrefix + encodeURIComponent(url) : url;
      const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "film");
      const p = new URLSearchParams({ login, key, url: src, name });
      try {
        const b = (await (await fetch(`https://api.streamtape.com/remotedl/add?${p}`)).json()) as any;
        results.push({ url, ok: b.status === 200, msg: b.status === 200 ? "Queued on Streamtape" : b.msg || "Rejected" });
      } catch {
        results.push({ url, ok: false, msg: "Could not reach Streamtape" });
      }
    }
    return { results };
  });
