import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { latestContentLastmod } from "@/lib/sitemap-freshness.server";
import { COUNTRIES } from "@/lib/taxonomy";

const BASE_URL = "https://rebalive.egreedtech.org";

export const Route = createFileRoute("/sitemap-countries.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = await latestContentLastmod();
        const urls = COUNTRIES.map((c) => {
          const loc = `${BASE_URL}/country/${c.code}`;
          return `  <url>\n    <loc>${loc}</loc>\n${now ? `    <lastmod>${now}</lastmod>\n` : ""}    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
        });
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
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
