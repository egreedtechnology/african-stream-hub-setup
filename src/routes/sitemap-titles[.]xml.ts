import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { MOVIE_TYPES } from "@/lib/taxonomy";

const BASE_URL = "https://rebalive.egreedtech.org";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

interface Row { slug: string | null; movie_type: string | null; updated_at: string | null; created_at: string | null; poster_url: string | null; thumbnail_url: string | null; title: string | null }

// One sitemap per movie type family so we can list /movie/$slug, /series/$slug, /tv/$slug, /anime/$slug, /drama/$slug, /documentary/$slug.
export const Route = createFileRoute("/sitemap-titles.xml")({
  server: {
    handlers: {
      GET: async () => {
        let rows: Row[] = [];
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(
              `${url}/rest/v1/videos?select=slug,movie_type,updated_at,created_at,poster_url,thumbnail_url,title&visibility=eq.public&status=eq.ready&slug=not.is.null&movie_type=not.is.null&limit=10000`,
              { headers: { apikey: key, Authorization: `Bearer ${key}` } },
            );
            if (res.ok) rows = (await res.json()) as Row[];
          }
        } catch { /* empty */ }

        const urls = rows
          .filter((r) => r.slug && r.movie_type && (MOVIE_TYPES as readonly string[]).includes(r.movie_type))
          .map((r) => {
            const loc = `${BASE_URL}/${r.movie_type}/${r.slug}`;
            const lastmod = (r.updated_at || r.created_at || new Date().toISOString()).slice(0, 10);
            const image = r.poster_url || r.thumbnail_url;
            const imageBlock = image
              ? `    <image:image>\n      <image:loc>${esc(image)}</image:loc>\n      <image:title>${esc(r.title || "IBONA")}</image:title>\n    </image:image>`
              : "";
            return [
              `  <url>`,
              `    <loc>${loc}</loc>`,
              `    <lastmod>${lastmod}</lastmod>`,
              `    <changefreq>weekly</changefreq>`,
              `    <priority>0.8</priority>`,
              imageBlock || null,
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
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=120, stale-while-revalidate=600" },
        });
      },
    },
  },
});
