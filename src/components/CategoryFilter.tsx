import type { Category } from "@/data/videos";

const categories: Array<"All" | "Popular Africa" | Category> = ["All", "Popular Africa", "Music", "Comedy", "Films", "Agasobanuye"];

export function CategoryFilter({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      {categories.map((c) => {
        const isActive = active === c;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "text-primary-foreground shadow-[var(--shadow-glow)]"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
            }`}
            style={isActive ? { background: "var(--gradient-brand)" } : undefined}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
