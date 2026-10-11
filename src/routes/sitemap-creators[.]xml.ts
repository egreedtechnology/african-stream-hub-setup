import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { latestContentLastmod } from "@/lib/sitemap-freshness.server";

const BASE_URL = "https://rebalive.egreedtech.org";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

interface ProfileRow {
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  updated_at?: string | null;
}

export const Route = createFileRoute("/sitemap-creators.xml")({
  server: {
    handlers: {
      GET: async () => {
        let rows: ProfileRow[] = [];
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(
              `${url}/rest/v1/profiles?select=username,avatar_url,display_name&username=not.is.null&limit=5000`,
              { headers: { apikey: key, Authorization: `Bearer ${key}` } },
            );
            if (res.ok) rows = (await res.json()) as ProfileRow[];
          }
        } catch { /* empty */ }

        const now = await latestContentLastmod();
        const urls = rows
          .filter((p) => p.username)
          .map((p) => {
            const loc = `${BASE_URL}/c/${p.username}`;
            const img = p.avatar_url ? `    <image:image>\n      <image:loc>${esc(p.avatar_url)}</image:loc>\n      <image:title>${esc(p.display_name || p.username!)}</image:title>\n    </image:image>` : "";
            return [
              `  <url>`,
              `    <loc>${loc}</loc>`,
              now ? `    <lastmod>${now}</lastmod>` : null,
              `    <changefreq>weekly</changefreq>`,
              `    <priority>0.6</priority>`,
              img || null,
              `  </url>`,
            ].filter(Boolean).join("\n");
          });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
          `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
          },
        });
      },
    },
  },
});
