import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { TitleDetail } from "@/components/TitleDetail";
import { fetchVideoBySlug } from "@/lib/videos-api";
import { buildTitleHead } from "@/lib/title-route";

export const Route = createFileRoute("/movie/$slug")({
  loader: async ({ params }) => {
    const v = await fetchVideoBySlug(params.slug);
    if (!v) throw notFound();
    return { video: v };
  },
  head: ({ loaderData, params }) => buildTitleHead(loaderData?.video, "movie", params.slug),
  errorComponent: ({ error }) => <AppLayout><div className="py-20 text-center text-muted-foreground">{error.message}</div></AppLayout>,
  notFoundComponent: () => (
    <AppLayout>
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Movie not found</h2>
        <Link to="/movies" className="text-primary underline">Browse movies</Link>
      </div>
    </AppLayout>
  ),
  component: MoviePage,
});

function MoviePage() {
  const { video } = Route.useLoaderData();
  return <TitleDetail video={video} />;
}
