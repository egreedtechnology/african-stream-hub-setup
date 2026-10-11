import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { TitleDetail } from "@/components/TitleDetail";
import { fetchVideoBySlug } from "@/lib/videos-api";
import { buildTitleHead } from "@/lib/title-route";

export const Route = createFileRoute("/documentary/$slug")({
  loader: async ({ params }) => {
    const v = await fetchVideoBySlug(params.slug);
    if (!v) throw notFound();
    return { video: v };
  },
  head: ({ loaderData, params }) => buildTitleHead(loaderData?.video, "documentary", params.slug),
  errorComponent: ({ error }) => <AppLayout><div className="py-20 text-center text-muted-foreground">{error.message}</div></AppLayout>,
  notFoundComponent: () => (
    <AppLayout>
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Documentary not found</h2>
        <Link to="/" className="text-primary underline">Back home</Link>
      </div>
    </AppLayout>
  ),
  component: DocPage,
});

function DocPage() {
  const { video } = Route.useLoaderData();
  return <TitleDetail video={video} />;
}
