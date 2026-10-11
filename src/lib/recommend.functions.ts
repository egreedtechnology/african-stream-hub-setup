import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Personalized recommendations for the current viewer. */
export const forYouFeed = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(60).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    const { data: rows, error } = await supabaseAdmin.rpc('for_you_feed', {
      _user_id: userId,
      _limit: data.limit ?? 30,
    });
    if (error) return { ok: false, ids: [] as string[], error: error.message };
    const ids = (rows ?? []).map((r: { video_id: string }) => r.video_id);
    return { ok: true, ids };
  });
