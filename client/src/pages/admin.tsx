import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield, CheckCircle, XCircle, Clock, Radio, Mic2,
  Trash2, Copy, Key, Users, AlertCircle, UserCheck,
  RefreshCw, Send, FileText, ChevronDown, ChevronUp, Music, Briefcase,
  Upload, FileSpreadsheet, FileDown, Search, Pencil, Eye, Download, Loader2,
  ShoppingCart, DollarSign, Tag, ToggleLeft, ToggleRight, Package,
} from "lucide-react";
import type { User, UpgradeCode, Artist, Song, SongListing, Purchase } from "@shared/schema";

type SafeUser = Omit<User, "password">;
type CodeWithUser = UpgradeCode & { forUsername?: string; usedByUsername?: string };
type SongWithArtist = Song & { artist: Artist };

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const defaultTab = new URLSearchParams(search).get("tab") || "requests";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [profileUser, setProfileUser] = useState<SafeUser | null>(null);
  const [codeDialog, setCodeDialog] = useState<{ userId: number; username: string } | null>(null);
  const [newCode, setNewCode] = useState<UpgradeCode | null>(null);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{ imported: number; errors: number; results: { row: number; title: string; status: string; message?: string }[] } | null>(null);

  const [songSearch, setSongSearch] = useState("");
  const [songStatusFilter, setSongStatusFilter] = useState("all");
  const [editingSong, setEditingSong] = useState<SongWithArtist | null>(null);
  const [deletingSong, setDeletingSong] = useState<SongWithArtist | null>(null);

  const [listingDialogSong, setListingDialogSong] = useState<SongWithArtist | null>(null);
  const [listingPersonal, setListingPersonal] = useState("");
  const [listingCommercial, setListingCommercial] = useState("");
  const [listingAvailable, setListingAvailable] = useState(false);
  const [listingNotes, setListingNotes] = useState("");

  const isSuperAdmin = !authLoading && !!user && user.role === "superadmin";
  const isAdmin = !authLoading && !!user && user.role === "admin";
  const isSubAdmin = !authLoading && !!user && user.role === "subadmin";
  const hasAdminAccess = isSuperAdmin || isAdmin || isSubAdmin;

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "superadmin" && user.role !== "admin" && user.role !== "subadmin"))) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const { data: allUsers = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 0,
    refetchInterval: hasAdminAccess ? 30000 : false,
    enabled: hasAdminAccess,
  });

  const { data: allCodes = [], isLoading: codesLoading, refetch: refetchCodes } = useQuery<UpgradeCode[]>({
    queryKey: ["/api/admin/upgrade-codes"],
    staleTime: 0,
    refetchInterval: isSuperAdmin ? 30000 : false,
    enabled: isSuperAdmin,
  });

  const { data: allSongs = [], isLoading: songsLoading, refetch: refetchSongs } = useQuery<SongWithArtist[]>({
    queryKey: ["/api/songs"],
    staleTime: 0,
    enabled: hasAdminAccess,
  });

  const { data: allArtists = [] } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
    enabled: hasAdminAccess,
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/songs/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/songs"] });
      setDeletingSong(null);
      toast({ title: "Song deleted" });
    },
  });

  const { data: storeListings = [], isLoading: listingsLoading, refetch: refetchListings } = useQuery<SongListing[]>({
    queryKey: ["/api/admin/store/listings"],
    staleTime: 0,
    enabled: hasAdminAccess,
  });

  const { data: storePurchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/admin/store/purchases"],
    staleTime: 0,
    enabled: hasAdminAccess,
  });

  const upsertListingMutation = useMutation({
    mutationFn: async (data: {
      songId: number;
      pricePersonalCents: number | null;
      priceCommercialCents: number | null;
      isAvailable: boolean;
      notes: string;
    }) => apiRequest("POST", "/api/admin/store/listings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/store/listings"] });
      setListingDialogSong(null);
      toast({ title: "Listing saved" });
    },
    onError: (err: any) => toast({ title: err.message || "Failed to save listing", variant: "destructive" }),
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/store/listings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/store/listings"] });
      toast({ title: "Listing removed" });
    },
    onError: (err: any) => toast({ title: err.message || "Failed to remove listing", variant: "destructive" }),
  });

  function openListingDialog(song: SongWithArtist) {
    const existing = storeListings.find((l) => l.songId === song.id);
    setListingPersonal(existing?.pricePersonalCents ? String(existing.pricePersonalCents / 100) : "");
    setListingCommercial(existing?.priceCommercialCents ? String(existing.priceCommercialCents / 100) : "");
    setListingAvailable(existing?.isAvailable ?? false);
    setListingNotes(existing?.notes ?? "");
    setListingDialogSong(song);
  }

  function submitListing(e: React.FormEvent) {
    e.preventDefault();
    if (!listingDialogSong) return;
    const personalCents = listingPersonal ? Math.round(parseFloat(listingPersonal) * 100) : null;
    const commercialCents = listingCommercial ? Math.round(parseFloat(listingCommercial) * 100) : null;
    upsertListingMutation.mutate({
      songId: listingDialogSong.id,
      pricePersonalCents: personalCents,
      priceCommercialCents: commercialCents,
      isAvailable: listingAvailable,
      notes: listingNotes,
    });
  }

  const handleRefresh = () => {
    refetchUsers();
    refetchCodes();
    toast({ title: "Refreshed" });
  };

  const pending = allUsers.filter((u) => u.status === "pending" && u.role !== "superadmin");
  const approved = allUsers.filter((u) => u.status === "approved" && u.role !== "superadmin");
  const rejected = allUsers.filter((u) => u.status === "rejected" && u.role !== "superadmin");

  const usernameMap = Object.fromEntries(allUsers.map((u) => [u.id, u.username]));

  const codesWithUsers: CodeWithUser[] = allCodes.map((c) => ({
    ...c,
    forUsername: c.createdFor ? usernameMap[c.createdFor] : undefined,
    usedByUsername: c.usedBy ? usernameMap[c.usedBy] : undefined,
  }));

  const codesForUser = (userId: number) =>
    codesWithUsers.filter((c) => c.createdFor === userId);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}/status`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Access level updated" });
    },
  });

  const approveWithRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/approve`, { role });
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (profileUser?.id === updated.id) setProfileUser(updated);
      toast({ title: `${updated.username} approved` });
    },
    onError: () => {
      toast({ title: "Could not approve user", description: "Please try again.", variant: "destructive" });
    },
  });

  const createCodeMutation = useMutation({
    mutationFn: async ({ role, createdFor }: { role: string; createdFor: number }) => {
      const res = await apiRequest("POST", "/api/admin/upgrade-codes", { role, createdFor });
      return res.json() as Promise<UpgradeCode>;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-codes"] });
      setCodeDialog(null);
      setNewCode(created);
      toast({ title: "Access code generated" });
    },
  });

  const deleteCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/upgrade-codes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-codes"] });
      toast({ title: "Code deleted" });
    },
  });

  const applyCodeMutation = useMutation({
    mutationFn: async ({ userId, code }: { userId: number; code: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/apply-code`, { code });
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-codes"] });
      if (profileUser?.id === updated.id) setProfileUser(updated);
      toast({ title: `${updated.username} upgraded to ${updated.role}` });
    },
    onError: (err: any) => {
      toast({ title: "Could not apply code", description: err.message, variant: "destructive" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/notes`, { notes });
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (profileUser?.id === updated.id) setProfileUser(updated);
      toast({ title: "Notes saved" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const handleApprove = (u: SafeUser) => {
    statusMutation.mutate({ id: u.id, status: "approved" });
    if (profileUser?.id === u.id) setProfileUser({ ...u, status: "approved" });
    toast({ title: `${u.username} approved` });
  };

  const handleReject = (u: SafeUser) => {
    statusMutation.mutate({ id: u.id, status: "rejected" });
    if (profileUser?.id === u.id) setProfileUser({ ...u, status: "rejected" });
    toast({ title: `${u.username} rejected` });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setProfileUser(null);
      toast({ title: "User deleted" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Could not delete user", variant: "destructive" });
    },
  });

  if (authLoading || !hasAdminAccess) return null;

  /* ── Limited view for admin and subadmin roles ── */
  if (isAdmin || isSubAdmin) {
    const activeMembers = approved.filter((u) => u.role !== "admin");

    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/60">
          <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">It's Country</p>
                <h1 className="font-serif text-2xl font-bold leading-none">Admin</h1>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => refetchUsers()}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <Tabs defaultValue="requests">
            <TabsList className="mb-6">
              <TabsTrigger value="requests" data-testid="tab-requests">
                <UserCheck className="h-4 w-4 mr-2" />
                Requests
                {pending.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
            </TabsList>

            {/* ── Requests tab ── */}
            <TabsContent value="requests" className="space-y-6">
              <Section icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />} title={`Pending Review${pending.length > 0 ? ` (${pending.length})` : ""}`}>
                {usersLoading ? <LoadingRows /> : pending.length === 0 ? (
                  <EmptyState message="No pending account requests right now." />
                ) : (
                  <div className="divide-y divide-border">
                    {pending.map((u) => (
                      <SubAdminRequestRow
                        key={u.id}
                        u={u}
                        onApprove={(id, role) => approveWithRoleMutation.mutate({ id, role })}
                        onReject={() => handleReject(u)}
                        isPending={approveWithRoleMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </Section>

              {rejected.length > 0 && (
                <Section icon={<XCircle className="h-4 w-4 text-destructive/70" />} title="Rejected Requests">
                  <div className="divide-y divide-border">
                    {rejected.map((u) => (
                      <SubAdminRequestRow
                        key={u.id}
                        u={u}
                        onApprove={(id, role) => approveWithRoleMutation.mutate({ id, role })}
                        isPending={approveWithRoleMutation.isPending}
                        isRejected
                      />
                    ))}
                  </div>
                </Section>
              )}
            </TabsContent>

            {/* ── Members tab ── */}
            <TabsContent value="members" className="space-y-6">
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-3xl font-serif font-bold text-primary">{activeMembers.length}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Active Members</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-3xl font-serif font-bold text-primary">
                    {activeMembers.filter((u) => u.role === "artist").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Artists</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-3xl font-serif font-bold text-primary">
                    {activeMembers.filter((u) => u.role === "radio" || u.role === "member").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Listeners / Radio</p>
                </div>
              </div>

              {/* Member list */}
              <Section icon={<Users className="h-4 w-4 text-primary/70" />} title={`All Members (${activeMembers.length})`}>
                {usersLoading ? <LoadingRows /> : activeMembers.length === 0 ? (
                  <EmptyState message="No active members yet." />
                ) : (
                  <div className="divide-y divide-border">
                    {activeMembers.map((u) => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => setProfileUser(u)}
                        data-testid={`row-member-${u.id}`}
                      >
                        <UserAvatar username={u.username} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{u.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {u.userType && <TypePill type={u.userType} />}
                          <RolePill role={u.role} small />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Section>
            </TabsContent>
          </Tabs>
        </div>

        {/* Listing edit dialog */}
        <Dialog open={!!listingDialogSong} onOpenChange={(open) => { if (!open) setListingDialogSong(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {listingDialogSong ? `${storeListings.find((l) => l.songId === listingDialogSong.id) ? "Edit" : "Add"} Listing` : "Listing"}
              </DialogTitle>
            </DialogHeader>
            {listingDialogSong && (
              <form onSubmit={submitListing} className="space-y-4">
                <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
                  <p className="font-medium">{listingDialogSong.title}</p>
                  <p className="text-xs text-muted-foreground">{listingDialogSong.artist.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="listing-personal">Personal License Price (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="listing-personal" type="number" min="0" step="0.01" placeholder="e.g. 49.99" value={listingPersonal} onChange={(e) => setListingPersonal(e.target.value)} className="pl-8" data-testid="input-listing-personal" />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to disable personal license sales.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="listing-commercial">Commercial License Price (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="listing-commercial" type="number" min="0" step="0.01" placeholder="e.g. 199.99" value={listingCommercial} onChange={(e) => setListingCommercial(e.target.value)} className="pl-8" data-testid="input-listing-commercial" />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to disable commercial license sales.</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Available for Sale</p>
                    <p className="text-xs text-muted-foreground">Show this song in the store</p>
                  </div>
                  <button type="button" onClick={() => setListingAvailable(!listingAvailable)} className="focus:outline-none" data-testid="toggle-listing-available">
                    {listingAvailable
                      ? <ToggleRight className="h-8 w-8 text-green-600" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="listing-notes">Notes (internal)</label>
                  <Input id="listing-notes" placeholder="Optional notes for this listing" value={listingNotes} onChange={(e) => setListingNotes(e.target.value)} data-testid="input-listing-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={upsertListingMutation.isPending} data-testid="button-save-listing">
                  {upsertListingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Listing
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Member profile dialog */}
        <Dialog open={!!profileUser} onOpenChange={(open) => { if (!open) setProfileUser(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Member Profile</DialogTitle>
            </DialogHeader>
            {profileUser && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <UserAvatar username={profileUser.username} size="lg" />
                  <div>
                    <p className="font-bold text-lg font-serif">{profileUser.username}</p>
                    <p className="text-sm text-muted-foreground">{profileUser.email}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Account Type</span>
                    <span className="text-sm font-medium">{profileUser.userType ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Access Level</span>
                    <RolePill role={profileUser.role} />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
                    <StatusPill status={profileUser.status} />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Marketing Emails</span>
                    <span className="text-sm">{profileUser.marketingConsent ? "Opted in" : "Not opted in"}</span>
                  </div>
                </div>
                <a
                  href={`mailto:${profileUser.email}?subject=It's Country — Message for ${profileUser.username}`}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm py-2.5 transition-colors"
                  data-testid={`button-email-member-${profileUser.id}`}
                >
                  <Send className="h-4 w-4" />
                  Email {profileUser.username}
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full" data-testid={`button-delete-member-${profileUser.id}`}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {profileUser.username}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the account for <strong>{profileUser.email}</strong>. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(profileUser.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Page header — warm branded strip */}
      <div className="border-b border-border bg-card/60">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">It's Country</p>
              <h1 className="font-serif text-2xl font-bold leading-none" data-testid="text-admin-title">Admin Dashboard</h1>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            label="Pending"
            value={pending.length}
            accent={pending.length > 0}
          />
          <StatCard
            icon={<UserCheck className="h-4 w-4 text-primary" />}
            label="Members"
            value={approved.length}
          />
          <StatCard
            icon={<XCircle className="h-4 w-4 text-destructive/70" />}
            label="Rejected"
            value={rejected.length}
          />
          <StatCard
            icon={<Key className="h-4 w-4 text-primary/70" />}
            label="Open Codes"
            value={allCodes.filter((c) => !c.usedBy).length}
          />
        </div>

        <Tabs defaultValue={defaultTab}>
          <div className="overflow-x-auto mb-6">
            <TabsList className="bg-card border border-border inline-flex w-max min-w-full">
              <TabsTrigger value="requests" data-testid="tab-pending" className="font-medium">
                Requests
                {pending.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 inline-flex items-center justify-center font-bold">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members" className="font-medium">Members</TabsTrigger>
              <TabsTrigger value="codes" data-testid="tab-codes" className="font-medium">Codes</TabsTrigger>
              <TabsTrigger value="songs" data-testid="tab-songs" className="font-medium">
                Songs
                {allSongs.length > 0 && <span className="ml-2 text-xs text-muted-foreground">({allSongs.length})</span>}
              </TabsTrigger>
              {isSuperAdmin && <TabsTrigger value="import" data-testid="tab-import" className="font-medium">Import</TabsTrigger>}
              <TabsTrigger value="export" data-testid="tab-export" className="font-medium">Export</TabsTrigger>
              <TabsTrigger value="store" data-testid="tab-store" className="font-medium">
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Store
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Account Requests ── */}
          <TabsContent value="requests" className="space-y-6">
            <Section
              icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              title="Pending Review"
            >
              {usersLoading ? <LoadingRows /> : pending.length === 0 ? (
                <EmptyState message="No pending account requests right now." />
              ) : (
                <div className="divide-y divide-border">
                  {pending.map((u) => (
                    <RequestRow
                      key={u.id}
                      u={u}
                      onView={() => setProfileUser(u)}
                      onApprove={(id, role) => approveWithRoleMutation.mutate({ id, role })}
                      onReject={() => handleReject(u)}
                      isPending={approveWithRoleMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </Section>

            {rejected.length > 0 && (
              <Section
                icon={<XCircle className="h-4 w-4 text-destructive/70" />}
                title="Rejected Accounts"
              >
                <div className="divide-y divide-border">
                  {rejected.map((u) => (
                    <RequestRow
                      key={u.id}
                      u={u}
                      onView={() => setProfileUser(u)}
                      onApprove={(id, role) => approveWithRoleMutation.mutate({ id, role })}
                      isPending={approveWithRoleMutation.isPending}
                      showRejectAsApprove
                    />
                  ))}
                </div>
              </Section>
            )}
          </TabsContent>

          {/* ── Members ── */}
          <TabsContent value="members">
            <Section
              icon={<Users className="h-4 w-4 text-primary" />}
              title="Approved Members"
            >
              {usersLoading ? <LoadingRows /> : approved.length === 0 ? (
                <EmptyState message="No approved members yet." />
              ) : (
                <div className="divide-y divide-border">
                  {approved.map((u) => {
                    const memberCodes = codesForUser(u.id);
                    const isExpanded = expandedMember === u.id;
                    return (
                      <div key={u.id} className="py-4 first:pt-0 last:pb-0" data-testid={`row-member-${u.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar username={u.username} size="sm" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold font-sans">{u.username}</span>
                                <RolePill role={u.role} />
                                {u.userType && <TypePill type={u.userType} />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => setProfileUser(u)} data-testid={`button-profile-${u.id}`}>
                              <FileText className="h-3.5 w-3.5 mr-1.5" />
                              Profile
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" data-testid={`button-delete-member-${u.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {u.username}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently deletes the account for <strong>{u.email}</strong>. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(u.id)}
                                    data-testid={`button-confirm-delete-member-${u.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <button
                              onClick={() => setExpandedMember(isExpanded ? null : u.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted"
                              data-testid={`button-expand-${u.id}`}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              {memberCodes.length} code{memberCodes.length !== 1 ? "s" : ""}
                            </button>
                          </div>
                        </div>

                        {isExpanded && memberCodes.length > 0 && (
                          <div className="mt-3 ml-12 space-y-2">
                            {memberCodes.map((c) => (
                              <InlineCodeRow key={c.id} code={c} onCopy={copyCode} onDelete={(id) => deleteCodeMutation.mutate(id)} />
                            ))}
                          </div>
                        )}
                        {isExpanded && memberCodes.length === 0 && (
                          <p className="mt-2 ml-12 text-xs text-muted-foreground italic">No codes on this profile yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* ── Access Codes ── */}
          <TabsContent value="codes">
            <Section
              icon={<Key className="h-4 w-4 text-primary" />}
              title="All Access Codes"
            >
              {codesLoading ? <LoadingRows /> : codesWithUsers.length === 0 ? (
                <EmptyState message="No access codes yet. Generate them from a member's profile." />
              ) : (
                <div className="divide-y divide-border">
                  {codesWithUsers.map((c) => (
                    <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid={`row-code-${c.id}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-base font-bold tracking-[0.2em]" data-testid={`text-code-${c.id}`}>{c.code}</span>
                          <RolePill role={c.role} />
                          {c.usedBy
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Redeemed</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Available</span>
                          }
                        </div>
                        <p className="text-xs text-muted-foreground space-x-3">
                          {c.forUsername && <span>For: <span className="text-foreground font-medium">{c.forUsername}</span></span>}
                          {c.usedByUsername && <span>Used by: <span className="text-foreground font-medium">{c.usedByUsername}</span></span>}
                          <span>Generated {new Date(c.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!c.usedBy && (
                          <Button size="sm" variant="secondary" onClick={() => copyCode(c.code)} data-testid={`button-copy-code-${c.id}`}>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" data-testid={`button-delete-code-${c.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this code?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes access code <strong>{c.code}</strong>. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteCodeMutation.mutate(c.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* ── Songs Database ── */}
          <TabsContent value="songs">
            <Section icon={<Music className="h-4 w-4 text-primary" />} title="Song Database">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, artist, or genre…"
                      value={songSearch}
                      onChange={(e) => setSongSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-song-search"
                    />
                  </div>
                  <Select value={songStatusFilter} onValueChange={setSongStatusFilter}>
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
                  <Button variant="outline" size="icon" onClick={() => refetchSongs()} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {songsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
                  </div>
                ) : (() => {
                  const filtered = allSongs.filter((s) => {
                    const q = songSearch.toLowerCase();
                    const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.artist.name.toLowerCase().includes(q) || (s.genre ?? "").toLowerCase().includes(q);
                    const matchesStatus = songStatusFilter === "all" || s.status === songStatusFilter;
                    return matchesSearch && matchesStatus;
                  });
                  if (filtered.length === 0) return <EmptyState message={songSearch || songStatusFilter !== "all" ? "No songs match your filters." : "No songs in the catalog yet."} />;
                  return (
                    <div className="border rounded-md overflow-hidden divide-y divide-border">
                      {filtered.map((song) => (
                        <div key={song.id} className="flex items-center gap-3 px-3 py-3 hover:bg-muted/40 transition-colors" data-testid={`row-song-${song.id}`}>
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                            {song.thumbnailUrl ? (
                              <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate" data-testid={`text-song-db-title-${song.id}`}>{song.title}</span>
                              {song.status === "demo" && <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full">Demo</span>}
                              {song.status === "released" && <span className="text-xs bg-green-100 text-green-800 border border-green-300 px-1.5 py-0.5 rounded-full">Released</span>}
                              {song.genre && <span className="text-xs border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">{song.genre}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist.name}{song.releaseDate ? ` · ${song.releaseDate}` : ""}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.viewCount}</span>
                            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{song.downloadCount}</span>
                            <span className={`w-2 h-2 rounded-full ${song.audioUrl ? "bg-green-500" : "bg-muted-foreground/30"}`} title={song.audioUrl ? "Audio available" : "No audio"} />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => setEditingSong(song)} data-testid={`button-edit-song-db-${song.id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingSong(song)} className="text-destructive hover:text-destructive hover:bg-destructive/10" data-testid={`button-delete-song-db-${song.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </Section>
          </TabsContent>

          {/* ── Export Songs ── */}
          <TabsContent value="export" className="space-y-6">
            <Section icon={<FileDown className="h-4 w-4 text-primary" />} title="Export Songs to CSV">
              <div className="space-y-4">
                <div className="bg-muted/50 border rounded-md p-4 text-sm space-y-2">
                  <p className="font-medium">The exported file will contain all {allSongs.length} songs with these columns:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs columns-2">
                    <li>Song Name</li>
                    <li>File Name MP3</li>
                    <li>File Name MP4</li>
                    <li>File Lyrics</li>
                    <li>Type</li>
                    <li>Status</li>
                    <li>Label Picture Image</li>
                    <li>Artist Name</li>
                    <li>Release Date</li>
                    <li>ASCAP Lyric/Song Writer</li>
                    <li>ASCAP Production Name</li>
                    <li>Notes</li>
                    <li>Number of Views</li>
                    <li>Number of Downloads</li>
                  </ol>
                  <p className="text-xs text-muted-foreground pt-1">The file can be re-imported using the Import tab after making edits.</p>
                </div>
                <Button
                  onClick={() => {
                    const CSV_COLS = [
                      "Song Name", "File Name MP3", "File Name MP4", "File Lyrics",
                      "Type", "Status", "Label Picture Image", "Artist Name", "Release Date",
                      "ASCAP Lyric/Song Writer", "ASCAP Production Name", "Notes",
                      "Number of Views", "Number of Downloads",
                    ];
                    const esc = (v: string | null | undefined) => {
                      const s = v ?? "";
                      return (s.includes(",") || s.includes('"') || s.includes("\n"))
                        ? `"${s.replace(/"/g, '""')}"` : s;
                    };
                    const rows = allSongs.map((s) => [
                      s.title, s.audioUrl ?? "", s.mp4Url ?? "", s.lyrics ?? "",
                      s.genre ?? "", s.status ?? "", s.thumbnailUrl ?? "",
                      (s as any).artist?.name ?? "", s.releaseDate ?? "",
                      s.ascapLyricWriter ?? "", s.ascapProductionName ?? "", s.songNotes ?? "",
                      String(s.viewCount ?? 0), String(s.downloadCount ?? 0),
                    ].map(esc).join(","));
                    const csv = [CSV_COLS.join(","), ...rows].join("\r\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `its-country-songs-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={allSongs.length === 0}
                  data-testid="button-export-songs-csv"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Download CSV ({allSongs.length} songs)
                </Button>
              </div>
            </Section>
          </TabsContent>

          {/* ── Store ── */}
          <TabsContent value="store" className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Listings</span>
                </div>
                <p className="font-serif text-3xl font-bold">{storeListings.length}</p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <ToggleRight className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Available</span>
                </div>
                <p className="font-serif text-3xl font-bold">{storeListings.filter((l) => l.isAvailable).length}</p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Orders</span>
                </div>
                <p className="font-serif text-3xl font-bold">{storePurchases.length}</p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Revenue</span>
                </div>
                <p className="font-serif text-3xl font-bold">
                  ${(storePurchases.filter((p) => p.status === "completed").reduce((s, p) => s + p.totalCents, 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Song Listings */}
            <Section icon={<Tag className="h-4 w-4 text-primary" />} title="Song Listings" sublabel="Set prices and availability for individual songs">
              <div className="flex justify-end mb-3">
                <Button size="sm" variant="outline" onClick={() => refetchListings()} data-testid="button-refresh-listings">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </Button>
              </div>
              {listingsLoading || songsLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
              ) : allSongs.length === 0 ? (
                <EmptyState message="No songs in the catalog yet." />
              ) : (
                <div className="border rounded-md overflow-hidden divide-y divide-border">
                  {allSongs.map((song) => {
                    const listing = storeListings.find((l) => l.songId === song.id);
                    return (
                      <div key={song.id} className="flex items-center gap-3 px-3 py-3 hover:bg-muted/40" data-testid={`row-listing-${song.id}`}>
                        <div className="w-9 h-9 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                          {song.thumbnailUrl ? <img src={song.thumbnailUrl} alt={song.title} className="w-full h-full object-cover" /> : <Music className="h-4 w-4 text-muted-foreground/40" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist.name}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          {listing ? (
                            <>
                              {listing.pricePersonalCents && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {(listing.pricePersonalCents / 100).toFixed(2)} personal
                                </span>
                              )}
                              {listing.priceCommercialCents && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {(listing.priceCommercialCents / 100).toFixed(2)} commercial
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${listing.isAvailable ? "bg-green-50 text-green-700 border-green-300" : "bg-muted text-muted-foreground border-border"}`}>
                                {listing.isAvailable ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                                {listing.isAvailable ? "On Sale" : "Hidden"}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/60 italic">No listing</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openListingDialog(song)} data-testid={`button-edit-listing-${song.id}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            {listing ? "Edit" : "Add"}
                          </Button>
                          {listing && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" data-testid={`button-delete-listing-${listing.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove listing?</AlertDialogTitle>
                                  <AlertDialogDescription>This will remove the pricing and availability settings for <strong>{song.title}</strong>. The song itself is not affected.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteListingMutation.mutate(listing.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Purchases */}
            <Section icon={<Package className="h-4 w-4 text-primary" />} title="Purchase History" sublabel="All orders placed through the store">
              {purchasesLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
              ) : storePurchases.length === 0 ? (
                <EmptyState message="No purchases yet. Orders will appear here once the store is active." />
              ) : (
                <div className="border rounded-md overflow-hidden divide-y divide-border">
                  {storePurchases.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-3 hover:bg-muted/40" data-testid={`row-purchase-${p.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">#{p.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            p.status === "completed" ? "bg-green-50 text-green-700 border-green-300" :
                            p.status === "refunded" ? "bg-blue-50 text-blue-700 border-blue-300" :
                            p.status === "failed" ? "bg-red-50 text-red-700 border-red-300" :
                            "bg-amber-50 text-amber-700 border-amber-300"
                          }`}>{p.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.buyerEmail}{p.buyerName ? ` · ${p.buyerName}` : ""}</p>
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </div>
                      <div className="text-sm font-semibold shrink-0">
                        ${(p.totalCents / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Store is not yet active</p>
              <p className="text-xs">Buyer checkout is disabled. To enable: set <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">STORE_ENABLED=true</code> and add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">STRIPE_SECRET_KEY</code> + <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> to environment secrets.</p>
            </div>
          </TabsContent>

          {/* ── Import Songs ── */}
          {isSuperAdmin && (
            <TabsContent value="import" className="space-y-6">
              <Section icon={<FileSpreadsheet className="h-4 w-4 text-primary" />} title="Import Songs from CSV">
                <div className="space-y-4">
                  <div className="bg-muted/50 border rounded-md p-4 text-sm space-y-2">
                    <p className="font-medium">CSV Column Order (with header row):</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Song Name</li>
                      <li>File Name (MP3) — URL or filename</li>
                      <li>File Name (MP4) — URL or filename</li>
                      <li>File Lyrics</li>
                      <li>Type (Country, Blues, R&B, etc.)</li>
                      <li>Status (Active or Demo)</li>
                      <li>Label Picture Image — URL</li>
                      <li>Artist Name — must match an existing songwriter</li>
                      <li>Release Date</li>
                      <li>ASCAP Lyric / Song Writer</li>
                      <li>ASCAP Production Name</li>
                      <li>Notes about the song</li>
                      <li>Number of Views</li>
                      <li>Number of Downloads</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">Export your spreadsheet as CSV (comma-separated). The first row must be a header row — it will be skipped. Artist names must exactly match an existing songwriter on the platform.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select CSV File</label>
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResults(null); }}
                      className="cursor-pointer"
                      data-testid="input-import-csv"
                    />
                  </div>

                  <Button
                    onClick={async () => {
                      if (!importFile) return;
                      setImportLoading(true);
                      setImportResults(null);
                      try {
                        const formData = new FormData();
                        formData.append("csv", importFile);
                        const res = await fetch("/api/songs/import", { method: "POST", body: formData, credentials: "include" });
                        const data = await res.json();
                        if (!res.ok) { toast({ title: "Import failed", description: data.message, variant: "destructive" }); return; }
                        setImportResults(data);
                        toast({ title: `Import complete — ${data.imported} songs added${data.errors > 0 ? `, ${data.errors} errors` : ""}` });
                      } catch (e: any) {
                        toast({ title: "Import failed", description: e.message, variant: "destructive" });
                      } finally {
                        setImportLoading(false);
                      }
                    }}
                    disabled={!importFile || importLoading}
                    data-testid="button-import-songs"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importLoading ? "Importing…" : "Import Songs"}
                  </Button>

                  {importResults && (
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-700 dark:text-green-400 font-medium">✓ {importResults.imported} imported</span>
                        {importResults.errors > 0 && <span className="text-destructive font-medium">✗ {importResults.errors} errors</span>}
                      </div>
                      <div className="divide-y divide-border border rounded-md overflow-hidden">
                        {importResults.results.map((r, i) => (
                          <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${r.status === "error" ? "bg-destructive/5" : "bg-green-50 dark:bg-green-950/20"}`} data-testid={`import-result-${r.row}`}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground w-8">#{r.row}</span>
                              <span className="font-medium">{r.title}</span>
                            </div>
                            <div className="shrink-0">
                              {r.status === "error"
                                ? <span className="text-destructive">{r.message}</span>
                                : <span className="text-green-700 dark:text-green-400">Added</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Member Profile Modal */}
      <MemberProfileDialog
        user={profileUser}
        codes={profileUser ? codesForUser(profileUser.id) : []}
        onClose={() => setProfileUser(null)}
        onApprove={(u) => approveWithRoleMutation.mutate({ id: u.id, role: u.role })}
        onReject={handleReject}
        onRoleChange={(id, role) => roleMutation.mutate({ id, role })}
        onGenerateCode={(userId, username) => { setProfileUser(null); setCodeDialog({ userId, username }); }}
        onApplyCode={(userId, code) => applyCodeMutation.mutate({ userId, code })}
        onSaveNotes={(id, notes) => notesMutation.mutate({ id, notes })}
        onDeleteCode={(id) => deleteCodeMutation.mutate(id)}
        onCopyCode={copyCode}
        onDelete={(id) => deleteMutation.mutate(id)}
        isSavingNotes={notesMutation.isPending}
        isApplyingCode={applyCodeMutation.isPending}
      />

      {/* Generate Code Dialog */}
      <Dialog open={!!codeDialog} onOpenChange={() => setCodeDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Generate Access Code
            </DialogTitle>
          </DialogHeader>
          {codeDialog && (
            <p className="text-sm text-muted-foreground -mt-1">
              Choose the access level for <span className="font-semibold text-foreground">{codeDialog.username}</span>.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <AccessTypeCard
              icon={<Radio className="h-7 w-7 text-primary" />}
              title="Radio Station"
              description="Stream for broadcast"
              onClick={() => codeDialog && createCodeMutation.mutate({ role: "radio", createdFor: codeDialog.userId })}
              disabled={createCodeMutation.isPending}
              testId="button-dialog-radio"
            />
            <AccessTypeCard
              icon={<Mic2 className="h-7 w-7 text-primary" />}
              title="Recording Artist"
              description="Stream to record"
              onClick={() => codeDialog && createCodeMutation.mutate({ role: "artist", createdFor: codeDialog.userId })}
              disabled={createCodeMutation.isPending}
              testId="button-dialog-artist"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* New Code Display */}
      <Dialog open={!!newCode} onOpenChange={() => setNewCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Code Ready
            </DialogTitle>
          </DialogHeader>
          {newCode && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share this with the member, or apply it directly from their profile.</p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 flex items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-[0.25em] flex-1 text-center text-foreground">{newCode.code}</span>
                <Button size="icon" variant="secondary" onClick={() => copyCode(newCode.code)} data-testid="button-copy-new-code">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => setNewCode(null)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Song Dialog */}
      <Dialog open={!!editingSong} onOpenChange={(open) => { if (!open) setEditingSong(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Song</DialogTitle>
          </DialogHeader>
          {editingSong && (
            <AdminSongEditForm
              song={editingSong}
              artists={allArtists}
              onSuccess={() => { setEditingSong(null); qc.invalidateQueries({ queryKey: ["/api/songs"] }); }}
              onCancel={() => setEditingSong(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Song Confirmation */}
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
              onClick={() => { if (deletingSong) deleteSongMutation.mutate(deletingSong.id); }}
              data-testid="button-confirm-delete-song-db"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Member Profile Dialog ── */
function MemberProfileDialog({
  user, codes, onClose, onApprove, onReject, onRoleChange,
  onGenerateCode, onApplyCode, onSaveNotes, onDeleteCode, onCopyCode,
  onDelete, isSavingNotes, isApplyingCode,
}: {
  user: SafeUser | null;
  codes: CodeWithUser[];
  onClose: () => void;
  onApprove: (u: SafeUser) => void;
  onReject: (u: SafeUser) => void;
  onRoleChange: (id: number, role: string) => void;
  onGenerateCode: (userId: number, username: string) => void;
  onApplyCode: (userId: number, code: string) => void;
  onSaveNotes: (id: number, notes: string) => void;
  onDeleteCode: (id: number) => void;
  onCopyCode: (code: string) => void;
  onDelete: (id: number) => void;
  isSavingNotes: boolean;
  isApplyingCode: boolean;
}) {
  const [notes, setNotes] = useState(user?.notes ?? "");
  const [applyCode, setApplyCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameDone, setUsernameDone] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (user) setNotes(user.notes ?? "");
  }, [user?.id]);

  if (!user) return null;

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyCode.trim()) return;
    onApplyCode(user.id, applyCode.trim().toUpperCase());
    setApplyCode("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) return;
    try {
      await apiRequest("PATCH", `/api/admin/users/${user.id}/password`, { password: newPassword });
      setNewPassword("");
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
      toast({ title: `Password updated for ${user.username}` });
    } catch {
      toast({ title: "Failed to reset password", variant: "destructive" });
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim().length < 2) return;
    try {
      await apiRequest("PATCH", `/api/admin/users/${user.id}/username`, { username: newUsername.trim() });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setNewUsername("");
      setUsernameDone(true);
      setTimeout(() => setUsernameDone(false), 3000);
      toast({ title: `Username updated to "${newUsername.trim()}"` });
    } catch (err: any) {
      toast({ title: err.message || "Failed to update username", variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">

        {/* Profile header — warm tinted */}
        <div className="bg-primary/8 border-b border-primary/15 px-6 pt-7 pb-6">
          <DialogHeader className="mb-0">
            <DialogTitle className="sr-only">Member Profile</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-4">
            <UserAvatar username={user.username} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary/70 uppercase tracking-widest font-medium mb-1">Member Profile</p>
              <h2 className="font-serif text-2xl font-bold leading-tight mb-2" data-testid="text-profile-username">
                {user.username}
              </h2>
              <p className="text-sm text-muted-foreground mb-3 truncate">{user.email}</p>
              <div className="flex flex-wrap gap-1.5">
                <StatusPill status={user.status} />
                <RolePill role={user.role} />
                {user.userType && <TypePill type={user.userType} />}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Account actions */}
          <ProfileSection label="Account Actions">
            <div className="flex flex-wrap gap-2">
              {user.status !== "approved" && (
                <Button size="sm" onClick={() => onApprove(user)} data-testid="button-profile-approve">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Approve Account
                </Button>
              )}
              {user.status !== "rejected" && (
                <Button size="sm" variant="destructive" onClick={() => onReject(user)} data-testid="button-profile-reject">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  {user.status === "approved" ? "Revoke Access" : "Reject"}
                </Button>
              )}
              {user.status === "rejected" && (
                <Button size="sm" variant="secondary" onClick={() => onApprove(user)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Re-approve
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" data-testid={`button-delete-member-${user.id}`}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the account for <strong>{user.email}</strong>. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(user.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted-foreground">Access level:</span>
              <Select
                value={user.role}
                onValueChange={(val) => onRoleChange(user.id, val)}
              >
                <SelectTrigger className="w-52 text-sm h-9" data-testid="select-profile-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="listener">Listener</SelectItem>
                  <SelectItem value="member">General Member</SelectItem>
                  <SelectItem value="industry">Industry Professional</SelectItem>
                  <SelectItem value="radio">Radio & Advertising</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="subadmin">Sub-Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ProfileSection>

          {/* Access codes */}
          <ProfileSection
            label="Access Codes"
            action={
              <button
                onClick={() => onGenerateCode(user.id, user.username)}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
                data-testid="button-profile-gen-code"
              >
                <Key className="h-3 w-3" />
                Generate Code
              </button>
            }
          >
            {codes.length > 0 && (
              <div className="space-y-2 mb-3">
                {codes.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                    data-testid={`profile-code-${c.id}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono font-bold tracking-[0.18em] text-sm">{c.code}</span>
                      <RolePill role={c.role} small />
                      {c.usedBy
                        ? <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Redeemed</span>
                        : <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Available</span>
                      }
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!c.usedBy && (
                        <button
                          onClick={() => onCopyCode(c.code)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete code"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this code?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes access code <strong>{c.code}</strong>. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDeleteCode(c.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleApplyCode} className="flex gap-2">
              <Input
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                placeholder="Paste code to apply…"
                className="font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans text-sm"
                data-testid="input-profile-apply-code"
              />
              <Button type="submit" size="sm" disabled={isApplyingCode || !applyCode.trim()} data-testid="button-profile-apply-code">
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Apply
              </Button>
            </form>
          </ProfileSection>

          {/* Login Activity */}
          <ProfileSection label="Login Activity" sublabel="Captured automatically on each sign-in">
            {user.lastLoginAt ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Last Seen</span>
                  <span className="text-xs" data-testid="text-last-login-at">
                    {new Date(user.lastLoginAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">IP / Gateway</span>
                  <span className="font-mono text-xs" data-testid="text-last-login-ip">{user.lastLoginIp ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Region</span>
                  <span className="text-xs" data-testid="text-last-login-region">{user.lastLoginRegion ?? "—"}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No login recorded yet.</p>
            )}
          </ProfileSection>

          {/* Admin Notes */}
          <ProfileSection label="Admin Notes" sublabel="Private — visible to admins only">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write private notes about this member…"
              rows={5}
              className="resize-none text-sm leading-relaxed bg-card/60 border-border focus:border-primary/40"
              data-testid="textarea-profile-notes"
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => onSaveNotes(user.id, notes)}
              disabled={isSavingNotes}
              data-testid="button-profile-save-notes"
            >
              {isSavingNotes ? "Saving…" : "Save Notes"}
            </Button>
          </ProfileSection>

          {/* Change Username */}
          <ProfileSection label="Change Username" sublabel={`Current: ${user.username}`}>
            <form onSubmit={handleChangeUsername} className="flex gap-2">
              <Input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="New username"
                className="text-sm"
                data-testid="input-profile-new-username"
              />
              <Button
                type="submit"
                size="sm"
                disabled={newUsername.trim().length < 2}
                data-testid="button-profile-change-username"
              >
                {usernameDone ? "Done ✓" : "Set"}
              </Button>
            </form>
          </ProfileSection>

          {/* Reset Password */}
          <ProfileSection label="Reset Password" sublabel="Set a new password for this member">
            <form onSubmit={handleResetPassword} className="flex gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="text-sm"
                data-testid="input-profile-new-password"
              />
              <Button
                type="submit"
                size="sm"
                disabled={newPassword.length < 6}
                data-testid="button-profile-reset-password"
              >
                {resetDone ? "Done ✓" : "Set"}
              </Button>
            </form>
          </ProfileSection>

        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-card/80">
        {icon}
        <h2 className="font-serif text-base font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ProfileSection({ label, sublabel, action, children }: {
  label: string;
  sublabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-end justify-between gap-2 mb-3">
        <div>
          <p className="font-serif text-sm font-semibold text-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card px-4 py-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`font-serif text-3xl font-bold leading-none ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function RequestRow({ u, onView, onApprove, onReject, isPending, showRejectAsApprove }: {
  u: SafeUser;
  onView: () => void;
  onApprove: (id: number, role: string) => void;
  onReject?: () => void;
  isPending: boolean;
  showRejectAsApprove?: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState(u.role || "");
  return (
    <div className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3" data-testid={`row-request-${u.id}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar username={u.username} size="sm" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{u.username}</span>
              {u.userType && <TypePill type={u.userType} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onView} data-testid={`button-view-${u.id}`}>
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Profile
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center pl-12">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-52 text-sm h-9" data-testid={`select-role-${u.id}`}>
            <SelectValue placeholder="Assign role…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="listener">Listener</SelectItem>
            <SelectItem value="member">General Member</SelectItem>
            <SelectItem value="industry">Industry Professional</SelectItem>
            <SelectItem value="radio">Radio & Advertising</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="subadmin">Sub-Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(u.id, selectedRole)}
            disabled={isPending || !selectedRole}
            data-testid={`button-approve-${u.id}`}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            {showRejectAsApprove ? "Re-approve" : "Approve"}
          </Button>
          {!showRejectAsApprove && onReject && (
            <Button size="sm" variant="destructive" onClick={onReject} disabled={isPending} data-testid={`button-reject-${u.id}`}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SubAdminRequestRow({ u, onApprove, onReject, isPending, isRejected }: {
  u: SafeUser;
  onApprove: (id: number, role: string) => void;
  onReject?: () => void;
  isPending: boolean;
  isRejected?: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState(u.role || "");
  return (
    <div className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3" data-testid={`row-subrequest-${u.id}`}>
      <div className="flex items-center gap-3">
        <UserAvatar username={u.username} size="sm" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{u.username}</span>
            {u.userType && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Requested: {u.userType}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center pl-10">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-52 text-sm h-9" data-testid={`select-role-${u.id}`}>
            <SelectValue placeholder="Assign role…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="listener">Listener</SelectItem>
            <SelectItem value="member">General Member</SelectItem>
            <SelectItem value="industry">Industry Professional</SelectItem>
            <SelectItem value="radio">Radio & Advertising</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="subadmin">Sub-Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(u.id, selectedRole)}
            disabled={isPending || !selectedRole}
            data-testid={`button-approve-${u.id}`}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            {isRejected ? "Re-approve" : "Approve"}
          </Button>
          {!isRejected && onReject && (
            <Button size="sm" variant="destructive" onClick={onReject} disabled={isPending} data-testid={`button-reject-${u.id}`}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Deny
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineCodeRow({ code, onCopy, onDelete }: { code: UpgradeCode; onCopy: (c: string) => void; onDelete: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" data-testid={`inline-code-${code.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono font-bold tracking-[0.18em] text-xs">{code.code}</span>
        <RolePill role={code.role} small />
        {code.usedBy
          ? <span className="text-xs text-muted-foreground">Redeemed</span>
          : <span className="text-xs text-primary font-medium">Available</span>
        }
      </div>
      <div className="flex gap-1">
        {!code.usedBy && (
          <button onClick={() => onCopy(code.code)} className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors">
            <Copy className="h-3 w-3" />
          </button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this code?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes access code <strong>{code.code}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(code.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function UserAvatar({ username, size = "sm" }: { username: string; size?: "sm" | "lg" }) {
  const initials = username.slice(0, 2).toUpperCase();
  const dim = size === "lg" ? "w-14 h-14 text-xl" : "w-9 h-9 text-sm";
  return (
    <div className={`${dim} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-serif font-bold text-primary shrink-0`}>
      {initials}
    </div>
  );
}

function RolePill({ role, small }: { role: string; small?: boolean }) {
  const size = small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  if (role === "radio") return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 text-primary font-medium ${size}`}>
      <Radio className="h-2.5 w-2.5" />Radio Station
    </span>
  );
  if (role === "artist") return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 text-primary font-medium ${size}`}>
      <Mic2 className="h-2.5 w-2.5" />Artist
    </span>
  );
  if (role === "industry") return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 font-medium ${size}`}>
      <Briefcase className="h-2.5 w-2.5" />Industry Pro
    </span>
  );
  return null;
}

function TypePill({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 text-muted-foreground text-[10px] px-1.5 py-0.5 font-medium">
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs px-2 py-0.5 font-medium border border-green-200 dark:border-green-800">
      <CheckCircle className="h-3 w-3" />Approved
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-xs px-2 py-0.5 font-medium border border-destructive/20">
      <XCircle className="h-3 w-3" />Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2 py-0.5 font-medium border border-amber-200 dark:border-amber-800">
      <Clock className="h-3 w-3" />Pending
    </span>
  );
}

function AccessTypeCard({ icon, title, description, onClick, disabled, testId }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  testId: string;
}) {
  return (
    <button
      className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-center disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm font-sans">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Music className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-muted-foreground text-sm italic">{message}</p>
    </div>
  );
}

const SONG_GENRES = ["Country", "Blues", "R&B", "Pop", "Rock", "Gospel", "Folk", "Bluegrass", "Jazz", "Other"];

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

function AdminSongEditForm({ song, artists, onSuccess, onCancel }: {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Song title is required", variant: "destructive" }); return; }
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
      };

      await apiRequest("PATCH", `/api/songs/${song.id}`, payload);
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
        <label className="text-sm font-medium" htmlFor="admin-song-title">Song Title *</label>
        <Input id="admin-song-title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-admin-song-title" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-artist">Songwriter / Artist</label>
        <Select value={artistId} onValueChange={setArtistId}>
          <SelectTrigger id="admin-song-artist" data-testid="select-admin-song-artist">
            <SelectValue placeholder="Select artist" />
          </SelectTrigger>
          <SelectContent>
            {artists.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-song-genre">Type / Genre</label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger id="admin-song-genre" data-testid="select-admin-song-genre">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {SONG_GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-song-status">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="admin-song-status" data-testid="select-admin-song-status">
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
        <label className="text-sm font-medium" htmlFor="admin-song-release-date">Release Date</label>
        <Input id="admin-song-release-date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="e.g. January 2025" data-testid="input-admin-song-release-date" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Files</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-thumbnail">Label Artwork</label>
        {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover rounded-md border" />}
        <Input id="admin-song-thumbnail" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" data-testid="input-admin-song-thumbnail" />
        <Input placeholder="Or paste image URL" value={thumbnailUrl} onChange={(e) => { setThumbnailUrl(e.target.value); setImagePreview(e.target.value || null); setImageFile(null); }} className="text-xs" data-testid="input-admin-song-thumbnail-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-audio">Audio File (MP3)</label>
        {audioUrl && !audioFile && <p className="text-xs text-muted-foreground truncate bg-muted px-2 py-1 rounded">Current: {audioUrl}</p>}
        {audioFile && <p className="text-xs text-green-600 font-medium">Selected: {audioFile.name} ({formatBytes(audioFile.size)})</p>}
        {audioProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Uploading…</span><span>{audioProgress}%</span></div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full transition-all duration-200" style={{ width: `${audioProgress}%` }} />
            </div>
          </div>
        )}
        <Input id="admin-song-audio" type="file" accept="audio/*,.mp3,.wav,.m4a" onChange={(e) => { setAudioFile(e.target.files?.[0] || null); setAudioProgress(null); }} className="cursor-pointer" data-testid="input-admin-song-audio" disabled={isSubmitting} />
        <Input placeholder="Or paste audio URL directly" value={audioUrl} onChange={(e) => { setAudioUrl(e.target.value); setAudioFile(null); }} className="text-xs" data-testid="input-admin-song-audio-url" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-mp4">Video URL (MP4)</label>
        <Input id="admin-song-mp4" value={mp4Url} onChange={(e) => setMp4Url(e.target.value)} placeholder="https://…" data-testid="input-admin-song-mp4" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Content</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-desc">Description</label>
        <Textarea id="admin-song-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} data-testid="input-admin-song-desc" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-lyrics">Lyrics</label>
        <Textarea id="admin-song-lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={6} placeholder="Song lyrics…" data-testid="input-admin-song-lyrics" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Rights & Credits</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-ascap-lyric">ASCAP Lyric / Song Writer</label>
        <Input id="admin-song-ascap-lyric" value={ascapLyricWriter} onChange={(e) => setAscapLyricWriter(e.target.value)} data-testid="input-admin-song-ascap-lyric" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-ascap-prod">ASCAP Production Name</label>
        <Input id="admin-song-ascap-prod" value={ascapProductionName} onChange={(e) => setAscapProductionName(e.target.value)} data-testid="input-admin-song-ascap-prod" />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold border-b pb-1">Admin</p>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="admin-song-notes">Internal Notes</label>
        <Textarea id="admin-song-notes" value={songNotes} onChange={(e) => setSongNotes(e.target.value)} rows={3} placeholder="Notes visible only to admins…" data-testid="input-admin-song-notes" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-song-views">View Count</label>
          <Input id="admin-song-views" type="number" min="0" value={viewCount} onChange={(e) => setViewCount(e.target.value)} data-testid="input-admin-song-views" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-song-downloads">Download Count</label>
          <Input id="admin-song-downloads" type="number" min="0" value={downloadCount} onChange={(e) => setDownloadCount(e.target.value)} data-testid="input-admin-song-downloads" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting} data-testid="button-cancel-admin-song">
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting} data-testid="button-save-admin-song">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{audioProgress !== null && audioProgress < 100 ? `Uploading… ${audioProgress}%` : "Saving…"}</> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
