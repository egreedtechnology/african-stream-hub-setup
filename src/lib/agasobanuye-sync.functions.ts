import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseTitle, isVideoFile } from "@/lib/title-parser";

const UA = { "User-Agent": "Mozilla/5.0 (IBONA sync)" };

/** Sitemaps and pages escape characters like ' as &apos; / &#039;; decode before using URLs. */
function decodeEntities(s: string) {
  return s
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function getCreds(sb: any) {
  const { data: rows, error } = await sb.rpc("get_streamtape_credentials");
  if (error) throw new Error("Could not load Streamtape settings.");
  const map = Object.fromEntries(((rows ?? []) as any[]).map((r) => [r.key, (r.value ?? "").trim()]));
  const login = map["streamtape_login"], key = map["streamtape_key"];
  if (!login || !key) throw new Error("Save your Streamtape username and password first.");
  return { login, key };
}

async function requireAdmin(sb: any, userId: string) {
  const { data } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only admins can sync films.");
}

async function listStreamtapeFiles(login: string, key: string) {
  const files: { name: string; linkid: string }[] = [];
  const queue = [""];
  while (queue.length) {
    const folder = queue.shift()!;
    const p = new URLSearchParams({ login, key });
    if (folder) p.set("folder", folder);
    const b = (await (await fetch(`https://api.streamtape.com/file/listfolder?${p}`)).json()) as any;
    if (b.status !== 200) throw new Error(b.msg || "Streamtape list failed");
    for (const f of b.result?.folders ?? []) queue.push(f.id);
    for (const f of b.result?.files ?? []) if (f.linkid && isVideoFile(f.name)) files.push(f);
  }
  return files;
}

/** Adds every finished Streamtape file that is not yet in the catalog. */
async function importFinished(sb: any, userId: string, login: string, key: string) {
  const files = await listStreamtapeFiles(login, key);
  const urls = files.map((f) => `https://streamtape.com/e/${f.linkid}/`);
  const have = new Set<string>();
  for (let i = 0; i < urls.length; i += 200) {
    const { data } = await sb.from("videos").select("video_url").in("video_url", urls.slice(i, i + 200));
    for (const r of data ?? []) have.add(r.video_url);
  }
  const rows = files
    .map((f, i) => {
      const m = parseTitle(f.name);
      return {
        owner_id: userId, title: m.partNumber ? `${m.title} — Part ${m.partNumber}` : m.title, original_title: f.name,
        video_url: urls[i], thumbnail_url: `https://thumb.tapecontent.net/${f.linkid}.jpg`,
        status: "ready", visibility: "public", category: "Agasobanuye", movie_type: "movie",
        has_agasobanuye: !!m.interpreter, interpreter: m.interpreter ?? null, part_number: m.partNumber ?? 1,
        total_parts: m.totalParts ?? null, series_slug: m.seriesSlug, release_year: m.releaseYear ?? null, quality: m.quality ?? null,
      };
    })
    .filter((r) => !have.has(r.video_url));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb.from("videos").insert(rows.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
  return { imported: rows.length, names: files.map((f) => f.name) };
}

/** Import-only step: called automatically every minute while the admin panel is open. */
export const importFinishedTransfers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { login, key } = await getCreds(context.supabase);
    const { imported } = await importFinished(context.supabase, context.userId, login, key);
    return { imported };
  });

/**
 * Full sync: scan the latest-films list, queue new films on Streamtape, import any finished ones.
 * Requires the admin to confirm they hold distribution rights for this source.
 */
export const scanAndSyncFilms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { proxyPrefix?: string; rightsConfirmed: boolean; limit?: number }) => ({
    proxyPrefix: (d.proxyPrefix ?? "").trim(),
    rightsConfirmed: d.rightsConfirmed === true,
    limit: Math.min(Math.max(Number(d.limit) || 20, 1), 50),
  }))
  .handler(async ({ data, context }) => {
    if (!data.rightsConfirmed) throw new Error("Confirm you have permission to distribute these films first.");
    const sb = context.supabase as any;
    await requireAdmin(sb, context.userId);
    const { login, key } = await getCreds(sb);

    const first = await importFinished(sb, context.userId, login, key);
    const onStreamtape = new Set(first.names.map((n) => n.toLowerCase()));

    const xml = await (await fetch("https://agasobanuyenow.com/sitemap-latest.xml", { headers: UA })).text();
    const pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeEntities(m[1].trim())).filter((u) => u.includes("/movies/")).slice(0, data.limit);

    const queued: string[] = [], skipped: string[] = [], failed: string[] = [];
    for (const page of pages) {
      try {
        const html = await (await fetch(page, { headers: UA })).text();
        const file = decodeEntities(html).match(/https:\/\/media\.agasobanuyenow\.com\/download\/[^"<>\s]+\.mp4/i)?.[0];
        if (!file) { failed.push(`${page} (no video file found)`); continue; }
        const name = decodeURIComponent(file.split("/").pop()!);
        const { data: inDb } = await sb.from("videos").select("id").eq("original_title", name).limit(1);
        if (onStreamtape.has(name.toLowerCase()) || inDb?.length) { skipped.push(name); continue; }
        const src = data.proxyPrefix ? data.proxyPrefix + encodeURIComponent(file) : file;
        const b = (await (await fetch(`https://api.streamtape.com/remotedl/add?${new URLSearchParams({ login, key, url: src, name })}`)).json()) as any;
        if (b.status === 200) queued.push(name); else failed.push(`${name} (${b.msg || "rejected"})`);
      } catch {
        failed.push(`${page} (could not reach)`);
      }
    }
    return { scanned: pages.length, queued, skipped: skipped.length, failed, imported: first.imported };
  });
