import { createFileRoute } from "@tanstack/react-router";
import { Play, Plus, Search, Bell, ChevronRight, Flame, Clapperboard, Music, Globe } from "lucide-react";

import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "African Stream Hub — African stories, streaming worldwide" },
      {
        name: "description",
        content:
          "African Stream Hub brings Nollywood hits, African cinema, music and documentaries to one streaming home.",
      },
      { property: "og:title", content: "African Stream Hub — African stories, streaming worldwide" },
      {
        property: "og:description",
        content:
          "African Stream Hub brings Nollywood hits, African cinema, music and documentaries to one streaming home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Title = {
  name: string;
  meta: string;
  tag?: string;
  gradient: string;
};

const trending: Title[] = [
  { name: "Lagos Nights", meta: "2026 · Drama · 2h 04m", tag: "New", gradient: "from-amber-500/80 via-orange-700/60 to-stone-950" },
  { name: "The River Between", meta: "2025 · Romance · 1h 48m", gradient: "from-teal-500/70 via-emerald-800/60 to-stone-950" },
  { name: "Anansi's Web", meta: "2026 · Fantasy · Series", tag: "Original", gradient: "from-violet-500/70 via-purple-900/60 to-stone-950" },
  { name: "Soweto Rising", meta: "2025 · Documentary · 1h 32m", gradient: "from-rose-500/70 via-red-900/60 to-stone-950" },
  { name: "Golden Stool", meta: "2026 · Epic · 2h 21m", gradient: "from-yellow-500/80 via-amber-800/60 to-stone-950" },
  { name: "Kijani", meta: "2025 · Thriller · Series", gradient: "from-lime-500/60 via-green-900/60 to-stone-950" },
];

const nollywood: Title[] = [
  { name: "Chief's Daughter", meta: "2026 · Comedy · 1h 55m", gradient: "from-fuchsia-500/70 via-pink-900/60 to-stone-950" },
  { name: "Omo Naija", meta: "2025 · Drama · 2h 10m", tag: "Top 10", gradient: "from-sky-500/70 via-blue-900/60 to-stone-950" },
  { name: "The Wedding Plan", meta: "2026 · Romance · 1h 40m", gradient: "from-orange-400/70 via-red-800/60 to-stone-950" },
  { name: "Jollof Wars", meta: "2025 · Comedy · 1h 38m", gradient: "from-amber-400/70 via-orange-900/60 to-stone-950" },
  { name: "Island of Kings", meta: "2026 · Action · 2h 05m", gradient: "from-cyan-500/70 via-teal-900/60 to-stone-950" },
  { name: "Mama's Prayer", meta: "2025 · Family · 1h 52m", gradient: "from-indigo-500/70 via-indigo-900/60 to-stone-950" },
];

const docs: Title[] = [
  { name: "Rhythms of the Sahel", meta: "2026 · Music · 58m", gradient: "from-emerald-400/70 via-teal-900/60 to-stone-950" },
  { name: "Great Zimbabwe", meta: "2025 · History · 1h 12m", gradient: "from-stone-400/70 via-stone-800/60 to-stone-950" },
  { name: "Afrobeats Nation", meta: "2026 · Music · Series", tag: "Original", gradient: "from-red-500/70 via-orange-900/60 to-stone-950" },
  { name: "The Sahara Crossing", meta: "2025 · Adventure · 1h 26m", gradient: "from-yellow-400/70 via-amber-900/60 to-stone-950" },
  { name: "Kingdoms of Gold", meta: "2026 · History · Series", gradient: "from-amber-500/70 via-yellow-900/60 to-stone-950" },
  { name: "Ocean Spirits", meta: "2025 · Nature · 49m", gradient: "from-blue-400/70 via-cyan-900/60 to-stone-950" },
];

const categories = [
  { icon: Clapperboard, label: "Nollywood" },
  { icon: Flame, label: "Trending" },
  { icon: Music, label: "Music & Concerts" },
  { icon: Globe, label: "Documentaries" },
];

function TitleCard({ title }: { title: Title }) {
  return (
    <button
      type="button"
      className="group relative w-44 shrink-0 overflow-hidden rounded-xl text-left transition-transform duration-300 hover:-translate-y-1.5 hover:scale-[1.03] sm:w-52"
    >
      <div className={`aspect-[2/3] bg-gradient-to-b ${title.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
        {title.tag ? (
          <span className="absolute left-2 top-2 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-950">
            {title.tag}
          </span>
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-stone-950 shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
        <p className="text-sm font-semibold text-white">{title.name}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{title.meta}</p>
      </div>
    </button>
  );
}

function Row({ heading, titles }: { heading: string; titles: Title[] }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between px-5 sm:px-10">
        <h2 className="text-lg font-bold text-white sm:text-xl">{heading}</h2>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
        >
          See all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto px-5 pb-2 sm:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {titles.map((t) => (
          <TitleCard key={t.name} title={t} />
        ))}
      </div>
    </section>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-5 py-4 sm:px-10">
          <div className="flex items-center gap-8">
            <span className="text-lg font-black tracking-tight text-white">
              African<span className="text-amber-400">Stream</span>Hub
            </span>
            <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
              {["Home", "Series", "Films", "Live", "My List"].map((item, i) => (
                <button
                  key={item}
                  type="button"
                  className={`transition-colors hover:text-white ${i === 0 ? "font-semibold text-white" : ""}`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Search" className="text-white/80 transition-colors hover:text-white">
              <Search className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Notifications" className="text-white/80 transition-colors hover:text-white">
              <Bell className="h-5 w-5" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-xs font-bold text-stone-950">
              AS
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-end">
        <img
          src={heroImage}
          alt="A rooftop cinema gathering over an African city at sunset"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-transparent" />
        <div className="relative z-10 max-w-2xl px-5 pb-20 pt-40 sm:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
            <Flame className="h-3.5 w-3.5" /> Featured Original
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Stories from the continent,{" "}
            <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">
              streamed to the world.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
            Nollywood blockbusters, award-winning cinema, live music and documentaries —
            the best of African storytelling in one home.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-amber-400/25 transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4 fill-current" /> Start Watching
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Plus className="h-4 w-4" /> My List
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-5 pt-4 sm:px-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white/85 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-white"
            >
              <Icon className="h-5 w-5 text-amber-400" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Rows */}
      <main className="pb-20">
        <Row heading="Trending Now" titles={trending} />
        <Row heading="Nollywood Favourites" titles={nollywood} />
        <Row heading="Documentaries & Music" titles={docs} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-10 sm:px-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <span className="text-lg font-black tracking-tight text-white">
            African<span className="text-amber-400">Stream</span>Hub
          </span>
          <p className="text-xs text-white/50">
            African stories, streaming worldwide. © 2026 African Stream Hub.
          </p>
        </div>
      </footer>
    </div>
  );
}
