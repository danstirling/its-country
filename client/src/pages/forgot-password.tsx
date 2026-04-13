import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-serif text-2xl font-bold">It's Country</span>
          </div>
          <p className="text-muted-foreground text-sm">We'll get you back in the saddle</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Forgot Password?</CardTitle>
            <CardDescription>
              Enter the email address on your account and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md p-4">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 leading-relaxed">
                    If that email is registered, you'll receive a reset link shortly. Check your inbox (and spam folder just in case).
                  </p>
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      data-testid="input-forgot-email"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive" data-testid="text-forgot-error">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-reset"
                >
                  {isLoading ? "Sending…" : "Send Reset Link"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link href="/login">
                    <span className="text-primary cursor-pointer font-medium" data-testid="link-back-to-login">
                      Back to Sign In
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
