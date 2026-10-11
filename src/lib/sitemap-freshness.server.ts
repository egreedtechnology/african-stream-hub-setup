/**
 * Server-only helper: the newest publish/update timestamp across public content.
 * Sitemaps use this as an authoritative <lastmod> instead of "now", so the value
 * only changes when content actually changes.
 */
export async function latestContentLastmod(): Promise<string | null> {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return null;
    const res = await fetch(
      `${url}/rest/v1/videos?select=updated_at&visibility=eq.public&status=eq.ready&order=updated_at.desc&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ updated_at: string | null }>;
    const ts = rows[0]?.updated_at;
    return ts ? ts.slice(0, 10) : null;
  } catch {
    return null;
  }
}
