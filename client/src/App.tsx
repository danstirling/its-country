import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Artists from "@/pages/artists";
import { ArtistTeaser } from "@/pages/artists";
import Songs from "@/pages/songs";
import Admin from "@/pages/admin";
import AdminSongs from "@/pages/admin-songs";
import AdminActivity from "@/pages/admin-activity";
import Account from "@/pages/account";
import AdminReview from "@/pages/admin-review";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import SongsCatalog, { SongsCatalogTeaser } from "@/pages/songs-catalog";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/songs" component={AdminSongs} />
      <Route path="/admin/activity" component={AdminActivity} />
      <Route path="/account">
        <ProtectedRoute><Account /></ProtectedRoute>
      </Route>
      <Route path="/artists">
        <ProtectedRoute teaser={<ArtistTeaser />}>
          <Artists />
        </ProtectedRoute>
      </Route>
      <Route path="/songs">
        <ProtectedRoute teaser={<SongsCatalogTeaser />}>
          <SongsCatalog />
        </ProtectedRoute>
      </Route>
      <Route path="/artists/:slug/songs">
        {() => (
          <ProtectedRoute>
            <Songs />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Switch>
            <Route path="/admin/review/:token" component={AdminReview} />
            <Route>
              <div className="min-h-screen bg-background text-foreground flex flex-col">
                <ScrollToTop />
                <Navbar />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
                <CookieBanner />
              </div>
            </Route>
          </Switch>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
