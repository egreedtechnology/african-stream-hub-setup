import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { latestContentLastmod } from "@/lib/sitemap-freshness.server";

const BASE_URL = "https://rebalive.egreedtech.org";

interface Entry {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

export const Route = createFileRoute("/sitemap-pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        const now = await latestContentLastmod();
        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/trending", changefreq: "hourly", priority: "0.9" },
          { path: "/movies", changefreq: "daily", priority: "0.9" },
          { path: "/music", changefreq: "daily", priority: "0.9" },
          { path: "/shorts", changefreq: "daily", priority: "0.9" },
          { path: "/search", changefreq: "weekly", priority: "0.5" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n${now ? `    <lastmod>${now}</lastmod>\n` : ""}    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n    <xhtml:link rel="alternate" hreflang="rw" href="${BASE_URL}${e.path}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${e.path}"/>\n    <xhtml:link rel="alternate" hreflang="sw" href="${BASE_URL}${e.path}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${e.path}"/>\n  </url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
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
