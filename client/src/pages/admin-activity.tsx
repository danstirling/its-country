import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Search, Activity, RefreshCw, Loader2,
  Globe, Clock, Wifi, User,
} from "lucide-react";

type SafeUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  userType: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginRegion: string | null;
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    superadmin: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
    admin: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
    radio: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
    artist: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
    member: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[role] ?? "bg-muted text-muted-foreground border-border"}`}>
      {role}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "approved" ? "bg-green-500" : status === "pending" ? "bg-amber-500" : "bg-destructive";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} title={status} />;
}

function UserAvatar({ username }: { username: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-primary uppercase">{username.slice(0, 2)}</span>
    </div>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminActivity() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "superadmin" && user.role !== "admin" && user.role !== "subadmin"))) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const { data: users = [], isLoading, refetch } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 0,
    enabled: !authLoading && !!user && (user.role === "admin" || user.role === "superadmin" || user.role === "subadmin"),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || u.username.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.lastLoginIp ?? "").toLowerCase().includes(q)
      || (u.lastLoginRegion ?? "").toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const hasActivity = (u: SafeUser) => !!u.lastLoginAt;
  const withActivity = filtered.filter(hasActivity).sort(
    (a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime()
  );
  const withoutActivity = filtered.filter((u) => !hasActivity(u));
  const sorted = [...withActivity, ...withoutActivity];

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
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">It's Country</p>
              <h1 className="font-serif text-2xl font-bold leading-none" data-testid="text-page-title">Member Activity</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{users.length} members</span>
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
              placeholder="Search by username, email, IP, or region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-activity-search"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
              <SelectItem value="artist">Artist</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">No members match your search.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {sorted.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-start gap-3 px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    data-testid={`row-activity-${u.id}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <UserAvatar username={u.username} />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" data-testid={`text-activity-username-${u.id}`}>{u.username}</span>
                        <StatusDot status={u.status} />
                        <RoleBadge role={u.role} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>

                      {u.lastLoginAt ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span data-testid={`text-activity-time-${u.id}`}>
                              {formatDateTime(u.lastLoginAt)}
                              <span className="ml-1 text-muted-foreground/60">({timeAgo(u.lastLoginAt)})</span>
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3 shrink-0" />
                            <span className="font-mono" data-testid={`text-activity-ip-${u.id}`}>{u.lastLoginIp ?? "—"}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 shrink-0" />
                            <span data-testid={`text-activity-region-${u.id}`}>{u.lastLoginRegion ?? "—"}</span>
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic pt-0.5">No login recorded yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-activity-detail"
          >
            <div className="flex items-center gap-3">
              <UserAvatar username={selectedUser.username} />
              <div>
                <p className="font-bold text-base">{selectedUser.username}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <StatusDot status={selectedUser.status} />
              <span className="text-xs text-muted-foreground capitalize">{selectedUser.status}</span>
              <RoleBadge role={selectedUser.role} />
              {selectedUser.userType && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">{selectedUser.userType}</span>
              )}
            </div>

            <div className="border rounded-lg divide-y divide-border text-sm">
              <div className="flex items-start gap-3 px-4 py-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Last Login</p>
                  <p className="font-medium">{formatDateTime(selectedUser.lastLoginAt) ?? "Never"}</p>
                  {selectedUser.lastLoginAt && (
                    <p className="text-xs text-muted-foreground">{timeAgo(selectedUser.lastLoginAt)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <Wifi className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">IP / Gateway</p>
                  <p className="font-mono font-medium">{selectedUser.lastLoginIp ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Region</p>
                  <p className="font-medium">{selectedUser.lastLoginRegion ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Member ID</p>
                  <p className="font-mono font-medium">#{selectedUser.id}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/admin" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">View Full Profile</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)} className="flex-1">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
