import heroMusic from "@/assets/hero-music.jpg";
import thumbComedy from "@/assets/thumb-comedy.jpg";
import thumbFilm from "@/assets/thumb-film.jpg";
import thumbFilm2 from "@/assets/thumb-film2.jpg";
import thumbMusic1 from "@/assets/thumb-music1.jpg";
import thumbMusic2 from "@/assets/thumb-music2.jpg";
import thumbAga from "@/assets/thumb-agasobanuye.jpg";
import thumbTrend from "@/assets/thumb-trending1.jpg";
import thumbRoar from "@/assets/thumb-roar.jpg";

export type Category = "Music" | "Comedy" | "Films" | "Agasobanuye";
export type Language = "Kinyarwanda" | "Swahili" | "English";

export interface Video {
  id: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  creatorId?: string;
  creatorUsername?: string;
  thumbnail: string;
  previewSrc?: string;
  views: string;
  viewsRaw?: number;
  duration: string;
  durationSeconds?: number;
  language: Language;
  category: Category;
  description: string;
  uploadedAt: string;
  createdAt?: string;
  mediaType?: "video" | "audio";
  visibility?: "public" | "private";
  slug?: string;
  originalTitle?: string;
  releaseYear?: number;
  countryCode?: string;
  director?: string;
  cast?: string[];
  genres?: string[];
  tags?: string[];
  imdbRating?: number;
  imdbId?: string;
  quality?: string;
  trailerUrl?: string;
  posterUrl?: string;
  backdropUrl?: string;
  movieType?: "movie" | "series" | "tv" | "anime" | "drama" | "documentary";
  episodeNumber?: number;
  seasonNumber?: number;
  seriesSlug?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isTopRated?: boolean;
  isEditorsChoice?: boolean;
  hasAgasobanuye?: boolean;
  interpreter?: string;
  partNumber?: number;
  totalParts?: number;
  kinyarwandaSynopsis?: string;
}

const SAMPLE_PREVIEW = "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4";

export const videos: Video[] = [
  {
    id: "v1",
    title: "Kigali Nights — Live from the Rooftop",
    creator: "Bruce Melodie",
    thumbnail: heroMusic,
    previewSrc: SAMPLE_PREVIEW,
    views: "2.4M",
    duration: "4:12",
    language: "Kinyarwanda",
    category: "Music",
    description: "An exclusive live performance from the heart of Kigali, blending afrobeats with traditional Rwandan rhythms.",
    uploadedAt: "3 days ago",
  },
  {
    id: "v2",
    title: "Agasobanuye: The Lion King — Episode 1",
    creator: "Junior Giti",
    thumbnail: thumbAga,
    previewSrc: SAMPLE_PREVIEW,
    views: "1.1M",
    duration: "12:48",
    language: "Kinyarwanda",
    category: "Agasobanuye",
    description: "The legendary storyteller returns with a fresh take on a classic.",
    uploadedAt: "1 week ago",
    hasAgasobanuye: true,
    interpreter: "Junior Giti",
  },
  {
    id: "v3",
    title: "Two Idiots in Town — Comedy Special",
    creator: "Rwanda Comedy Club",
    thumbnail: thumbComedy,
    previewSrc: SAMPLE_PREVIEW,
    views: "840K",
    duration: "23:41",
    language: "Kinyarwanda",
    category: "Comedy",
    description: "A sharp, funny take on life in Kigali and the stories everyone can relate to.",
    uploadedAt: "2 weeks ago",
  },
];

export const findMockCreator = (username: string) => {
  const list = videos.filter((v) => v.creatorUsername === username);
  if (!list.length) return null;
  return { username, display_name: list[0].creator, videos: list };
};
export const isPopularAfrica = (v: Video) => /Africa|Rwanda|Kenya|Nigeria|Uganda|Ghana|Kigali/i.test(v.title + " " + (v.description ?? ""));
export const getVideoById = (id: string) => videos.find((v) => v.id === id);
export const getTrending = () => videos.slice().sort((a, b) => parseFloat(b.views) - parseFloat(a.views));
