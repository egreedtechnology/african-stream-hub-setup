import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `# IBONA

> IBONA (formerly Rebalive) is an African-first video streaming platform for agasobanuye, film nyarwanda, amakuru, news shorts, comedy, and African music. Content streams in Kinyarwanda, Swahili, English, and French.

IBONA is a home for African creators. Viewers can watch full films, short-form vertical videos, music videos, and news, and creators can upload, generate AI thumbnails and captions, and grow an audience.

## Pages

- [Home](/): Latest and recommended African videos.
- [Trending](/trending): Most-watched African videos this week.
- [Movies](/movies): Full-length African films and cinema, including film nyarwanda.
- [Music](/music): Afrobeats, gospel nyarwanda, traditional, and more African music.
- [Shorts](/shorts): Snackable vertical videos from African creators.
- [Search](/search): Find creators and videos by title, language, or category.

## Optional

- [Sign in](/auth): Create an account to follow creators, comment, save, and upload.
`;
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
