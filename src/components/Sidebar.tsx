import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Music2, Film, TrendingUp, Upload, User, Play, LayoutDashboard, Settings } from "lucide-react";
import { IbonaLogo } from "./IbonaLogo";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shorts", label: "Shorts", icon: Play },
  { to: "/music", label: "Music", icon: Music2 },
  { to: "/movies", label: "Movies", icon: Film },
  { to: "/trending", label: "Trending", icon: TrendingUp },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/studio", label: "Creator Studio", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-60 shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-xl px-4 py-6">
      <Link to="/" className="px-2 mb-8">
        <IbonaLogo />
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.78_0.16_60/0.3)]"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""}`} />
              <span>{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl p-4 relative overflow-hidden border border-border" style={{ background: "var(--gradient-glow)" }}>
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Made in Africa</div>
        <p className="text-xs text-muted-foreground">Stream local stories. Share your voice.</p>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mobileItems: { to: "/" | "/shorts" | "/upload" | "/studio" | "/profile"; label: string; icon: typeof Home; primary?: boolean }[] = [
    { to: "/", label: "Home", icon: Home },
    { to: "/shorts", label: "Shorts", icon: Play },
    { to: "/upload", label: "Upload", icon: Upload, primary: true },
    { to: "/studio", label: "Studio", icon: LayoutDashboard },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ul className="flex items-end justify-around">
        {mobileItems.map(({ to, label, icon: Icon, primary }) => {
          const active = pathname === to;
          if (primary) {
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="flex h-12 w-12 -mt-4 items-center justify-center rounded-2xl text-background shadow-[var(--shadow-glow)]"
                  style={{ background: "var(--gradient-brand)" }}
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
