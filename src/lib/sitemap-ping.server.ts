const BASE_URL = "https://rebalive.egreedtech.org";
export const SITEMAP_INDEX = `${BASE_URL}/sitemap.xml`;

/** Nudge search engines to re-fetch the sitemap index. Non-fatal on failure. */
export async function pingEngines(): Promise<{ ok: boolean; pinged: string[] }> {
  const targets = [
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_INDEX)}`,
    `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_INDEX)}`,
  ];
  const pinged: string[] = [];
  await Promise.all(
    targets.map(async (t) => {
      try {
        const res = await fetch(t, { method: "GET" });
        if (res.ok) pinged.push(new URL(t).host);
      } catch {
        /* non-fatal */
      }
    }),
  );
  return { ok: true, pinged };
}
