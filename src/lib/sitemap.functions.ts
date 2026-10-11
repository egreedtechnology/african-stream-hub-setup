import { createServerFn } from "@tanstack/react-start";

/**
 * Notify search engines that the sitemap index changed.
 * Sitemaps are generated per-request from the database, so nothing needs
 * rebuilding — this only nudges crawlers to re-fetch them.
 */
export const notifySitemapUpdated = createServerFn({ method: "POST" }).handler(async () => {
  const { pingEngines } = await import("./sitemap-ping.server");
  return await pingEngines();
});
