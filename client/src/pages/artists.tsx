import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Music, Plus, Trash2, Pencil, Loader2, Mic2, FileText, Users } from "lucide-react";
import type { Artist } from "@shared/schema";
import { useState } from "react";

const FEATURED_SLUG = "dan-stirling";

const CATEGORIES = [
  { value: "vocalist", label: "Vocalists", icon: Mic2, description: "Performers and lead vocalists" },
  { value: "lyrics", label: "Lyrics", icon: FileText, description: "Songwriters and lyricists" },
  { value: "band", label: "Bands", icon: Users, description: "Full bands and groups" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

function ArtistTeaser() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-md overflow-hidden border bg-card">
            <div className="aspect-[3/4] bg-muted" />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-9 bg-muted rounded w-full mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistCard({ artist, isAdmin, onEdit, onDelete }: {
  artist: Artist;
  isAdmin: boolean;
  onEdit: (a: Artist) => void;
  onDelete: (a: Artist) => void;
}) {
  return (
    <Card className="group transition-shadow duration-300 hover:shadow-lg" data-testid={`card-artist-${artist.id}`}>
      <CardContent className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-md">
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {isAdmin && (
            <div className="absolute top-3 right-3 flex gap-2">
              <Button size="icon" variant="secondary" onClick={() => onEdit(artist)} data-testid={`button-edit-artist-${artist.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => onDelete(artist)} data-testid={`button-delete-artist-${artist.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="p-6">
          <h3 className="font-serif text-xl font-bold mb-2" data-testid={`text-artist-name-${artist.id}`}>
            {artist.name}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">{artist.bio}</p>
          <Link href={`/artists/${artist.slug}/songs`}>
            <Button variant="secondary" className="w-full" data-testid={`link-artist-songs-${artist.id}`}>
              <Music className="h-4 w-4 mr-2" />
              View Songs
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Artists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const [artistToDelete, setArtistToDelete] = useState<Artist | null>(null);

  const { data: artists, isLoading } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/artists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      toast({ title: "Songwriter removed" });
    },
  });

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const featured = artists?.find((a) => a.slug === FEATURED_SLUG);

  const byCategory = (cat: Category) =>
    (artists ?? []).filter((a) => (a.category ?? "lyrics") === cat && a.slug !== FEATURED_SLUG);

  const hasAny = (cat: Category) => isLoading || byCategory(cat).length > 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[35vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/members-desert.webp" alt="Desert barn" className="w-full h-full object-cover" fetchPriority="high" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-3" data-testid="text-artists-title">
            Our Songwriters
          </h1>
          <p className="text-white/95 text-lg max-w-lg mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">
            We work with a select group of songwriters. Every song in our catalog is intentionally chosen.
          </p>
        </div>
      </section>

      {/* Admin controls */}
      {isAdmin && (
        <div className="bg-background px-4 pt-8">
          <div className="max-w-6xl mx-auto flex justify-end">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-artist">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Songwriter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif">Add New Songwriter</DialogTitle>
                </DialogHeader>
                <ArtistForm onSuccess={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Featured Songwriter */}
      {(isLoading || featured) && (
        <section className="pt-8 pb-16 px-4 bg-[hsl(35_35%_90%)]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-600 border border-amber-400/60 bg-amber-50 rounded-full px-3 py-1">
                <span>★</span> Featured Songwriter
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <Skeleton className="w-full md:w-80 h-[420px] rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-4 pt-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-44 mt-4" />
                </div>
              </div>
            ) : featured ? (
              <div
                className="flex flex-col md:flex-row gap-10 items-start bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
                data-testid={`card-artist-featured-${featured.id}`}
              >
                <div className="relative w-full md:w-80 flex-shrink-0">
                  <img
                    src={featured.imageUrl}
                    alt={featured.name}
                    className="w-full h-[360px] object-cover object-[70%_25%]"
                  />
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button size="icon" variant="secondary" onClick={() => setEditArtist(featured)} data-testid={`button-edit-artist-${featured.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => setArtistToDelete(featured)} data-testid={`button-delete-artist-${featured.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-8 md:py-12 md:pr-12">
                  <h2 className="font-serif text-3xl font-bold mb-4" data-testid={`text-artist-name-${featured.id}`}>
                    {featured.name}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8">{featured.bio}</p>
                  <Link href={`/artists/${featured.slug}/songs`}>
                    <Button data-testid={`link-artist-songs-${featured.id}`}>
                      <Music className="h-4 w-4 mr-2" />
                      Explore {featured.name.split(" ")[0]}'s Songs
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Three category sections */}
      {CATEGORIES.map(({ value, label, icon: Icon, description }, idx) => (
        hasAny(value) && (
          <section
            key={value}
            className={`py-16 px-4 ${idx % 2 === 0 ? "bg-background" : "bg-[hsl(35_35%_96%)]"}`}
            data-testid={`section-${value}`}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold leading-none">{label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-0">
                        <Skeleton className="h-80 w-full rounded-t-md" />
                        <div className="p-6 space-y-3">
                          <Skeleton className="h-6 w-40" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : byCategory(value).length === 0 ? (
                <div className="py-10 text-center border border-dashed rounded-xl border-border">
                  <Icon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No {label.toLowerCase()} added yet.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {byCategory(value).map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      isAdmin={isAdmin}
                      onEdit={setEditArtist}
                      onDelete={setArtistToDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      ))}

      {!isLoading && !artists?.length && (
        <section className="py-20 px-4 bg-background">
          <div className="text-center">
            <Music className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold mb-2">No Songwriters Yet</h3>
            <p className="text-muted-foreground">Songwriters will be added soon.</p>
          </div>
        </section>
      )}

      {editArtist && (
        <Dialog open={!!editArtist} onOpenChange={() => setEditArtist(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Artist</DialogTitle>
            </DialogHeader>
            <ArtistForm artist={editArtist} onSuccess={() => setEditArtist(null)} />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!artistToDelete} onOpenChange={(open) => { if (!open) setArtistToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this songwriter?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{artistToDelete?.name}</strong> and all of their songs will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (artistToDelete) { deleteMutation.mutate(artistToDelete.id); setArtistToDelete(null); } }}
              data-testid="button-confirm-delete-artist"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { ArtistTeaser };

function ArtistForm({ artist, onSuccess }: { artist?: Artist; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(artist?.name || "");
  const [imageUrl, setImageUrl] = useState(artist?.imageUrl || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(artist?.imageUrl || null);
  const [bio, setBio] = useState(artist?.bio || "");
  const [slug, setSlug] = useState(artist?.slug || "");
  const [category, setCategory] = useState<string>(artist?.category || "lyrics");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!artist) setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        finalImageUrl = data.url;
      }

      if (artist) {
        await apiRequest("PATCH", `/api/artists/${artist.id}`, { name, imageUrl: finalImageUrl, bio, slug, category });
      } else {
        await apiRequest("POST", "/api/artists", { name, imageUrl: finalImageUrl, bio, slug, category });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      toast({ title: artist ? "Songwriter updated" : "Songwriter added" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="artist-name">Name</Label>
        <Input id="artist-name" value={name} onChange={(e) => handleNameChange(e.target.value)} required data-testid="input-artist-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-slug">Slug</Label>
        <Input id="artist-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required data-testid="input-artist-slug" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="artist-category" data-testid="select-artist-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vocalist">Vocalist</SelectItem>
            <SelectItem value="lyrics">Lyrics / Songwriter</SelectItem>
            <SelectItem value="band">Band</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-image">Photo</Label>
        {imagePreview && (
          <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md border" />
        )}
        <Input
          id="artist-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="cursor-pointer"
          data-testid="input-artist-image"
          required={!artist}
        />
        <p className="text-xs text-muted-foreground">Upload a JPG, PNG, or WebP image</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-bio">Bio</Label>
        <Textarea id="artist-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} required data-testid="input-artist-bio" />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit-artist">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {artist ? "Update Songwriter" : "Add Songwriter"}
      </Button>
    </form>
  );
}
