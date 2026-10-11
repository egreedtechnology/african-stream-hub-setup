import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Cached image proxy — long-lived, immutable CDN cache for thumbnails/avatars.
// Only forwards requests to trusted upstream hosts (SSRF-safe allow-list).
const ALLOWED_HOSTS = new Set<string>([
  "buxlzcsvnrouezmsvald.supabase.co",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
]);

const ONE_YEAR = 60 * 60 * 24 * 365;

export const Route = createFileRoute("/img/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // /img/<encoded absolute url>
        const url = new URL(request.url);
        const raw = decodeURIComponent(url.pathname.replace(/^\/img\//, ""));
        let src: URL;
        try {
          src = new URL(raw);
        } catch {
          return new Response("Bad URL", { status: 400 });
        }
        if (src.protocol !== "https:" || !ALLOWED_HOSTS.has(src.hostname)) {
          return new Response("Forbidden", { status: 403 });
        }
        try {
          const upstream = await fetch(src.toString(), {
            headers: { Accept: "image/*" },
          });
          if (!upstream.ok || !upstream.body) {
            return new Response("Upstream error", { status: 502 });
          }
          const contentType =
            upstream.headers.get("Content-Type") || "image/jpeg";
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable, stale-while-revalidate=86400`,
              "CDN-Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
              "Cloudflare-CDN-Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
              Vary: "Accept",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Fetch failed", { status: 502 });
        }
      },
    },
  },
});
