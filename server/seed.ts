import { storage } from "./storage";
import { db } from "./db";
import { songs } from "@shared/schema";

async function migrateImageUrlsToWebp() {
  await db.execute(
    `UPDATE songs SET thumbnail_url = REPLACE(thumbnail_url, '.png', '.webp') WHERE thumbnail_url LIKE '%.png'` as any
  );
  await db.execute(
    `UPDATE artists SET image_url = REPLACE(image_url, '.png', '.webp') WHERE image_url LIKE '%.png'` as any
  );
}

const danSongs = [
  { title: "Analee Blues", thumbnailUrl: "/images/song-analee-blues.webp", description: "A slow-burning blues that aches with longing, built around a name that never quite leaves your lips.", audioUrl: "/audio/Analee_Blues.mp3" },
  { title: "Annalie", thumbnailUrl: "/images/song-2.webp", description: "A tender country ballad about a woman whose memory lingers long after the dust has settled.", audioUrl: "/audio/Annalie.mp3" },
  { title: "Attitude", thumbnailUrl: "/images/song-attitude.webp", description: "A feisty, foot-stomping number with a twang and a smirk — for the ones who walk in like they own the room.", audioUrl: "/audio/Attitude.mp3" },
  { title: "Ava", thumbnailUrl: "/images/song-ava.webp", description: "Sweet and haunting, a portrait of a woman caught between where she's from and where she's going.", audioUrl: "/audio/Ava.mp3" },
  { title: "Awakening", thumbnailUrl: "/images/song-awakening.webp", description: "A sweeping anthem about finding your voice after years of silence — wide skies and wide open hearts.", audioUrl: "/audio/Awakening.mp3" },
  { title: "Calista (Country)", thumbnailUrl: "/images/song-calista-country.webp", description: "The country version of a song about a free spirit chasing something she can't quite name — red dirt and open highway.", audioUrl: "/audio/Calista_Country.mp3" },
  { title: "Calista (R&B)", thumbnailUrl: "/images/song-calista-rnb.webp", description: "A smoother, soulful take on the same restless story — same woman, different Friday night.", audioUrl: "/audio/Calista_RnB.mp3" },
  { title: "Cowgirl", thumbnailUrl: "/images/song-cowgirl.webp", description: "A celebration of the women who ride hard and love harder — boots in the stirrups, wind at their back.", audioUrl: "/audio/Cowgirl.mp3" },
  { title: "Cowgirl (Romantic)", thumbnailUrl: "/images/song-cowgirl-romantic.webp", description: "A softer, more intimate side of the same cowgirl spirit — firelight, slow dances, and desert starlight.", audioUrl: "/audio/Cowgirl_Romantic.mp3" },
  { title: "Follow Me", thumbnailUrl: "/images/song-follow-me.webp", description: "An invitation wrapped in a melody — bold, warm, and impossible to turn down.", audioUrl: "/audio/Follow_Me.mp3" },
  { title: "Hope", thumbnailUrl: "/images/song-hope.webp", description: "A quiet, powerful song about holding on when the road gets long and the nights get cold.", audioUrl: "/audio/Hope.mp3" },
  { title: "I Talked With You Today", thumbnailUrl: "/images/song-i-talked-with-you-today.webp", description: "A conversation-as-song — grief, connection, and the strange comfort of speaking to someone no longer there.", audioUrl: "/audio/I_Talked_With_You_Today.mp3" },
  { title: "Isabella", thumbnailUrl: "/images/song-isabella.webp", description: "A lush, story-driven ballad about a woman who left a small town and the man who never stopped looking for her.", audioUrl: "/audio/Isabella.mp3" },
  { title: "Isabelle Blues", thumbnailUrl: "/images/song-isabelle-blues.webp", description: "The blues side of the same story — low and slow, the kind that settles in your chest.", audioUrl: "/audio/Isabelle_Blues.mp3" },
  { title: "My Life", thumbnailUrl: "/images/song-my-life.webp", description: "A bold declaration of self — imperfect, unapologetic, and every bit country.", audioUrl: "/audio/My_Life.mp3" },
  { title: "Promises", thumbnailUrl: "/images/song-promises.webp", description: "A song about the words we mean when we say them and how hard they are to keep when the road gets rough.", audioUrl: "/audio/Promises.mp3" },
  { title: "Right Time", thumbnailUrl: "/images/song-right-time.webp", description: "A reminder that some things — and some people — are worth waiting for, no matter how long it takes.", audioUrl: "/audio/Right_Time.mp3" },
  { title: "Stand By Me", thumbnailUrl: "/images/song-stand-by-me.webp", description: "Not a cover — a plea. Raw, country, and built for the moment someone needs to hear it most.", audioUrl: "/audio/Stand_By_Me.mp3" },
  { title: "Today", thumbnailUrl: "/images/song-today.webp", description: "A song about choosing to show up, every morning, no matter what yesterday left behind.", audioUrl: "/audio/Today.mp3" },
  { title: "Travelingman Blues", thumbnailUrl: "/images/song-traveling-man-blues.webp", description: "A road-worn blues about a man who can't stop moving and isn't sure he wants to.", audioUrl: "/audio/Travelingman_Blues.mp3" },
  { title: "Travelingman (Standard)", thumbnailUrl: "/images/song-travelingman-standard.webp", description: "The standard cut of the traveling man's story — cleaner, country-radio ready, still full of miles.", audioUrl: "/audio/Travelingman_Standard.mp3" },
];

export async function seedDatabase() {
  const existingArtists = await storage.getAllArtists();

  let danStirling = existingArtists.find((a) => a.slug === "dan-stirling");

  if (!danStirling) {
    danStirling = await storage.createArtist({
      name: "Dan Stirling",
      imageUrl: "/images/dan-stirling.webp",
      bio: "Texas-based songwriter blending red dirt authenticity with timeless storytelling. From open-road anthems to stripped-down ballads, every track is crafted for artists ready to bring it to life.",
      slug: "dan-stirling",
    });
  }

  const existingSongs = await db.select({ title: songs.title }).from(songs);
  const existingTitles = new Set(existingSongs.map((s: any) => s.title));

  for (const song of danSongs) {
    if (!existingTitles.has(song.title)) {
      await storage.createSong({ ...song, artistId: danStirling.id });
    }
  }

  await migrateImageUrlsToWebp();
}
