import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import { Route as InterpretersRoute } from "./abasobanuzi";
import { fetchInterpreterDirectory, type InterpreterEntry } from "@/lib/videos-api";
import { cdnImage, fallbackCover } from "@/lib/cdn-image";

export const Route = createFileRoute("/abasobanuzi/")({
  component: InterpretersDirectory,
});

function InterpretersDirectory() {
  const [list, setList] = useState<InterpreterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchInterpreterDirectory().then((rows) => {
      if (cancelled) return;
      setList(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Abasobanuzi</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">The voices of agasobanuye</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Every film in Kinyarwanda carries the voice of an interpreter. Discover their work and
          watch the movies they made.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground">
          No interpreters have been credited yet. Films added from now on can name their interpreter.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 animate-fade-in">
          {list.map((it) => (
            <Link
              key={it.slug}
              to="/abasobanuzi/$interpreter"
              params={{ interpreter: it.slug }}
              className="group block"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border/60 bg-surface">
                {it.posters.length >= 4 ? (
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                    {it.posters.map((p, i) => (
                      <img
                        key={i}
                        src={cdnImage(p, 320)}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackCover; }}
                        className="h-full w-full object-cover"
                      />
                    ))}
                  </div>
                ) : it.posters[0] ? (
                  <img
                    src={cdnImage(it.posters[0], 480)}
                    alt=""
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackCover; }}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Mic2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {it.count} {it.count === 1 ? "film" : "films"}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h2 className="text-sm font-extrabold leading-tight text-white line-clamp-2">{it.name}</h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export { InterpretersRoute };
