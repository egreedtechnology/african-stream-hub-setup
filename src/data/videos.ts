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
  previewSrc?: string; // muted mp4 preview
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
  // Extended movie/series metadata (all optional; empty on older rows)
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
}

// Royalty-free preview clip (small, public test)
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
  },
  {
    id: "v3",
    title: "Two Idiots in Town — Comedy Special",
    creator: "City Maid",
    thumbnail: thumbComedy,
    previewSrc: SAMPLE_PREVIEW,
    views: "890K",
    duration: "8:21",
    language: "Kinyarwanda",
    category: "Comedy",
    description: "Laugh-out-loud sketches from Kigali's funniest duo.",
    uploadedAt: "2 days ago",
  },
  {
    id: "v4",
    title: "Imana y'i Rwanda — Short Film",
    creator: "Kivu Films",
    thumbnail: thumbFilm,
    previewSrc: SAMPLE_PREVIEW,
    views: "540K",
    duration: "21:05",
    language: "Kinyarwanda",
    category: "Films",
    description: "An award-winning short film exploring identity and belonging.",
    uploadedAt: "5 days ago",
  },
  {
    id: "v5",
    title: "Afrobeats Carnival — Music Video",
    creator: "The Ben",
    thumbnail: thumbMusic1,
    previewSrc: SAMPLE_PREVIEW,
    views: "3.7M",
    duration: "3:48",
    language: "English",
    category: "Music",
    description: "Neon-lit, high-energy afrobeats anthem.",
    uploadedAt: "1 day ago",
  },
  {
    id: "v6",
    title: "Intore — Traditional Dance Live",
    creator: "Inganzo Ngari",
    thumbnail: thumbMusic2,
    previewSrc: SAMPLE_PREVIEW,
    views: "1.8M",
    duration: "6:30",
    language: "Kinyarwanda",
    category: "Music",
    description: "Centuries-old Rwandan dance reimagined for the stage.",
    uploadedAt: "4 days ago",
  },
  {
    id: "v7",
    title: "Kigali by Drone — Cinematic 4K",
    creator: "Visit Rwanda",
    thumbnail: thumbTrend,
    previewSrc: SAMPLE_PREVIEW,
    views: "920K",
    duration: "5:14",
    language: "English",
    category: "Films",
    description: "Soar over the City of a Thousand Hills.",
    uploadedAt: "6 days ago",
  },
  {
    id: "v8",
    title: "Boda Boda Diaries — Episode 4",
    creator: "Mtaa Stories",
    thumbnail: thumbFilm2,
    previewSrc: SAMPLE_PREVIEW,
    views: "410K",
    duration: "14:22",
    language: "Swahili",
    category: "Films",
    description: "A gripping urban drama from the streets of East Africa.",
    uploadedAt: "1 week ago",
  },
  {
    id: "v9",
    title: "Roar — Live Performance",
    creator: "Katy Perry",
    thumbnail: thumbRoar,
    previewSrc: "/seed/katy-perry-roar.mp4",
    views: "12M",
    duration: "3:44",
    language: "English",
    category: "Music",
    description: "An electrifying live performance of the global hit anthem.",
    uploadedAt: "2 days ago",
  },
  {
    id: "v10",
    title: "Roar — Acoustic Session",
    creator: "Katy Perry",
    thumbnail: thumbRoar,
    previewSrc: "/seed/katy-perry-roar-2.mp4",
    views: "8.3M",
    duration: "3:44",
    language: "English",
    category: "Music",
    description: "Stripped-back acoustic version of the empowering anthem.",
    uploadedAt: "5 days ago",
  },
  ...generateAfricanCatalog(),
];

// Generate 100+ popular African content items (humor, viral trends, scenic, music).
function generateAfricanCatalog(): Video[] {
  const thumbs = [thumbAga, thumbComedy, thumbFilm, thumbFilm2, thumbMusic1, thumbMusic2, thumbTrend, thumbRoar, heroMusic];
  const seeds: Array<{ title: string; creator: string; category: Category; language: Language; description: string }> = [
    // Comedy / viral humor
    { title: "Mama Otis vs. The Goat — Skit", creator: "Mama Otis", category: "Comedy", language: "Swahili", description: "The viral neighborhood skit Africa can't stop quoting." },
    { title: "Kansiime Anne: Office Wahala", creator: "Anne Kansiime", category: "Comedy", language: "English", description: "Uganda's queen of comedy roasts another Monday morning." },
    { title: "MC Mariachi — Boda Confessions", creator: "MC Mariachi", category: "Comedy", language: "Swahili", description: "Confessions from a Kampala boda boda rider." },
    { title: "Crazy Kennar — Estate Drama Ep. 12", creator: "Crazy Kennar", category: "Comedy", language: "Swahili", description: "Nairobi estate drama at its funniest." },
    { title: "Eric Omondi — Wife Material Recap", creator: "Eric Omondi", category: "Comedy", language: "English", description: "The continent's loudest love-game show recap." },
    { title: "Basketmouth Live in Lagos", creator: "Basketmouth", category: "Comedy", language: "English", description: "Stand-up gold from Lagos's biggest stage." },
    { title: "Ushbebe — Naija Roast Battle", creator: "Ushbebe", category: "Comedy", language: "English", description: "Nigerian comedians trade savage punchlines." },
    { title: "Mark Angel: Emanuella Strikes Again", creator: "Mark Angel Comedy", category: "Comedy", language: "English", description: "The viral kid star with another classic skit." },
    { title: "Seyi Law — Family Time Stories", creator: "Seyi Law", category: "Comedy", language: "English", description: "Hilarious tales from a Nigerian dad." },
    { title: "Trevor Noah — African Roots", creator: "Trevor Noah", category: "Comedy", language: "English", description: "Trevor's iconic stories about growing up in South Africa." },
    { title: "Loyiso Gola — Cape Town Crowdwork", creator: "Loyiso Gola", category: "Comedy", language: "English", description: "South African satire at its sharpest." },
    { title: "Bovi: African Magic Parody", creator: "Bovi", category: "Comedy", language: "English", description: "Nollywood, Bovi-style." },
    { title: "Akpororo Live — Lagos Laughs", creator: "Akpororo", category: "Comedy", language: "English", description: "Energy-packed comedy from Akpororo." },
    { title: "Churchill Show — Best of the Year", creator: "Churchill Show", category: "Comedy", language: "Swahili", description: "Kenya's longest-running comedy stage." },
    { title: "Eddie Butita — Trending TikTok Skits", creator: "Eddie Butita", category: "Comedy", language: "Swahili", description: "Viral TikTok-era skits compiled." },
    // Music
    { title: "Burna Boy — Live in Lagos", creator: "Burna Boy", category: "Music", language: "English", description: "Afro-fusion king lights up the Lagos stadium." },
    { title: "Wizkid — Essence (Live Session)", creator: "Wizkid", category: "Music", language: "English", description: "The afrobeats anthem that took over the world." },
    { title: "Davido — Unavailable Tour Highlights", creator: "Davido", category: "Music", language: "English", description: "Stadium-sized energy on the Unavailable tour." },
    { title: "Tems — Free Mind Acoustic", creator: "Tems", category: "Music", language: "English", description: "Stripped-back beauty from the Grammy-winning star." },
    { title: "Diamond Platnumz — Bongo Flava Live", creator: "Diamond Platnumz", category: "Music", language: "Swahili", description: "Bongo Flava's biggest export onstage in Dar." },
    { title: "Sauti Sol — Suzanna Acoustic", creator: "Sauti Sol", category: "Music", language: "Swahili", description: "Kenyan harmonies that defined a generation." },
    { title: "Bruce Melodie — Ikinya", creator: "Bruce Melodie", category: "Music", language: "Kinyarwanda", description: "Rwanda's afro-pop star drops a new visual." },
    { title: "The Ben — Ndagukunda Cyane", creator: "The Ben", category: "Music", language: "Kinyarwanda", description: "Kigali love anthem on full display." },
    { title: "Meddy — Slowly (Live Acoustic)", creator: "Meddy", category: "Music", language: "Kinyarwanda", description: "Velvet vocals from one of Rwanda's finest." },
    { title: "Black Coffee — Cape Town Sunset Set", creator: "Black Coffee", category: "Music", language: "English", description: "Deep house royalty mixes against the ocean." },
    { title: "Master KG — Jerusalema Reunion", creator: "Master KG", category: "Music", language: "English", description: "The dance that united the world, live again." },
    { title: "Nasty C — Zulu Man Cypher", creator: "Nasty C", category: "Music", language: "English", description: "South African hip-hop in its purest form." },
    { title: "Sho Madjozi — John Cena Carnival Mix", creator: "Sho Madjozi", category: "Music", language: "English", description: "Tsonga-pop chaos and color." },
    { title: "Yemi Alade — Johnny Reimagined", creator: "Yemi Alade", category: "Music", language: "English", description: "Afropop royalty revisits her biggest hit." },
    { title: "Tiwa Savage — Somebody's Son Live", creator: "Tiwa Savage", category: "Music", language: "English", description: "Tiwa onstage, undeniable." },
    { title: "Fally Ipupa — Rumba Live in Kinshasa", creator: "Fally Ipupa", category: "Music", language: "English", description: "Congolese rumba at its grandest." },
    { title: "Innoss'B — Yope Remix", creator: "Innoss'B", category: "Music", language: "English", description: "DRC dance anthem with continental flavor." },
    { title: "Rayvanny — Bongo Vibes", creator: "Rayvanny", category: "Music", language: "Swahili", description: "Tanzania nights, Rayvanny style." },
    { title: "Harmonize — Konde Boy Live", creator: "Harmonize", category: "Music", language: "Swahili", description: "Energy and choreography from Konde Boy." },
    { title: "Otile Brown — Romantic Acoustic", creator: "Otile Brown", category: "Music", language: "Swahili", description: "Smooth Kenyan R&B." },
    { title: "Nyashinski — Mungu Pekee Live", creator: "Nyashinski", category: "Music", language: "Swahili", description: "A Kenyan classic, live and timeless." },
    { title: "Jovial — Wivu", creator: "Jovial", category: "Music", language: "Swahili", description: "Bongo love song with a fresh edge." },
    { title: "Inganzo Ngari — Royal Drums of Rwanda", creator: "Inganzo Ngari", category: "Music", language: "Kinyarwanda", description: "Thunderous traditional drumming." },
    { title: "Knowless — Igisubizo", creator: "Knowless", category: "Music", language: "Kinyarwanda", description: "Rwanda's leading lady drops a powerful ballad." },
    { title: "Element Eleéeh — RnB Vibes", creator: "Element Eleéeh", category: "Music", language: "Kinyarwanda", description: "Late-night Kigali RnB session." },
    // Films / drama
    { title: "Country Queen — Trailer Breakdown", creator: "Country Queen", category: "Films", language: "English", description: "Kenya's hit Netflix series, decoded." },
    { title: "Anikulapo: Director's Cut Scenes", creator: "Kunle Afolayan", category: "Films", language: "English", description: "Behind Nollywood's spiritual epic." },
    { title: "King of Boys — Best Power Plays", creator: "EbonyLife", category: "Films", language: "English", description: "Eniola Salami's most ruthless moments." },
    { title: "Blood & Water — Cape Town Mystery", creator: "Netflix Naija", category: "Films", language: "English", description: "South African teen drama, bingeable cuts." },
    { title: "Queen Sono — Spy Kit Reveal", creator: "Pearl Thusi", category: "Films", language: "English", description: "Africa's first Netflix original, behind the scenes." },
    { title: "Lionheart — Family Business Recap", creator: "Genevieve Nnaji", category: "Films", language: "English", description: "Genevieve's directorial debut revisited." },
    { title: "The Wedding Party — Best Moments", creator: "EbonyLife Films", category: "Films", language: "English", description: "Nollywood's biggest rom-com highlights." },
    { title: "Imana y'i Rwanda — Behind the Scenes", creator: "Kivu Films", category: "Films", language: "Kinyarwanda", description: "Crafting an award-winning Rwandan short." },
    { title: "Boda Boda Diaries Ep. 5", creator: "Mtaa Stories", category: "Films", language: "Swahili", description: "Streets of East Africa, episode five." },
    { title: "Disco Matanga — Burial Beats Trailer", creator: "Mtaa Stories", category: "Films", language: "Swahili", description: "A Kenyan road-trip drama." },
    { title: "Sincerely Daisy — Director's Notes", creator: "Nick Mutuma", category: "Films", language: "English", description: "Kenyan coming-of-age in director's words." },
    { title: "Crime and Justice Lagos — Pilot", creator: "Showmax", category: "Films", language: "English", description: "Nigerian procedural drama opens its case." },
    { title: "The Black Book — Lagos Vigilante Cuts", creator: "Editi Effiong", category: "Films", language: "English", description: "Nollywood's action breakout." },
    // Agasobanuye (Kinyarwanda dubs)
    { title: "Agasobanuye: The Avengers — Full Movie Recap", creator: "Junior Giti", category: "Agasobanuye", language: "Kinyarwanda", description: "Marvel's biggest, narrated Rwandan-style." },
    { title: "Agasobanuye: Fast & Furious 9", creator: "Junior Giti", category: "Agasobanuye", language: "Kinyarwanda", description: "Family, NOS, and Junior Giti's signature humor." },
    { title: "Agasobanuye: John Wick 4", creator: "Junior Giti", category: "Agasobanuye", language: "Kinyarwanda", description: "Every headshot, narrated to perfection." },
    { title: "Agasobanuye: The Lion King Ep. 2", creator: "Junior Giti", category: "Agasobanuye", language: "Kinyarwanda", description: "Mufasa's saga continues." },
    { title: "Agasobanuye: Black Panther — Wakanda Forever", creator: "Sankara Films", category: "Agasobanuye", language: "Kinyarwanda", description: "Wakanda, narrated for the home crowd." },
    { title: "Agasobanuye: Squid Game Reaction", creator: "Sankara Films", category: "Agasobanuye", language: "Kinyarwanda", description: "Every game, every gasp." },
    { title: "Agasobanuye: Money Heist Final Heist", creator: "Sankara Films", category: "Agasobanuye", language: "Kinyarwanda", description: "Bella ciao, now in Kinyarwanda." },
    { title: "Agasobanuye: Spider-Man No Way Home", creator: "Junior Giti", category: "Agasobanuye", language: "Kinyarwanda", description: "All three Spideys, all the laughs." },
    // Scenic / travel
    { title: "Kigali by Drone — Sunset Cinematic", creator: "Visit Rwanda", category: "Films", language: "English", description: "The City of a Thousand Hills at golden hour." },
    { title: "Volcanoes National Park — Gorilla Trek", creator: "Visit Rwanda", category: "Films", language: "English", description: "Up-close with mountain gorillas." },
    { title: "Lake Kivu — Floating Sunsets", creator: "Visit Rwanda", category: "Films", language: "English", description: "Rwanda's inland sea in full glory." },
    { title: "Maasai Mara — Great Migration 4K", creator: "Magical Kenya", category: "Films", language: "English", description: "Two million wildebeest crossing the Mara." },
    { title: "Mount Kilimanjaro — Summit Sunrise", creator: "Tanzania Tourism", category: "Films", language: "English", description: "Africa's rooftop at dawn." },
    { title: "Zanzibar Stone Town — Drone Tour", creator: "Tanzania Tourism", category: "Films", language: "Swahili", description: "Spice Island streets from above." },
    { title: "Serengeti — Big Cat Diaries 4K", creator: "Tanzania Tourism", category: "Films", language: "English", description: "Lions, leopards, and the endless plains." },
    { title: "Victoria Falls — Smoke That Thunders", creator: "Visit Zimbabwe", category: "Films", language: "English", description: "Mosi-oa-Tunya in monsoon power." },
    { title: "Cape Town — Table Mountain Cinematic", creator: "South African Tourism", category: "Films", language: "English", description: "Where two oceans meet, in 4K." },
    { title: "Drakensberg — Hiking the Berg", creator: "South African Tourism", category: "Films", language: "English", description: "South Africa's dragon mountains." },
    { title: "Marrakech Souks — Color Walk", creator: "Visit Morocco", category: "Films", language: "English", description: "A walk through Marrakech in HDR." },
    { title: "Sahara Desert — Camel Caravan Sunset", creator: "Visit Morocco", category: "Films", language: "English", description: "Dunes, silence, and infinite sky." },
    { title: "Nile River — Aswan to Luxor", creator: "Visit Egypt", category: "Films", language: "English", description: "Floating along the world's longest river." },
    { title: "Pyramids of Giza — Drone Cinematic", creator: "Visit Egypt", category: "Films", language: "English", description: "Wonder of the world from a new angle." },
    { title: "Lagos Skyline — Night Drone Tour", creator: "Visit Nigeria", category: "Films", language: "English", description: "Africa's most electric megacity." },
    { title: "Lalibela — Rock-Hewn Churches", creator: "Visit Ethiopia", category: "Films", language: "English", description: "Ethiopia's 12th-century miracles." },
    { title: "Danakil Depression — Alien Landscapes", creator: "Visit Ethiopia", category: "Films", language: "English", description: "The hottest place on Earth, in color." },
    { title: "Okavango Delta — Wildlife from the Sky", creator: "Botswana Tourism", category: "Films", language: "English", description: "Africa's last great wetland." },
    { title: "Sossusvlei — Red Dunes of Namibia", creator: "Visit Namibia", category: "Films", language: "English", description: "Where the desert meets the sky." },
    { title: "Skeleton Coast — Atlantic Wilderness", creator: "Visit Namibia", category: "Films", language: "English", description: "Shipwrecks, seals, and silence." },
    { title: "Robben Island — History Walk", creator: "South African Tourism", category: "Films", language: "English", description: "Mandela's prison, in his own footsteps." },
    { title: "Akagera National Park — Big Five Safari", creator: "Visit Rwanda", category: "Films", language: "English", description: "Rwanda's safari secret revealed." },
    // Viral trends / dance
    { title: "Amapiano Log Drum Challenge", creator: "DBN Gogo", category: "Music", language: "English", description: "The South African sound that conquered TikTok." },
    { title: "Kupe Dance Challenge — Lagos Edition", creator: "Poco Lee", category: "Music", language: "English", description: "Naija's hottest dance trend." },
    { title: "Jerusalema Master Challenge — Best Edits", creator: "Master KG", category: "Music", language: "English", description: "Compilation of the world-shaking dance." },
    { title: "Buga Challenge — Africa United", creator: "Kizz Daniel", category: "Music", language: "English", description: "Buga lo lo lo — the world danced along." },
    { title: "Calm Down Challenge — Couples Edition", creator: "Rema", category: "Music", language: "English", description: "Rema and the world's biggest afrobeats hit." },
    { title: "Asake Joha — Stadium Singalong", creator: "Asake", category: "Music", language: "English", description: "The Mr Money With The Vibe takeover." },
    { title: "Tshwala Bam Dance Compilation", creator: "TitoM & Yuppe", category: "Music", language: "English", description: "Amapiano's newest viral wave." },
    { title: "Mnike Dance Challenge", creator: "Tyler ICU", category: "Music", language: "English", description: "Africa moves to Mnike." },
    { title: "Soweto Street Dance Battle 4K", creator: "SA Street Cypher", category: "Music", language: "English", description: "Pantsula meets gqom on the asphalt." },
    { title: "Eastlands Cypher — Nairobi Drill", creator: "Buruklyn Boyz", category: "Music", language: "Swahili", description: "Nairobi's drill scene goes raw." },
    { title: "Gengetone Live Mix — Boondocks Gang", creator: "Boondocks Gang", category: "Music", language: "Swahili", description: "Kenya's loudest sound, live." },
    // Extra films / stories
    { title: "Nairobi Half Life — Iconic Scenes", creator: "Tosh Gitonga", category: "Films", language: "Swahili", description: "Kenya's defining indie crime drama." },
    { title: "Supa Modo — Dream Big", creator: "Likarion Wainaina", category: "Films", language: "Swahili", description: "A young girl becomes her village's superhero." },
    { title: "Tsotsi — Joburg Streets Revisited", creator: "Gavin Hood", category: "Films", language: "English", description: "South Africa's Oscar-winning story." },
    { title: "Hotel Rwanda — Survivor Voices", creator: "Documentary Africa", category: "Films", language: "English", description: "Behind the story that moved the world." },
    { title: "Timbuktu — Sahel Cinema", creator: "Abderrahmane Sissako", category: "Films", language: "English", description: "Mali's haunting masterpiece." },
    { title: "Cuties of Kibera — Short Doc", creator: "Slum TV", category: "Films", language: "Swahili", description: "Joy and grit from Nairobi's biggest slum." },
    { title: "Mogadishu Skyline — Reborn", creator: "Visit Somalia", category: "Films", language: "English", description: "A capital's quiet renaissance." },
    { title: "Accra Beats — Hiplife to Afrobeats", creator: "Ghana Sound", category: "Music", language: "English", description: "Ghana's musical evolution explained." },
    { title: "Sarkodie — Adonai Live", creator: "Sarkodie", category: "Music", language: "English", description: "Ghana's rap king, live in Accra." },
    { title: "Stonebwoy — African Party Live", creator: "Stonebwoy", category: "Music", language: "English", description: "Afro-dancehall on its biggest stage." },
    { title: "Shatta Wale — Reggae Festival Set", creator: "Shatta Wale", category: "Music", language: "English", description: "Ghana's dancehall king takes over." },
  ];
  return seeds.map((s, i) => ({
    id: `afr-${i + 1}`,
    title: s.title,
    creator: s.creator,
    creatorUsername: slugifyCreator(s.creator),
    thumbnail: thumbs[i % thumbs.length],
    previewSrc: SAMPLE_PREVIEW,
    views: `${(0.2 + (i % 50) * 0.18).toFixed(1)}M`,
    duration: `${1 + (i % 12)}:${String(10 + (i * 7) % 50).padStart(2, "0")}`,
    language: s.language,
    category: s.category,
    description: s.description,
    uploadedAt: `${1 + (i % 30)} day${(i % 30) === 0 ? "" : "s"} ago`,
  }));
}

export function slugifyCreator(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** True for any seeded "Popular Africa" catalog item. */
export function isPopularAfrica(v: Video): boolean {
  return v.id.startsWith("afr-");
}

export const getVideoById = (id: string) => videos.find((v) => v.id === id);
export const getTrending = () => videos.slice().sort((a, b) => parseFloat(b.views) - parseFloat(a.views));

/** Find a mock "creator" by slug — used as a fallback when no DB profile exists. */
export function findMockCreator(username: string): { username: string; display_name: string; videos: Video[] } | null {
  const matches = videos.filter((v) => v.creatorUsername === username);
  if (matches.length === 0) return null;
  return { username, display_name: matches[0].creator, videos: matches };
}
