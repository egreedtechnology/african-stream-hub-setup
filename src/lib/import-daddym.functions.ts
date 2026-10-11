import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Sanity → IBONA importer for daddymfilms.com (owner-authorized content only).
// Sanity project 69cl5341 / dataset "production" is publicly queryable.
// ---------------------------------------------------------------------------

const SANITY_PROJECT = "69cl5341";
const SANITY_DATASET = "production";
const SANITY_QUERY_URL = `https://${SANITY_PROJECT}.apicdn.sanity.io/v1/data/query/${SANITY_DATASET}`;

interface SanityAssetRef {
  _ref?: string;
}
interface SanityImage {
  asset?: SanityAssetRef;
}
interface SanityMovieLink {
  _key?: string;
  streamingLink?: string;
  downloadLink?: string;
}
interface SanityMovie {
  _id: string;
  _createdAt?: string;
  _updatedAt?: string;
  title?: string;
  slug?: { current?: string };
  description?: string;
  category?: string;
  image?: SanityImage;
  movieLinks?: SanityMovieLink[];
  trailer?: string;
}

function sanityImageUrl(ref: string | undefined): string | null {
  if (!ref) return null;
  // image-<id>-<WxH>-<ext>
  const m = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/);
  if (!m) return null;
  const [, id, dim, ext] = m;
  return `https://cdn.sanity.io/images/${SANITY_PROJECT}/${SANITY_DATASET}/${id}-${dim}.${ext}`;
}

// Convert Google Drive share/view URLs to embeddable preview URLs.
function normalizeStreamingUrl(url: string | undefined): string | null {
  if (!url) return null;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return url;
}

async function fetchAllSanityMovies(): Promise<SanityMovie[]> {
  const projection =
    '{_id,_createdAt,_updatedAt,title,slug,description,category,image,movieLinks,trailer}';
  const pageSize = 100;
  const out: SanityMovie[] = [];
  let start = 0;
  // Hard cap 2000 to be safe.
  for (let i = 0; i < 20; i++) {
    const q = `*[_type=="movie"]|order(_createdAt asc)[${start}...${start + pageSize}]${projection}`;
    const url = `${SANITY_QUERY_URL}?query=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
    const json = (await res.json()) as { result: SanityMovie[] };
    const batch = json.result ?? [];
    out.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return out;
}

export const importDaddymFilms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        dryRun: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin-only.
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(`Role check failed: ${roleErr.message}`);
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const movies = await fetchAllSanityMovies();
    const limited = data.limit ? movies.slice(0, data.limit) : movies;

    // Skip anything already imported (match on external source_id via keywords).
    const externalIds = limited.map((m) => `daddym:${m._id}`);
    const { data: existing } = await supabase
      .from("videos")
      .select("keywords")
      .in("keywords", externalIds);
    const existingSet = new Set((existing ?? []).map((r) => r.keywords));

    const rows = limited
      .filter((m) => !existingSet.has(`daddym:${m._id}`))
      .map((m) => {
        const poster = sanityImageUrl(m.image?.asset?._ref);
        const firstLink = m.movieLinks?.[0];
        const videoUrl =
          normalizeStreamingUrl(firstLink?.streamingLink) ||
          normalizeStreamingUrl(firstLink?.downloadLink) ||
          m.trailer ||
          "";
        const tags = [
          m.category?.trim(),
          "daddymfilms",
          "agasobanuye",
        ].filter(Boolean) as string[];
        return {
          owner_id: userId,
          title: (m.title || "Untitled").slice(0, 200),
          description: (m.description || "").slice(0, 4000),
          language: "Kinyarwanda" as const,
          category: "Agasobanuye" as const,
          visibility: "public" as const,
          status: "ready" as const,
          media_type: "video" as const,
          video_url: videoUrl,
          thumbnail_url: poster ?? "",
          tags,
          keywords: `daddym:${m._id}`,
          country: "RW",
          created_at: m._createdAt,
          updated_at: m._updatedAt,
        };
      });

    if (data.dryRun) {
      return {
        totalFound: movies.length,
        toImport: rows.length,
        skipped: limited.length - rows.length,
        sample: rows.slice(0, 3),
      };
    }

    if (rows.length === 0) {
      return { totalFound: movies.length, imported: 0, skipped: limited.length };
    }

    // Chunked inserts (Supabase limits ~1000/req).
    let imported = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from("videos").insert(chunk);
      if (error) throw new Error(`Insert failed at row ${i}: ${error.message}`);
      imported += chunk.length;
    }

    return {
      totalFound: movies.length,
      imported,
      skipped: limited.length - rows.length,
    };
  });
