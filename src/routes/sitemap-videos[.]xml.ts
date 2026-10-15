import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://ibona.egreedtech.org";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");

interface VideoRow {
  id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  ai_thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  views: number | null;
  language: string | null;
  category: string | null;
  tags: string[] | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Google Video sitemap — https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
// Combines <video:video> (rich video info) + <image:image> (thumbnail) per URL.
export const Route = createFileRoute("/sitemap-videos.xml")({
  server: {
    handlers: {
      GET: async () => {
        let rows: VideoRow[] = [];
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(
              `${url}/rest/v1/videos?select=id,title,description,thumbnail_url,ai_thumbnail_url,video_url,duration_seconds,views,language,category,tags,country,created_at,updated_at&visibility=eq.public&status=eq.ready&order=created_at.desc&limit=5000`,
              { headers: { apikey: key, Authorization: `Bearer ${key}` } },
            );
            if (res.ok) rows = (await res.json()) as VideoRow[];
          }
        } catch { /* return empty sitemap */ }

        const urls = rows.map((v) => {
          const loc = `${BASE_URL}/watch/${v.id}`;
          const thumb = v.ai_thumbnail_url || v.thumbnail_url || "";
          const title = esc((v.title || "IBONA Video").slice(0, 100));
          const desc = esc((v.description || v.title || "African video streaming on IBONA").slice(0, 2048));
          const lastmod = (v.updated_at || v.created_at || new Date().toISOString()).slice(0, 10);
          const tagLines = (v.tags || []).slice(0, 32).map((t) => `      <video:tag>${esc(String(t))}</video:tag>`).join("\n");
          const langMap: Record<string, string> = { Kinyarwanda: "rw", Swahili: "sw", English: "en", French: "fr" };
          const lang = v.language ? (langMap[v.language] ?? "rw") : "rw";
          const videoBlock = thumb
            ? [
                `    <video:video>`,
                `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
                `      <video:title>${title}</video:title>`,
                `      <video:description>${desc}</video:description>`,
                v.video_url ? `      <video:content_loc>${esc(v.video_url)}</video:content_loc>` : null,
                `      <video:player_loc allow_embed="yes">${esc(`${BASE_URL}/watch/${v.id}`)}</video:player_loc>`,
                `      <video:view_count>${String(v.views ?? 0)}</video:view_count>`,
                `      <video:publication_date>${lastmod}</video:publication_date>`,
                `      <video:family_friendly>yes</video:family_friendly>`,
                `      <video:requires_subscription>no</video:requires_subscription>`,
                `      <video:category>${esc(v.category || "Entertainment")}</video:category>`,
                `      <video:tag>${esc(v.title || "IBONA")}</video:tag>`,
                tagLines,
                `      <video:content_loc>${esc(v.video_url || "")}</video:content_loc>`,
                `      <video:duration>${String(v.duration_seconds ?? 0)}</video:duration>`,
                `      <video:language>${lang}</video:language>`,
                `    </video:video>`,
              ].filter(Boolean).join("\n")
            : "";
          return [`  <url>`, `    <loc>${loc}</loc>`, videoBlock || null, `  </url>`].filter(Boolean).join("\n");
        });

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
          `        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
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
