import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SANITY = "https://69cl5341.apicdn.sanity.io/v1/data/query/production";
const UA = { "User-Agent": "Mozilla/5.0 (IBONA sync)" };

async function getCreds(sb: any) {
  const { data: rows, error } = await sb.rpc("get_streamtape_credentials");
  if (error) throw new Error("Could not load Streamtape settings.");
  const map = Object.fromEntries(((rows ?? []) as any[]).map((r) => [r.key, (r.value ?? "").trim()]));
  if (!map["streamtape_login"] || !map["streamtape_key"]) throw new Error("Save your Streamtape username and password first.");
  return { login: map["streamtape_login"] as string, key: map["streamtape_key"] as string };
}

/** Turns a MediaFire share page into its direct download link. */
async function resolveMediafire(url: string): Promise<string | null> {
  const html = await (await fetch(url, { headers: UA })).text();
  return html.match(/href="(https:\/\/download\d*\.mediafire\.com\/[^"]+)"/i)?.[1] ?? null;
}

/** Scans Daddy M Films and sends new MediaFire files to Streamtape remote upload. */
export const syncDaddymFilms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rightsConfirmed: boolean; offset?: number; limit?: number }) => ({
    rightsConfirmed: d.rightsConfirmed === true,
    offset: Math.max(Number(d.offset) || 0, 0),
    limit: Math.min(Math.max(Number(d.limit) || 10, 1), 25),
  }))
  .handler(async ({ data, context }) => {
    if (!data.rightsConfirmed) throw new Error("Confirm you have permission to distribute these films first.");
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can sync films.");
    const { login, key } = await getCreds(sb);

    const q = `*[_type=="movie"]|order(_createdAt desc)[${data.offset}...${data.offset + data.limit}]{title,movieLinks}`;
    const res = await fetch(`${SANITY}?query=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Could not reach Daddy M Films.");
    const movies = ((await res.json()) as any).result as { title?: string; movieLinks?: { streamingLink?: string; downloadLink?: string }[] }[];

    const queued: string[] = [], failed: string[] = [];
    let skipped = 0;
    for (const m of movies) {
      for (const link of m.movieLinks ?? []) {
        const mf = [link.downloadLink, link.streamingLink].find((u) => u?.includes("mediafire.com/file/"));
        if (!mf) continue;
        let name = (mf.split("/file/")[1] ?? "").split("/")[1] ?? "";
        // Daddy M links are sometimes encoded twice (e.g. %2527 for an apostrophe).
        for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(name); i++) { try { name = decodeURIComponent(name); } catch { break; } }
        name = name.replace(/\+/g, " ").replace(/_/g, " ").trim();
        if (!name) continue;
        const { data: inDb } = await sb.from("videos").select("id").eq("original_title", name).limit(1);
        if (inDb?.length) { skipped++; continue; }
        try {
          const direct = await resolveMediafire(mf);
          if (!direct) { failed.push(`${name} (no download link)`); continue; }
          const b = (await (await fetch(`https://api.streamtape.com/remotedl/add?${new URLSearchParams({ login, key, url: direct, name })}`)).json()) as any;
          if (b.status === 200) queued.push(name); else failed.push(`${name} (${b.msg || "rejected"})`);
        } catch {
          failed.push(`${name} (could not reach)`);
        }
      }
    }
    return { scanned: movies.length, nextOffset: data.offset + movies.length, done: movies.length < data.limit, queued, skipped, failed };
  });
