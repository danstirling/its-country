import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function AdminReview() {
  const { token } = useParams<{ token: string }>();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [confirmingApprove, setConfirmingApprove] = useState(false);

  const { data: user, isLoading, error } = useQuery<any>({
    queryKey: ["/api/admin/review", token],
    queryFn: () => fetch(`/api/admin/review/${token}`).then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d))),
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/review/${token}/approve`),
    onSuccess: () => setDecision("approved"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/review/${token}/reject`),
    onSuccess: () => setDecision("rejected"),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/images/logo.png" alt="It's Country" className="h-14" />
        </div>

        {isLoading && (
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p>Loading request…</p>
          </div>
        )}

        {error && (
          <div className="text-center border border-border rounded-lg p-8 bg-card">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="font-serif text-xl font-semibold mb-2">Link Unavailable</h2>
            <p className="text-muted-foreground text-sm">
              This link is invalid or has already been used. Each request link can only be used once.
            </p>
          </div>
        )}

        {user && !decision && (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b border-border">
              <h1 className="font-serif text-xl font-semibold">New Member Request</h1>
              <p className="text-muted-foreground text-sm mt-1">Review the details below and approve or reject.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="font-medium text-muted-foreground">Username</span>
                <span data-testid="text-review-username">{user.username}</span>
                <span className="font-medium text-muted-foreground">Email</span>
                <span data-testid="text-review-email">{user.email}</span>
                <span className="font-medium text-muted-foreground">Account Type</span>
                <span data-testid="text-review-usertype">{user.userType}</span>
                <span className="font-medium text-muted-foreground">Status</span>
                <span className="capitalize text-amber-600 font-medium" data-testid="text-review-status">{user.status}</span>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-3">
              {!confirmingApprove ? (
                <>
                  <button
                    onClick={() => setConfirmingApprove(true)}
                    disabled={isPending}
                    data-testid="button-approve"
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve — Grant Access
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate()}
                    disabled={isPending}
                    data-testid="button-reject"
                    className="w-full flex items-center justify-center gap-2 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject — Deny Access
                  </button>
                </>
              ) : (
                <div className="rounded-md border border-green-200 bg-green-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-green-900 text-center">
                    Confirm: approve <strong>{user?.username}</strong> and send them an access email?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingApprove(false)}
                      disabled={isPending}
                      className="flex-1 py-2 px-3 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { approveMutation.mutate(); setConfirmingApprove(false); }}
                      disabled={isPending}
                      data-testid="button-confirm-approve"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Yes, Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {decision && (
          <div className="text-center border border-border rounded-lg p-10 bg-card">
            {decision === "approved" ? (
              <>
                <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Request Approved</h2>
                <p className="text-muted-foreground text-sm">
                  {user?.username} has been approved and can now log in to It's Country.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Request Rejected</h2>
                <p className="text-muted-foreground text-sm">
                  {user?.username}'s request has been rejected. This link has been deactivated.
                </p>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">It's Country Record Label · Texas</p>
      </div>
    </div>
  );
}
