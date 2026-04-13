import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Music, Search, Pencil, Trash2, Eye, Download, Loader2,
  ArrowLeft, RefreshCw, Shield, FileDown, FileUp, Plus,
} from "lucide-react";
import type { Artist, Song } from "@shared/schema";

type SongWithArtist = Song & { artist: Artist };

const SONG_GENRES = ["Blues", "Bluegrass", "Country", "Folk", "Gospel", "Jazz", "Other", "Pop", "R&B", "Rock"];

export default function AdminSongs() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongWithArtist | null>(null);
  const [deletingSong, setDeletingSong] = useState<SongWithArtist | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "superadmin" && user.role !== "admin" && user.role !== "subadmin"))) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const { data: songs = [], isLoading: songsLoading, refetch } = useQuery<SongWithArtist[]>({
    queryKey: ["/api/songs"],
    staleTime: 0,
    enabled: !authLoading && !!user && (user.role === "admin" || user.role === "superadmin" || user.role === "subadmin"),
  });

  const { data: artists = [] } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
    enabled: !authLoading && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/songs/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/songs"] });
      setDeletingSong(null);
      toast({ title: "Song deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  function exportCSV() {
    const CSV_COLS = [
      "Song Name",
      "File Name MP3",
      "File Name MP4",
      "File Lyrics",
      "Type",
      "Status",
      "Label Picture Image",
      "Artist Name",
      "Release Date",
      "ASCAP Lyric/Song Writer",
      "ASCAP Production Name",
      "Notes",
      "Number of Views",
      "Number of Downloads",
    ];

    const escape = (v: string | null | undefined) => {
      const s = v ?? "";
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = songs.map((s) => [
      s.title,
      s.audioUrl ?? "",
      s.mp4Url ?? "",
      s.lyrics ?? "",
      s.genre ?? "",
      s.status ?? "",
      s.thumbnailUrl ?? "",
      s.artist?.name ?? "",
      s.releaseDate ?? "",
      s.ascapLyricWriter ?? "",
      s.ascapProductionName ?? "",
      s.songNotes ?? "",
      String(s.viewCount ?? 0),
      String(s.downloadCount ?? 0),
    ].map(escape).join(","));

    const csv = [CSV_COLS.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `its-country-songs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.artist.name.toLowerCase().includes(q) || (s.genre ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesGenre = genreFilter === "all" || s.genre === genreFilter;
    return matchesSearch && matchesStatus && matchesGenre;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/60">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mr-2" data-testid="button-back-admin">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Admin
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">It's Country</p>
              <h1 className="font-serif text-2xl font-bold leading-none" data-testid="text-page-title">Song Database</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{songs.length} songs</span>
            <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-song">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Song
            </Button>
            <Link href="/admin?tab=import">
              <Button variant="outline" size="sm" data-testid="button-go-import">
                <FileUp className="h-3.5 w-3.5 mr-1.5" />
                Import CSV
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={songs.length === 0} data-testid="button-export-csv">
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, artist, or genre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-song-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-song-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Genre filter */}
        <div className="flex flex-wrap gap-2" data-testid="genre-filter-row-admin">
          <button
            onClick={() => setGenreFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${genreFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
            data-testid="genre-filter-admin-all"
          >
            All Genres
          </button>
          {SONG_GENRES.map((g) => {
            const count = songs.filter((s) => s.genre === g).length;
            return (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${genreFilter === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
                data-testid={`genre-filter-admin-${g.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                {g}{count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        {songsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Music className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">{search || statusFilter !== "all" || genreFilter !== "all" ? "No songs match your filters." : "No songs in the catalog yet."}</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filtered.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`row-song-${song.id}`}>
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                      {song.thumbnailUrl ? (
                        <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="h-5 w-5 text-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" data-testid={`text-song-title-${song.id}`}>{song.title}</span>
                        {song.status === "demo" && (
                          <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full font-medium">Demo</span>
                        )}
                        {song.status === "released" && (
                          <span className="text-xs bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5 rounded-full font-medium">Released</span>
                        )}
                        {song.genre && (
                          <Badge variant="outline" className="text-xs">{song.genre}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{song.artist.name}</span>
                        {song.releaseDate && <span className="text-xs text-muted-foreground">· {song.releaseDate}</span>}
                        <span className={`w-2 h-2 rounded-full ${song.audioUrl ? "bg-green-500" : "bg-muted-foreground/25"}`} title={song.audioUrl ? "Audio available" : "No audio file"} />
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.viewCount ?? 0}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{song.downloadCount ?? 0}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditingSong(song)} data-testid={`button-edit-${song.id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingSong(song)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-${song.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!editingSong} onOpenChange={(open) => { if (!open) setEditingSong(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Song</DialogTitle>
          </DialogHeader>
          {editingSong && (
            <SongEditForm
              song={editingSong}
              artists={artists}
              onSuccess={() => { setEditingSong(null); qc.invalidateQueries({ queryKey: ["/api/songs"] }); }}
              onCancel={() => setEditingSong(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSong} onOpenChange={(open) => { if (!open) setDeletingSong(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this song?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingSong?.title}</strong> will be permanently removed from the catalog. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deletingSong) deleteMutation.mutate(deletingSong.id); }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Song Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Add New Song</DialogTitle>
          </DialogHeader>
          <SongAddForm
            artists={artists}
            onSuccess={() => {
              setAddOpen(false);
              qc.invalidateQueries({ queryKey: ["/api/songs"] });
            }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); });
    xhr.addEventListener("load", () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload failed (${xhr.status})`)); });
    xhr.addEventListener("error", () => reject(new Error("Upload failed — check your connection")));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

function SongEditForm({ song, artists, onSuccess, onCancel }: {
  song: SongWithArtist;
  artists: Artist[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(song.title);
  const [artistId, setArtistId] = useState(String(song.artistId));
  const [genre, setGenre] = useState(song.genre || "none");
  const [status, setStatus] = useState(song.status || "active");
  const [releaseDate, setReleaseDate] = useState(song.releaseDate || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(song.thumbnailUrl || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(song.thumbnailUrl || null);
  const [audioUrl, setAudioUrl] = useState(song.audioUrl || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState<number | null>(null);
  const [mp4Url, setMp4Url] = useState(song.mp4Url || "");
  const [description, setDescription] = useState(song.description || "");
  const [lyrics, setLyrics] = useState(song.lyrics || "");
  const [ascapLyricWriter, setAscapLyricWriter] = useState(song.ascapLyricWriter || "");
  const [ascapProductionName, setAscapProductionName] = useState(song.ascapProductionName || "");
  const [songNotes, setSongNotes] = useState(song.songNotes || "");
  const [viewCount, setViewCount] = useState(String(song.viewCount ?? 0));
  const [downloadCount, setDownloadCount] = useState(String(song.downloadCount ?? 0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Song title is required", variant: "destructive" }); return; }
    setIsSubmitting(true);
    setAudioProgress(null);
    try {
      let finalThumbnailUrl = thumbnailUrl;
      let finalAudioUrl = audioUrl;

      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) throw new Error("Image upload failed");
        finalThumbnailUrl = (await res.json()).url;
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

      await apiRequest("PATCH", `/api/songs/${song.id}`, {
        title: title.trim(),
        artistId: parseInt(artistId),
        thumbnailUrl: finalThumbnailUrl || "",
        description: description || null,
        audioUrl: finalAudioUrl || null,
        mp4Url: mp4Url || null,
        lyrics: lyrics || null,
        genre: (genre && genre !== "none") ? genre : null,
        status,
        releaseDate: releaseDate || null,
        ascapLyricWriter: ascapLyricWriter || null,
        ascapProductionName: ascapProductionName || null,
        songNotes: songNotes || null,
        viewCount: parseInt(viewCount) || 0,
        downloadCount: parseInt(downloadCount) || 0,
      });
      toast({ title: "Song updated" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {imagePreview ? <img src={imagePreview} alt={title} className="w-full h-full object-cover" /> : <Music className="h-5 w-5 text-muted-foreground/40" />}
        </div>
        <div>
          <p className="font-semibold text-sm">{song.title}</p>
          <p className="text-xs text-muted-foreground">{song.artist.name} · ID #{song.id}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.viewCount} plays</span>
            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{song.downloadCount} downloads</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Basic Info</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-title">Song Title *</label>
        <Input id="song-title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-song-title" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-artist">Songwriter / Artist</label>
        <Select value={artistId} onValueChange={setArtistId}>
          <SelectTrigger id="song-artist" data-testid="select-song-artist">
            <SelectValue placeholder="Select artist" />
          </SelectTrigger>
          <SelectContent>
            {artists.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="song-genre">Type / Genre</label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger id="song-genre" data-testid="select-song-genre">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {SONG_GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="song-status">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="song-status" data-testid="select-song-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-release">Release Date</label>
        <Input id="song-release" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="e.g. January 2025" data-testid="input-song-release" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Files</p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Label Artwork</label>
        {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover rounded-md border" />}
        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="cursor-pointer" data-testid="input-song-image" />
        <Input placeholder="Or paste image URL" value={thumbnailUrl} onChange={(e) => { setThumbnailUrl(e.target.value); setImagePreview(e.target.value || null); setImageFile(null); }} className="text-xs" data-testid="input-song-image-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Audio File (MP3)</label>
        {audioUrl && !audioFile && <p className="text-xs text-muted-foreground truncate bg-muted px-2 py-1 rounded">Current: {audioUrl}</p>}
        {audioFile && <p className="text-xs text-green-600 font-medium">Selected: {audioFile.name} ({formatBytes(audioFile.size)})</p>}
        {audioProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Uploading…</span><span>{audioProgress}%</span></div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
            </div>
          </div>
        )}
        <Input type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setAudioProgress(null); }} className="cursor-pointer" disabled={isSubmitting} data-testid="input-song-audio" />
        <Input placeholder="Or paste audio URL" value={audioUrl} onChange={(e) => { setAudioUrl(e.target.value); setAudioFile(null); }} className="text-xs" data-testid="input-song-audio-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-mp4">Video URL (MP4)</label>
        <Input id="song-mp4" value={mp4Url} onChange={(e) => setMp4Url(e.target.value)} placeholder="https://…" data-testid="input-song-mp4" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Content</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-desc">Description</label>
        <Textarea id="song-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="input-song-desc" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-lyrics">Lyrics</label>
        <Textarea id="song-lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} placeholder="Song lyrics…" data-testid="input-song-lyrics" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Rights & Credits</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-ascap-lyric">ASCAP Lyric / Song Writer</label>
        <Input id="song-ascap-lyric" value={ascapLyricWriter} onChange={(e) => setAscapLyricWriter(e.target.value)} data-testid="input-song-ascap-lyric" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-ascap-prod">ASCAP Production Name</label>
        <Input id="song-ascap-prod" value={ascapProductionName} onChange={(e) => setAscapProductionName(e.target.value)} data-testid="input-song-ascap-prod" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Admin</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-notes">Internal Notes</label>
        <Textarea id="song-notes" value={songNotes} onChange={(e) => setSongNotes(e.target.value)} rows={3} placeholder="Notes visible only to admins…" data-testid="input-song-notes" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="song-views">View Count</label>
          <Input id="song-views" type="number" min="0" value={viewCount} onChange={(e) => setViewCount(e.target.value)} data-testid="input-song-views" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="song-downloads">Download Count</label>
          <Input id="song-downloads" type="number" min="0" value={downloadCount} onChange={(e) => setDownloadCount(e.target.value)} data-testid="input-song-downloads" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting} data-testid="button-save">
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{audioProgress !== null && audioProgress < 100 ? `Uploading… ${audioProgress}%` : "Saving…"}</>
            : "Save Changes"
          }
        </Button>
      </div>
    </form>
  );
}

const ADD_SONG_STORAGE_KEY = "its-country-add-song-last";

function loadLastSongEntry() {
  try {
    const raw = localStorage.getItem(ADD_SONG_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      artistId: string; genre: string; status: string; releaseDate: string;
      description: string; lyrics: string; ascapLyricWriter: string;
      ascapProductionName: string; songNotes: string;
    };
  } catch { return null; }
}

function saveLastSongEntry(data: {
  artistId: string; genre: string; status: string; releaseDate: string;
  description: string; lyrics: string; ascapLyricWriter: string;
  ascapProductionName: string; songNotes: string;
}) {
  try { localStorage.setItem(ADD_SONG_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function SongAddForm({ artists, onSuccess, onCancel }: {
  artists: Artist[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const last = loadLastSongEntry();

  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState(last?.artistId ?? (artists.length > 0 ? String(artists[0].id) : ""));
  const [genre, setGenre] = useState(last?.genre ?? "none");
  const [status, setStatus] = useState(last?.status ?? "active");
  const [releaseDate, setReleaseDate] = useState(last?.releaseDate ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState<number | null>(null);
  const [mp4Url, setMp4Url] = useState("");
  const [description, setDescription] = useState(last?.description ?? "");
  const [lyrics, setLyrics] = useState(last?.lyrics ?? "");
  const [ascapLyricWriter, setAscapLyricWriter] = useState(last?.ascapLyricWriter ?? "");
  const [ascapProductionName, setAscapProductionName] = useState(last?.ascapProductionName ?? "");
  const [songNotes, setSongNotes] = useState(last?.songNotes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Song title is required", variant: "destructive" }); return; }
    if (!artistId) { toast({ title: "Please select an artist", variant: "destructive" }); return; }
    setIsSubmitting(true);
    setAudioProgress(null);
    try {
      let finalThumbnailUrl = thumbnailUrl;
      let finalAudioUrl = audioUrl;

      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) throw new Error("Image upload failed");
        finalThumbnailUrl = (await res.json()).url;
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

      await apiRequest("POST", "/api/songs", {
        title: title.trim(),
        artistId: parseInt(artistId),
        thumbnailUrl: finalThumbnailUrl || "",
        description: description || null,
        audioUrl: finalAudioUrl || null,
        mp4Url: mp4Url || null,
        lyrics: lyrics || null,
        genre: (genre && genre !== "none") ? genre : null,
        status,
        releaseDate: releaseDate || null,
        ascapLyricWriter: ascapLyricWriter || null,
        ascapProductionName: ascapProductionName || null,
        songNotes: songNotes || null,
        viewCount: 0,
        downloadCount: 0,
      });
      saveLastSongEntry({ artistId, genre, status, releaseDate, description, lyrics, ascapLyricWriter, ascapProductionName, songNotes });
      toast({ title: "Song added successfully" });
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
        <label className="text-sm font-medium" htmlFor="add-song-title">Song Title *</label>
        <Input id="add-song-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter song title" required data-testid="input-add-song-title" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-artist">Songwriter / Artist *</label>
        <Select value={artistId} onValueChange={setArtistId}>
          <SelectTrigger id="add-song-artist" data-testid="select-add-song-artist">
            <SelectValue placeholder="Select artist" />
          </SelectTrigger>
          <SelectContent>
            {artists.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {artists.length === 0 && <p className="text-xs text-amber-600">No artists found. Add an artist first.</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="add-song-genre">Type / Genre</label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger id="add-song-genre" data-testid="select-add-song-genre">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {SONG_GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="add-song-status">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="add-song-status" data-testid="select-add-song-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-release">Release Date</label>
        <Input id="add-song-release" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="e.g. January 2025" data-testid="input-add-song-release" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Files</p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Label Artwork</label>
        {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover rounded-md border" />}
        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); setThumbnailUrl(""); } }} className="cursor-pointer" data-testid="input-add-song-image" />
        <Input placeholder="Or paste image URL" value={thumbnailUrl} onChange={(e) => { setThumbnailUrl(e.target.value); setImagePreview(e.target.value || null); setImageFile(null); }} className="text-xs" data-testid="input-add-song-image-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Audio File (MP3)</label>
        {audioFile && <p className="text-xs text-green-600 font-medium">Selected: {audioFile.name} ({formatBytes(audioFile.size)})</p>}
        {audioProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Uploading…</span><span>{audioProgress}%</span></div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
            </div>
          </div>
        )}
        <Input type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setAudioProgress(null); setAudioUrl(""); }} className="cursor-pointer" disabled={isSubmitting} data-testid="input-add-song-audio" />
        <Input placeholder="Or paste audio URL" value={audioUrl} onChange={(e) => { setAudioUrl(e.target.value); setAudioFile(null); }} className="text-xs" data-testid="input-add-song-audio-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-mp4">Video URL (MP4)</label>
        <Input id="add-song-mp4" value={mp4Url} onChange={(e) => setMp4Url(e.target.value)} placeholder="https://…" data-testid="input-add-song-mp4" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Content</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-desc">Description</label>
        <Textarea id="add-song-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description of the song…" data-testid="input-add-song-desc" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-lyrics">Lyrics</label>
        <Textarea id="add-song-lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} placeholder="Song lyrics…" data-testid="input-add-song-lyrics" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Rights & Credits</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-ascap-lyric">ASCAP Lyric / Song Writer</label>
        <Input id="add-song-ascap-lyric" value={ascapLyricWriter} onChange={(e) => setAscapLyricWriter(e.target.value)} data-testid="input-add-song-ascap-lyric" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-ascap-prod">ASCAP Production Name</label>
        <Input id="add-song-ascap-prod" value={ascapProductionName} onChange={(e) => setAscapProductionName(e.target.value)} data-testid="input-add-song-ascap-prod" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Admin Notes</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-song-notes">Internal Notes</label>
        <Textarea id="add-song-notes" value={songNotes} onChange={(e) => setSongNotes(e.target.value)} rows={3} placeholder="Notes visible only to admins…" data-testid="input-add-song-notes" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting} data-testid="button-add-cancel">
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting || artists.length === 0} data-testid="button-add-submit">
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{audioProgress !== null && audioProgress < 100 ? `Uploading… ${audioProgress}%` : "Saving…"}</>
            : <><Plus className="h-4 w-4 mr-2" />Add Song</>
          }
        </Button>
      </div>
    </form>
  );
}
