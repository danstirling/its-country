import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Music, Plus, Trash2, Pencil, ArrowLeft, Loader2, Play, Pause, Eye, Download } from "lucide-react";
import type { Artist, Song } from "@shared/schema";
import { useState, useRef } from "react";

const GENRES = ["Country", "Blues", "R&B", "Pop", "Rock", "Gospel", "Folk", "Bluegrass", "Jazz", "Other"];

export default function Songs() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  const { data: artist, isLoading: artistLoading } = useQuery<Artist>({
    queryKey: ["/api/artists", slug],
  });

  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/artists", artist?.id?.toString(), "songs"],
    enabled: !!artist?.id,
    queryFn: async () => {
      const res = await fetch(`/api/artists/${artist!.id}/songs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch songs");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/songs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artist?.id?.toString(), "songs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song removed" });
    },
  });

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isLoading = artistLoading || songsLoading;
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/artists">
          <Button variant="ghost" className="mb-6" data-testid="button-back-artists">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Songwriters
          </Button>
        </Link>

        {artistLoading ? (
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <Skeleton className="w-48 h-64 rounded-md flex-shrink-0" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-60" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : artist ? (
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <div className="w-48 h-64 rounded-md overflow-hidden flex-shrink-0">
              <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3" data-testid="text-artist-detail-name">
                {artist.name}
              </h1>
              <p className="text-muted-foreground leading-relaxed text-base">{artist.bio}</p>
            </div>
          </div>
        ) : null}

        <div className="border-t pt-8">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <h2 className="font-serif text-2xl font-bold" data-testid="text-songs-heading">Song Catalog</h2>
            {isAdmin && artist && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-song">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Song
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Add New Song</DialogTitle>
                  </DialogHeader>
                  <SongForm artistId={artist.id} onSuccess={() => setAddOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {user?.role !== "member" && (
            <div className="mb-8 p-4 bg-card border rounded-md text-sm text-muted-foreground">
              To request access to a song, email{" "}
              <a
                href="mailto:info@its-country.com"
                className="text-primary font-medium hover:underline"
                data-testid="link-purchase-email-songs"
              >
                info@its-country.com
              </a>
            </div>
          )}

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="aspect-square w-full rounded-t-md" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : songs && songs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map((song) => (
                <Card key={song.id} className="group flex flex-col" data-testid={`card-song-${song.id}`}>
                  <CardContent className="p-0 flex flex-col flex-1">
                    <div className="relative aspect-video overflow-hidden rounded-t-md">
                      {song.thumbnailUrl ? (
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Music className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      {isAdmin && (
                        <div className="absolute top-3 right-3 flex gap-2">
                          <Button size="icon" variant="secondary" onClick={() => setEditSong(song)} data-testid={`button-edit-song-${song.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => setSongToDelete(song)} data-testid={`button-delete-song-${song.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {song.status === "demo" && (
                        <span className="absolute top-3 left-3 text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-medium">Demo</span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-serif text-lg font-bold" data-testid={`text-song-title-${song.id}`}>{song.title}</h3>
                        {song.genre && <Badge variant="outline" className="text-xs shrink-0">{song.genre}</Badge>}
                      </div>
                      {song.releaseDate && <p className="text-xs text-muted-foreground mb-1">{song.releaseDate}</p>}
                      {song.description && <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2 flex-1">{song.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.viewCount ?? 0}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{song.downloadCount ?? 0}</span>
                      </div>

                      {playingSongId === song.id && song.audioUrl && (
                        <div className="mb-3">
                          <audio
                            src={song.audioUrl}
                            controls
                            autoPlay
                            className="w-full h-9"
                            data-testid={`audio-player-${song.id}`}
                          />
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {song.audioUrl ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setPlayingSongId(playingSongId === song.id ? null : song.id)}
                            data-testid={`button-stream-${song.id}`}
                          >
                            {playingSongId === song.id
                              ? <><Pause className="h-4 w-4 mr-1" />Stop</>
                              : <><Play className="h-4 w-4 mr-1" />Stream</>
                            }
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" className="flex-1" disabled data-testid={`button-stream-${song.id}`}>
                            <Music className="h-4 w-4 mr-1" />No Audio
                          </Button>
                        )}

                        {user?.role !== "member" && (
                          <a
                            href={`mailto:info@its-country.com?subject=${encodeURIComponent(`Purchase Inquiry: ${song.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'm interested in purchasing "${song.title}". Please send me more information.\n\nThank you!`)}`}
                            className="flex-1"
                            data-testid={`link-purchase-${song.id}`}
                          >
                            <Button size="sm" variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/5">
                              Request Access
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Music className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">No Songs Yet</h3>
              <p className="text-muted-foreground">This artist's catalog is being curated. Check back soon.</p>
            </div>
          )}
        </div>
      </div>

      {editSong && artist && (
        <Dialog open={!!editSong} onOpenChange={() => setEditSong(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Song</DialogTitle>
            </DialogHeader>
            <SongForm artistId={artist.id} song={editSong} onSuccess={() => setEditSong(null)} />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!songToDelete} onOpenChange={(open) => { if (!open) setSongToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this song?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{songToDelete?.title}</strong> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (songToDelete) { deleteMutation.mutate(songToDelete.id); setSongToDelete(null); } }}
              data-testid="button-confirm-delete-song"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Audio upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Audio upload failed — check your connection")));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

function SongForm({ artistId, song, onSuccess }: { artistId: number; song?: Song; onSuccess: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(song?.title || "");
  const [genre, setGenre] = useState(song?.genre || "");
  const [status, setStatus] = useState(song?.status || "active");
  const [releaseDate, setReleaseDate] = useState(song?.releaseDate || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(song?.thumbnailUrl || "");
  const [description, setDescription] = useState(song?.description || "");
  const [lyrics, setLyrics] = useState(song?.lyrics || "");
  const [ascapLyricWriter, setAscapLyricWriter] = useState(song?.ascapLyricWriter || "");
  const [ascapProductionName, setAscapProductionName] = useState(song?.ascapProductionName || "");
  const [songNotes, setSongNotes] = useState(song?.songNotes || "");
  const [mp4Url, setMp4Url] = useState(song?.mp4Url || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(song?.thumbnailUrl || null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState(song?.audioUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioProgress, setAudioProgress] = useState<number | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setAudioProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAudioProgress(null);
    try {
      let finalThumbnailUrl = thumbnailUrl;
      let finalAudioUrl = audioUrl;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch("/api/upload/image", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        finalThumbnailUrl = data.url;
      }

      if (audioFile) {
        const presignRes = await fetch("/api/upload/audio-presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mimeType: audioFile.type }),
          credentials: "include",
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, finalPath } = await presignRes.json();
        setAudioProgress(0);
        await uploadWithProgress(uploadUrl, audioFile, setAudioProgress);
        finalAudioUrl = finalPath;
      }

      const payload = {
        title, thumbnailUrl: finalThumbnailUrl, description: description || null,
        artistId, audioUrl: finalAudioUrl || null, mp4Url: mp4Url || null,
        lyrics: lyrics || null, genre: genre || null, status,
        releaseDate: releaseDate || null, ascapLyricWriter: ascapLyricWriter || null,
        ascapProductionName: ascapProductionName || null, songNotes: songNotes || null,
      };

      if (song) {
        await apiRequest("PATCH", `/api/songs/${song.id}`, payload);
      } else {
        await apiRequest("POST", "/api/songs", payload);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId.toString(), "songs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: song ? "Song updated" : "Song added" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Basic Info</p>

      <div className="space-y-2">
        <Label htmlFor="song-title">Song Name *</Label>
        <Input id="song-title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-song-title" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="song-genre">Type / Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger id="song-genre" data-testid="select-song-genre">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="song-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="song-status" data-testid="select-song-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="song-release-date">Release Date</Label>
        <Input id="song-release-date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="e.g. January 2025" data-testid="input-song-release-date" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Files</p>

      <div className="space-y-2">
        <Label htmlFor="song-thumbnail">Label Picture / Artwork</Label>
        {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-md border" />}
        <Input id="song-thumbnail" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" data-testid="input-song-thumbnail" />
        <p className="text-xs text-muted-foreground">Upload a JPG, PNG, or WebP image</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="song-audio">Audio File (MP3)</Label>
        {audioUrl && !audioFile && <p className="text-xs text-muted-foreground truncate">Current: {audioUrl}</p>}
        {audioFile && (
          <p className="text-xs text-green-600 font-medium">Selected: {audioFile.name} ({formatBytes(audioFile.size)})</p>
        )}
        {audioProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading audio…</span><span>{audioProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full transition-all duration-200" style={{ width: `${audioProgress}%` }} data-testid="audio-upload-progress" />
            </div>
          </div>
        )}
        <Input id="song-audio" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" onChange={handleAudioChange} className="cursor-pointer" data-testid="input-song-audio" disabled={isSubmitting} />
        <p className="text-xs text-muted-foreground">MP3 recommended — WAV and M4A also accepted (max 100MB)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="song-mp4-url">Video File URL (MP4)</Label>
        <Input id="song-mp4-url" value={mp4Url} onChange={(e) => setMp4Url(e.target.value)} placeholder="https://..." data-testid="input-song-mp4-url" />
        <p className="text-xs text-muted-foreground">Paste an external URL for the MP4 video file</p>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Content</p>

      <div className="space-y-2">
        <Label htmlFor="song-description">Description</Label>
        <Textarea id="song-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="input-song-description" disabled={isSubmitting} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="song-lyrics">Lyrics</Label>
        <Textarea id="song-lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={5} placeholder="Song lyrics..." data-testid="input-song-lyrics" disabled={isSubmitting} />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Rights & Credits</p>

      <div className="space-y-2">
        <Label htmlFor="song-ascap-lyric">ASCAP Lyric / Song Writer</Label>
        <Input id="song-ascap-lyric" value={ascapLyricWriter} onChange={(e) => setAscapLyricWriter(e.target.value)} data-testid="input-song-ascap-lyric" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="song-ascap-production">ASCAP Production Name</Label>
        <Input id="song-ascap-production" value={ascapProductionName} onChange={(e) => setAscapProductionName(e.target.value)} data-testid="input-song-ascap-production" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Admin Notes</p>

      <div className="space-y-2">
        <Label htmlFor="song-notes">Notes</Label>
        <Textarea id="song-notes" value={songNotes} onChange={(e) => setSongNotes(e.target.value)} rows={3} placeholder="Internal notes..." data-testid="input-song-notes" disabled={isSubmitting} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit-song">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isSubmitting
          ? audioProgress !== null && audioProgress < 100
            ? `Uploading audio… ${audioProgress}%`
            : "Saving…"
          : song ? "Update Song" : "Add Song"}
      </Button>
    </form>
  );
}
