import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Play, Pause, Star, Eye } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Artist, Song } from "@shared/schema";

const SONG_GENRES = ["Blues", "Bluegrass", "Country", "Folk", "Gospel", "Jazz", "Other", "Pop", "R&B", "Rock"];

export function SongsCatalogTeaser() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-md overflow-hidden border bg-card">
            <div className="aspect-video bg-muted" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-muted rounded w-36" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-9 bg-muted rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SongWithArtist = Song & { artist: Artist };

function SongCard({
  song,
  canPurchase,
  playingSongId,
  onPlayToggle,
}: {
  song: SongWithArtist;
  canPurchase: boolean;
  playingSongId: number | null;
  onPlayToggle: (id: number) => void;
}) {
  const isPlaying = playingSongId === song.id;

  return (
    <Card className="group flex flex-col" data-testid={`card-song-catalog-${song.id}`}>
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="relative aspect-video overflow-hidden rounded-t-md">
          {song.thumbnailUrl ? (
            <img
              src={song.thumbnailUrl}
              alt={song.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Music className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          {song.status === "demo" && (
            <span className="absolute top-3 left-3 text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-medium">Demo</span>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="font-serif text-xl font-extrabold"
              data-testid={`text-song-catalog-title-${song.id}`}
            >
              {song.title}
            </h3>
            {song.genre && <span className="text-xs border border-border rounded-full px-2 py-0.5 text-muted-foreground shrink-0">{song.genre}</span>}
          </div>
          <Link href={`/artists/${song.artist.slug}/songs`}>
            <span className="text-primary text-sm font-medium hover:underline cursor-pointer mb-1 inline-block">
              {song.artist.name}
            </span>
          </Link>
          {song.releaseDate && <p className="text-xs text-muted-foreground mb-1">{song.releaseDate}</p>}
          {song.description && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2 flex-1">
              {song.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.viewCount ?? 0} plays</span>
          </div>

          {isPlaying && song.audioUrl && (
            <div className="mb-3">
              <audio
                src={song.audioUrl}
                controls
                autoPlay
                className="w-full h-9"
                data-testid={`audio-player-catalog-${song.id}`}
              />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {song.audioUrl ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-foreground/50 text-foreground font-semibold bg-foreground/8 hover:bg-foreground/15 hover:border-foreground/70 shadow-sm"
                onClick={() => onPlayToggle(song.id)}
                data-testid={`button-preview-catalog-${song.id}`}
              >
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-1" />Stop</>
                ) : (
                  <><Play className="h-4 w-4 mr-1" />Preview</>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled
                data-testid={`button-preview-catalog-${song.id}`}
              >
                <Music className="h-4 w-4 mr-1" />
                No Audio
              </Button>
            )}

            {canPurchase && (
              <a
                href={`mailto:info@its-country.com?subject=${encodeURIComponent(`Purchase Inquiry: ${song.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'm interested in purchasing "${song.title}". Please send me more information.\n\nThank you!`)}`}
                className="flex-1"
                data-testid={`link-purchase-catalog-${song.id}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/5"
                >
                  Request Access
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SongsCatalog() {
  const { user } = useAuth();
  const canPurchase = user?.role !== "member";
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [genreFilter, setGenreFilter] = useState("all");

  const { data: allSongs, isLoading } = useQuery<SongWithArtist[]>({
    queryKey: ["/api/songs"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const songs = allSongs ?? [];
  const filteredSongs = genreFilter === "all" ? songs : songs.filter((s) => s.genre === genreFilter);
  const featuredSong = filteredSongs[0] ?? null;
  const gridSongs = filteredSongs.slice(1);

  const handlePlayToggle = (id: number) => {
    setPlayingSongId(playingSongId === id ? null : id);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[35vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/desert-sound.webp"
            alt="Desert music landscape"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1
            className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-3"
            data-testid="text-songs-catalog-title"
          >
            Song Catalog
          </h1>
          <p className="text-white/95 text-lg max-w-xl mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">
            Curated, ready-to-record songs for artists and radio — access granted by approval only.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="max-w-6xl mx-auto">

          {/* Purchase info blurb */}
          {canPurchase && (
            <div className="mb-10 p-4 bg-card border rounded-md text-sm text-muted-foreground">
              To request access to a song, email{" "}
              <a
                href="mailto:info@its-country.com"
                className="text-primary font-medium hover:underline"
                data-testid="link-purchase-email"
              >
                info@its-country.com
              </a>
            </div>
          )}

          {/* Genre filter */}
          <div className="mb-10 flex flex-wrap gap-2" data-testid="genre-filter-row">
            <button
              onClick={() => setGenreFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${genreFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
              data-testid="genre-filter-all"
            >
              All
            </button>
            {SONG_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${genreFilter === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
                data-testid={`genre-filter-${g.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Featured Track */}
          {isLoading ? (
            <div className="mb-12">
              <Skeleton className="h-5 w-28 mb-8" />
              <div className="flex flex-col md:flex-row gap-0 rounded-xl overflow-hidden border shadow-lg">
                <Skeleton className="w-full md:w-[420px] h-[260px] flex-shrink-0 rounded-none" />
                <div className="flex-1 p-8 space-y-4">
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-36" />
                  </div>
                </div>
              </div>
            </div>
          ) : featuredSong ? (
            <div className="mb-12">
              <div className="mb-4">
                <h2 className="font-serif text-2xl font-bold mb-3">Featured This Week</h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-600 border border-amber-400/60 bg-amber-50 rounded-full px-3 py-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Featured Track
                </span>
              </div>
              <div
                className="flex flex-col md:flex-row rounded-xl overflow-hidden border shadow-xl bg-card"
                data-testid={`card-song-featured-${featuredSong.id}`}
              >
                <div className="relative w-full md:w-[420px] flex-shrink-0">
                  <img
                    src={featuredSong.thumbnailUrl}
                    alt={featuredSong.title}
                    className="w-full h-[220px] md:h-full object-cover"
                  />
                </div>

                <div className="flex-1 p-8 flex flex-col justify-center">
                  <h2
                    className="font-serif text-3xl font-bold mb-2"
                    data-testid={`text-song-featured-title-${featuredSong.id}`}
                  >
                    {featuredSong.title}
                  </h2>
                  <Link href={`/artists/${featuredSong.artist.slug}/songs`}>
                    <span className="text-primary text-sm font-medium hover:underline cursor-pointer mb-4 inline-block">
                      {featuredSong.artist.name}
                    </span>
                  </Link>
                  <p className="text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                    {featuredSong.description}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-foreground/50 mb-6">
                    Available for placement. Not yet recorded.
                  </p>

                  {playingSongId === featuredSong.id && featuredSong.audioUrl && (
                    <div className="mb-4">
                      <audio
                        src={featuredSong.audioUrl}
                        controls
                        autoPlay
                        className="w-full h-9"
                        data-testid={`audio-player-featured-${featuredSong.id}`}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {featuredSong.audioUrl && (
                      <Button
                        onClick={() => handlePlayToggle(featuredSong.id)}
                        variant="outline"
                        className="border-foreground/50 text-foreground font-semibold hover:bg-foreground/10 hover:border-foreground/70 shadow-sm"
                        data-testid={`button-preview-featured-${featuredSong.id}`}
                      >
                        {playingSongId === featuredSong.id ? (
                          <><Pause className="h-4 w-4 mr-2" />Stop Preview</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" />Preview Track</>
                        )}
                      </Button>
                    )}

                    {canPurchase && (
                      <a
                        href={`mailto:info@its-country.com?subject=${encodeURIComponent(`Purchase Inquiry: ${featuredSong.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'm interested in purchasing "${featuredSong.title}". Please send me more information.\n\nThank you!`)}`}
                        data-testid={`link-purchase-featured-${featuredSong.id}`}
                      >
                        <Button
                          variant="outline"
                          className="border-primary/40 text-primary hover:bg-primary/5 font-semibold"
                        >
                          Request Access
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Grid header */}
          {!isLoading && gridSongs.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 py-8 mb-0">
              <h2 className="font-serif text-2xl font-bold">More Songs</h2>
              <p className="text-sm text-muted-foreground italic">
                Some songs may be removed once placed or recorded.
              </p>
            </div>
          )}

          {/* Song grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="aspect-video w-full rounded-t-md" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-9 w-full mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : gridSongs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  canPurchase={canPurchase}
                  playingSongId={playingSongId}
                  onPlayToggle={handlePlayToggle}
                />
              ))}
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <Music className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              {songs.length === 0 ? (
                <>
                  <h3 className="font-serif text-xl font-semibold mb-2">No Songs Yet</h3>
                  <p className="text-muted-foreground">The catalog is being curated. Check back soon.</p>
                </>
              ) : (
                <>
                  <h3 className="font-serif text-xl font-semibold mb-2">No {genreFilter} songs yet</h3>
                  <p className="text-muted-foreground">No songs in this genre have been added to the catalog.</p>
                  <button onClick={() => setGenreFilter("all")} className="mt-4 text-sm text-primary hover:underline">View all genres</button>
                </>
              )}
            </div>
          ) : null}

        </div>
      </section>
    </div>
  );
}
