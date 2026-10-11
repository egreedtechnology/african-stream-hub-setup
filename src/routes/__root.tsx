import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { IBONA_KEYWORDS } from "@/lib/ibona-keywords";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const SITE_ORIGIN = "https://rebalive.egreedtech.org";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IBONA — Agasobanuye, Film Nyarwanda, Amakuru & African Music" },
      { name: "description", content: "IBONA (formerly Rebalive) — the #1 African-first streaming platform for agasobanuye, film nyarwanda, news shorts, comedy, and African music. Watch in Kinyarwanda, English, Swahili, and French. Free to stream and upload." },
      { name: "keywords", content: IBONA_KEYWORDS },
      { name: "author", content: "IBONA" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "google-site-verification", content: "" },
      { property: "og:site_name", content: "IBONA" },
      { property: "og:title", content: "IBONA — Agasobanuye, Film Nyarwanda & African Music" },
      { property: "og:description", content: "Stream agasobanuye, film nyarwanda, amakuru, comedy, and African music. The African-first streaming platform — IBONA (Rebalive)." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:locale", content: "rw_RW" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:locale:alternate", content: "sw_KE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IBONA — African-First Streaming" },
      { name: "twitter:description", content: "Agasobanuye, film nyarwanda, comedy, music and news shorts in Kinyarwanda, Swahili & English." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RZm7FI59fgbiqTq2M1TcARRKFye2/social-images/social-1777395773732-c3f0a703-0aac-47c4-9249-ebd4e1322db3.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RZm7FI59fgbiqTq2M1TcARRKFye2/social-images/social-1777395773732-c3f0a703-0aac-47c4-9249-ebd4e1322db3.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://buxlzcsvnrouezmsvald.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://buxlzcsvnrouezmsvald.supabase.co" },
      { rel: "preconnect", href: "https://storage.googleapis.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://storage.googleapis.com" },
      { rel: "alternate", hrefLang: "rw", href: SITE_ORIGIN },
      { rel: "alternate", hrefLang: "en", href: SITE_ORIGIN },
      { rel: "alternate", hrefLang: "sw", href: SITE_ORIGIN },
      { rel: "alternate", hrefLang: "x-default", href: SITE_ORIGIN },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "IBONA",
          alternateName: ["Rebalive", "Ibona Rwanda"],
          url: SITE_ORIGIN,
          inLanguage: ["rw", "en", "sw", "fr"],
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_ORIGIN}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "IBONA",
          alternateName: "Rebalive",
          url: SITE_ORIGIN,
          logo: `${SITE_ORIGIN}/favicon.ico`,
          sameAs: [],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </SettingsProvider>
    </AuthProvider>
  );
}
