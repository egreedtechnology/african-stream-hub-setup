import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { latestContentLastmod } from "@/lib/sitemap-freshness.server";

const BASE_URL = "https://rebalive.egreedtech.org";

// Root sitemap index — points crawlers at the specialized child sitemaps.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = await latestContentLastmod();
        const children = [
          { loc: `${BASE_URL}/sitemap-pages.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-videos.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-titles.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-creators.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-genres.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-countries.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-years.xml`, lastmod: now },
          { loc: `${BASE_URL}/sitemap-images.xml`, lastmod: now },
        ];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...children.map(
            (c) =>
              `  <sitemap>\n    <loc>${c.loc}</loc>\n${c.lastmod ? `    <lastmod>${c.lastmod}</lastmod>\n` : ""}  </sitemap>`,
          ),
          `</sitemapindex>`,
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
