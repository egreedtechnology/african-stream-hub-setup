import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import {
  fetchByInterpreter,
  fetchInterpreterDirectory,
  type InterpreterEntry,
} from "@/lib/videos-api";
import { cdnImage, fallbackCover } from "@/lib/cdn-image";
import type { Video } from "@/data/videos";

const BASE = "https://ibona.egreedtech.org";

function prettify(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/abasobanuzi/$interpreter")({
  head: ({ params }) => {
    const name = prettify(params.interpreter);
    const url = `${BASE}/abasobanuzi/${params.interpreter}`;
    const desc = `Watch every agasobanuye film interpreted by ${name} — movies dubbed into Kinyarwanda, streaming on IBONA.`;
    return {
      meta: [
        { title: `${name} — Agasobanuye Films | IBONA` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Agasobanuye Films | IBONA` },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name,
          jobTitle: "Agasobanuye interpreter",
          description: desc,
          url,
        }),
      }],
    };
  },
  component: InterpreterPage,
});

function InterpreterPage() {
  const { interpreter } = Route.useParams();
  const [entry, setEntry] = useState<InterpreterEntry | null>(null);
  const [films, setFilms] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dir = await fetchInterpreterDirectory();
      const found = dir.find((e) => e.slug === interpreter) ?? null;
      if (cancelled) return;
      setEntry(found);
      if (found) {
        const rows = await fetchByInterpreter(found.name, undefined, 60);
        if (!cancelled) setFilms(rows);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [interpreter]);

  const name = entry?.name ?? prettify(interpreter);

  return (
    <>
      <Link
        to="/abasobanuzi"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Abasobanuzi
      </Link>

      <header className="mb-8 flex items-center gap-5">
        {entry?.posters[0] && (
          <img
            src={cdnImage(entry.posters[0])}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackCover; }}
            className="hidden sm:block h-28 w-20 shrink-0 rounded-xl object-cover border border-border/60"
          />
        )}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Umusemuzi</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{name}</h1>
          <p className="mt-2 text-muted-foreground">
            {entry ? `${entry.count} ${entry.count === 1 ? "film" : "films"} interpreted in Kinyarwanda` : "Films interpreted by this artist"}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : films.length === 0 ? (
        <p className="text-muted-foreground">
          No films are credited to {name} yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {films.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </>
  );
}
