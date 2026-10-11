import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/**
 * semanticSearch — embeds the user's query with the same model used for videos,
 * then calls the SECURITY-DEFINER `match_videos` RPC for cosine-similarity ranking.
 * Falls back to empty result on any provider failure; the UI also runs ilike on the
 * client so callers won't see a black hole if AI is offline.
 */
export const semanticSearch = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ q: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { embedText } = await import('./ai-gateway.server');
      const vec = await embedText(data.q);
      const literal = `[${vec.join(',')}]`;
      const supabase = supabaseAdmin;
      const { data: rows, error } = await supabase.rpc('match_videos', {
        query_embedding: literal as unknown as never,
        match_count: 24,
        min_similarity: 0.18,
      });
      if (error) return { ok: false, ids: [] as string[], error: error.message };
      const ids = (rows ?? []).map((r: { video_id: string }) => r.video_id);
      return { ok: true, ids };
    } catch (e) {
      return { ok: false, ids: [] as string[], error: e instanceof Error ? e.message : 'search failed' };
    }
  });
