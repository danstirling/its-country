import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Music, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

function getPasswordErrors(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(pw)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(pw)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(pw)) errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("At least one special character");
  return errors;
}

function PasswordRequirements({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <ul className="space-y-1 pt-1">
      {rules.map((r) => (
        <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          <span>{r.met ? "✓" : "○"}</span>{r.label}
        </li>
      ))}
    </ul>
  );
}

interface Props {
  params: { token: string };
}

type TokenState = "checking" | "valid" | "invalid";

export default function ResetPassword({ params }: Props) {
  const token = params?.token ?? "";
  const [, navigate] = useLocation();

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    fetch(`/api/auth/validate-reset-token/${token}`, { credentials: "include" })
      .then((res) => {
        setTokenState(res.ok ? "valid" : "invalid");
      })
      .catch(() => {
        setTokenState("invalid");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) {
      setError(pwErrors[0]);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      const raw = err?.message ?? "";
      let msg = "This reset link is invalid or has expired.";
      try {
        const json = JSON.parse(raw.replace(/^\d+:\s*/, ""));
        if (json?.message) msg = json.message;
      } catch {}
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold">It's Country</span>
          </div>
          <p className="text-muted-foreground text-sm">Choose a new password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Reset Your Password</CardTitle>
            <CardDescription>
              Enter a new password for your account below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {tokenState === "checking" && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground" data-testid="status-token-checking">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Verifying your reset link…</span>
              </div>
            )}

            {tokenState === "invalid" && (
              <div className="space-y-4" data-testid="status-token-invalid">
                <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-md p-4">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">This reset link is no longer valid</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      It may have expired or been replaced by a newer request. Please request a new link below.
                    </p>
                  </div>
                </div>
                <Link href="/forgot-password">
                  <Button className="w-full" data-testid="button-request-new-link">
                    Request a New Reset Link
                  </Button>
                </Link>
                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login">
                    <span className="text-primary cursor-pointer font-medium" data-testid="link-back-to-login">Back to Sign In</span>
                  </Link>
                </div>
              </div>
            )}

            {tokenState === "valid" && (
              done ? (
                <div className="space-y-4" data-testid="status-reset-done">
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md p-4">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 leading-relaxed">
                      Your password has been updated. Taking you to sign in…
                    </p>
                  </div>
                  <Link href="/login">
                    <Button className="w-full" data-testid="button-go-to-login">Sign In Now</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        autoComplete="new-password"
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordRequirements password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat your new password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="pl-9 pr-10"
                        autoComplete="new-password"
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-confirm"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {confirm && (
                    <div className="flex items-center gap-2 text-sm">
                      {password === confirm ? (
                        <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-700">Passwords match</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive">Passwords do not match</span></>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-reset-error">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !token}
                    data-testid="button-set-password"
                  >
                    {isLoading ? "Updating…" : "Set New Password"}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    <Link href="/login">
                      <span className="text-primary cursor-pointer font-medium" data-testid="link-cancel-reset">
                        Cancel — Back to Sign In
                      </span>
                    </Link>
                  </div>
                </form>
              )
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
