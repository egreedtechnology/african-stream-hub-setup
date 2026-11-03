import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";

const BASE = "https://ibona.egreedtech.org";

export const Route = createFileRoute("/abasobanuzi")({
  head: () => {
    const desc =
      "Meet the abasobanuzi — the Rwandan voices behind agasobanuye films. Browse every interpreter and the movies they have brought to Kinyarwanda on IBONA.";
    const url = `${BASE}/abasobanuzi`;
    return {
      meta: [
        { title: "Abasobanuzi — Agasobanuye Interpreters & Dubbing Voices | IBONA" },
        { name: "description", content: desc },
        { property: "og:title", content: "Abasobanuzi — Agasobanuye Interpreters | IBONA" },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Abasobanuzi on IBONA",
          description: desc,
          url,
          isPartOf: { "@type": "WebSite", name: "IBONA", url: BASE },
        }),
      }],
    };
  },
  component: InterpretersLayout,
});

function InterpretersLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
