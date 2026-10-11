import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Film, User, Tag, Clapperboard, Sparkles, Loader2 } from "lucide-react";
import { fetchSuggestions, type Suggestion, type SuggestionKind } from "@/lib/videos-api";

const ICONS: Record<SuggestionKind, typeof Search> = {
  title: Film,
  actor: User,
  director: Clapperboard,
  genre: Tag,
  collection: Sparkles,
  creator: User,
};

const TYPE_ROUTES = ["movie", "series", "tv", "anime", "drama", "documentary"] as const;

export function SearchAutocomplete({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await fetchSuggestions(term).catch(() => [] as Suggestion[]);
      if (cancelled) return;
      setItems(res);
      setActive(-1);
      setLoading(false);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goFreeText = (q: string) => {
    setOpen(false);
    navigate({ to: "/search", search: { q } });
  };

  const pick = (s: Suggestion) => {
    setOpen(false);
    setValue(s.label);
    if (s.kind === "creator" && s.slug) {
      navigate({ to: "/c/$username", params: { username: s.slug } });
      return;
    }
    if (s.kind === "title" && s.slug && s.movieType && (TYPE_ROUTES as readonly string[]).includes(s.movieType)) {
      navigate({ to: `/${s.movieType}/$slug` as "/movie/$slug", params: { slug: s.slug } });
      return;
    }
    if (s.kind === "title" && s.videoId) {
      navigate({ to: "/watch/$videoId", params: { videoId: s.videoId } });
      return;
    }
    if (s.kind === "genre") {
      navigate({ to: "/search", search: { genre: s.label } });
      return;
    }
    if (s.kind === "actor") {
      navigate({ to: "/search", search: { actor: s.label } });
      return;
    }
    if (s.kind === "director") {
      navigate({ to: "/search", search: { director: s.label } });
      return;
    }
    if (s.kind === "collection") {
      navigate({ to: "/search", search: { collection: s.slug ?? "" } });
      return;
    }
    goFreeText(s.label);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const chosen = items[active];
      if (chosen) pick(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={`relative w-full ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = value.trim();
          if (q) goFreeText(q);
        }}
        role="search"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="ibona-search-suggestions"
          aria-label="Search titles, actors, directors, genres"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search titles, actors, directors, genres..."
          className="w-full rounded-full bg-surface border border-border pl-10 pr-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </form>

      {open && value.trim().length >= 2 && (items.length > 0 || !loading) && (
        <div
          id="ibona-search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-elegant)] animate-scale-in"
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No suggestions — press Enter to search.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((s, i) => {
                const Icon = ICONS[s.kind];
                return (
                  <li key={`${s.kind}-${s.label}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(s)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                        i === active ? "bg-surface-elevated" : "hover:bg-surface-elevated"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                      {s.hint && <span className="shrink-0 text-xs text-muted-foreground">{s.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
