import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies-accepted");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookies-accepted", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 shadow-lg"
      style={{ backgroundColor: "hsl(35, 35%, 30%)" }}
      role="dialog"
      aria-label="Cookie consent"
      data-testid="banner-cookies"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-white/90 leading-relaxed max-w-2xl">
          We use cookies to support account functionality and improve your experience.
          By continuing to use this site, you agree to our use of cookies.{" "}
          <Link href="/privacy">
            <span className="underline underline-offset-2 hover:text-white cursor-pointer transition-colors font-medium">
              See our Privacy Policy
            </span>
          </Link>{" "}
          for more information.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            size="sm"
            onClick={accept}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-5"
            data-testid="button-cookies-accept"
          >
            Accept
          </Button>
          <button
            onClick={accept}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss cookie banner"
            data-testid="button-cookies-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
