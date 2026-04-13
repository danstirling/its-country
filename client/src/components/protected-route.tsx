import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Lock, X } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  teaser?: React.ReactNode;
}

export function ProtectedRoute({ children, teaser }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-[80vh]">
        {teaser && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="blur-sm pointer-events-none select-none opacity-40">
              {teaser}
            </div>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative bg-background/95 backdrop-blur border rounded-md p-10 text-center max-w-md mx-4 shadow-xl">
            <button
              onClick={() => navigate("/")}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-close-members-only"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-3">Members Only</h2>
            <p className="text-muted-foreground mb-6">
              This section is available to approved It's Country members. Create a free
              account or sign in to request access.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button className="w-full sm:w-auto" data-testid="button-teaser-join">
                  Request Exclusive Access
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="w-full sm:w-auto" data-testid="button-teaser-signin">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user.status === "pending") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-6" />
          <h2 className="font-serif text-3xl font-bold mb-3" data-testid="text-pending-title">
            Account Pending Approval
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Thanks for joining! Your account is pending review by the It's Country team.
            You'll have full access as soon as it's approved. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  if (user.status === "rejected") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="font-serif text-3xl font-bold mb-3">Access Not Approved</h2>
          <p className="text-muted-foreground">
            Your account was not approved at this time. Please contact us for more information.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
