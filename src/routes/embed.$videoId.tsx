import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchVideoById } from "@/lib/videos-api";
import { classifyVideoSource } from "@/lib/video-embed";
import type { Video } from "@/types";

export const Route = createFileRoute("/embed/$videoId")({
  head: ({ params }) => ({
    meta: [
      { title: "IBONA Player" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: EmbedPage,
});

function EmbedPage() {
  const { videoId } = Route.useParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchVideoById(videoId).then((v) => {
      if (!cancelled) {
        setVideo(v);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white/50 text-sm">
        Loading player...
      </div>
    );
  }

  if (!video || !video.previewSrc) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white/70 text-sm">
        Video unavailable
      </div>
    );
  }

  const source = classifyVideoSource(video.previewSrc);

  if (source.kind === "iframe") {
    return (
      <iframe
        src={source.src}
        title={video.title}
        className="fixed inset-0 h-full w-full border-0 bg-black"
        allow={source.allow ?? "autoplay; encrypted-media; fullscreen"}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <video
      src={source.src}
      poster={video.thumbnail || video.posterUrl}
      controls
      playsInline
      className="fixed inset-0 h-full w-full bg-black object-contain"
    />
  );
}
