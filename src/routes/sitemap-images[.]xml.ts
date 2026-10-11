import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://rebalive.egreedtech.org";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

interface Row {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  ai_thumbnail_url: string | null;
  description: string | null;
}

// Dedicated Google Image sitemap — poster, backdrop, AI thumbnail, uploader thumbnail.
export const Route = createFileRoute("/sitemap-images.xml")({
  server: {
    handlers: {
      GET: async () => {
        let rows: Row[] = [];
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(
              `${url}/rest/v1/videos?select=id,title,thumbnail_url,poster_url,backdrop_url,ai_thumbnail_url,description&visibility=eq.public&status=eq.ready&limit=5000`,
              { headers: { apikey: key, Authorization: `Bearer ${key}` } },
            );
            if (res.ok) rows = (await res.json()) as Row[];
          }
        } catch { /* empty */ }

        const urls = rows.map((v) => {
          const loc = `${BASE_URL}/watch/${v.id}`;
          const title = esc((v.title || "IBONA Video").slice(0, 100));
          const caption = esc((v.description || v.title || "IBONA").slice(0, 300));
          const images: string[] = [];
          const push = (u: string | null) => { if (u) images.push(u); };
          push(v.poster_url); push(v.backdrop_url); push(v.ai_thumbnail_url); push(v.thumbnail_url);
          // de-duplicate
          const uniq = [...new Set(images)];
          const imageBlocks = uniq.map(
            (u) => `    <image:image>\n      <image:loc>${esc(u)}</image:loc>\n      <image:title>${title}</image:title>\n      <image:caption>${caption}</image:caption>\n    </image:image>`,
          ).join("\n");
          return [`  <url>`, `    <loc>${loc}</loc>`, imageBlocks || null, `  </url>`].filter(Boolean).join("\n");
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
