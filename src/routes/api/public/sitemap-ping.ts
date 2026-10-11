import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Public endpoint external schedulers/webhooks can call after content changes
 * to make search engines re-fetch the sitemap index.
 */
export const Route = createFileRoute("/api/public/sitemap-ping")({
  server: {
    handlers: {
      POST: async () => {
        const { pingEngines } = await import("@/lib/sitemap-ping.server");
        const result = await pingEngines();
        return Response.json(result);
      },
      GET: async () => {
        const { pingEngines } = await import("@/lib/sitemap-ping.server");
        const result = await pingEngines();
        return Response.json(result);
      },
    },
  },
});
