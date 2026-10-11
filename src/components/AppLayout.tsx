import { ReactNode, useState } from "react";
import { AppSidebar, MobileBottomNav } from "./Sidebar";
import { Bell, Wifi, WifiOff, LogOut, User, LayoutDashboard, Upload as UploadIcon, Settings as SettingsIcon } from "lucide-react";
import { IbonaLogo } from "./IbonaLogo";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { lowData, setLowData, slowConnection } = useSettings();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
          <Link to="/" className="lg:hidden">
            <IbonaLogo />
          </Link>
          <div className="flex flex-1 max-w-xl mx-auto">
            <SearchAutocomplete />
          </div>

          {/* Low-data toggle */}
          <button
            onClick={() => setLowData(!lowData)}
            title={lowData ? "Low-data mode ON" : "Low-data mode OFF"}
            className={`hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
              lowData
                ? "border-secondary/50 bg-secondary/15 text-secondary"
                : "border-border bg-surface hover:bg-surface-elevated text-muted-foreground"
            }`}
          >
            {lowData ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
            {lowData ? "Low-data" : "Data saver"}
            {slowConnection && !lowData && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />}
          </button>

          <button className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface-elevated transition" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="h-9 w-9 rounded-full ring-2 ring-primary/40 bg-cover bg-center"
                style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : { background: "var(--gradient-brand)" }}
                aria-label="Account menu"
              />
              {menu && (
                <>
                  <button
                    aria-hidden
                    onClick={() => setMenu(false)}
                    className="fixed inset-0 z-40 cursor-default"
                    tabIndex={-1}
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-border bg-popover shadow-[var(--shadow-elegant)] p-2 animate-scale-in">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <div className="text-sm font-bold truncate">{profile?.display_name || profile?.username || "User"}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <MenuItem to="/studio" icon={LayoutDashboard} onClick={() => setMenu(false)}>Creator Studio</MenuItem>
                    <MenuItem to="/upload" icon={UploadIcon} onClick={() => setMenu(false)}>Upload video</MenuItem>
                    <MenuItem to="/profile" icon={User} onClick={() => setMenu(false)}>My profile</MenuItem>
                    <MenuItem to="/settings" icon={SettingsIcon} onClick={() => setMenu(false)}>Settings</MenuItem>
                    <button
                      onClick={async () => { setMenu(false); await signOut(); navigate({ to: "/" }); }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              search={{ redirect: "/", mode: "login" }}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-full px-4 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-brand)" }}
            >
              Sign in
            </Link>
          )}
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

function MenuItem({ to, icon: Icon, children, onClick }: { to: "/studio" | "/upload" | "/profile" | "/settings"; icon: typeof User; children: ReactNode; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-elevated transition"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
