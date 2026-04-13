import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";

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

function getRoleFromCode(code: string): { role: string; label: string } | null {
  const n = parseInt(code, 10);
  if (isNaN(n) || code.trim() === "") return null;
  if (n >= 0 && n <= 99) return { role: "admin", label: "Administrator" };
  if (n >= 100 && n <= 199) return { role: "subadmin", label: "Sub-Admin" };
  if (n >= 200 && n <= 499) return { role: "artist", label: "Artist" };
  if (n >= 500 && n <= 799) return { role: "radio", label: "Radio & Advertising" };
  if (n >= 1000 && n <= 1399) return { role: "listener", label: "Listener" };
  return null;
}

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (submitted) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

  const codeResult = getRoleFromCode(accessCode);
  const codeIsInvalid = accessCode.trim() !== "" && codeResult === null;
  const codeIsValid = codeResult !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !accessCode) return;

    if (!codeIsValid) {
      toast({ title: "Invalid access code", description: "Please enter a valid access code to continue.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) {
      toast({ title: pwErrors[0], variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", {
        firstName,
        lastName,
        email,
        password,
        accessCode,
        marketingConsent,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="font-serif text-3xl font-bold mb-3" data-testid="text-submitted-title">
            Request Received
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Your account request has been submitted and is currently under review. Once approved, you'll receive access based on your account type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-8 pb-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-lg">Welcome! Saddle up and join the family!</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-serif" data-testid="text-register-title">Create Account</CardTitle>
            <CardDescription>
              Sign up for access to It's Country. All new accounts are reviewed before
              approval. Enter your access code below to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                    autoComplete="off"
                    data-testid="input-register-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    required
                    autoComplete="off"
                    data-testid="input-register-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="off"
                  data-testid="input-register-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="number"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter your access code"
                  required
                  autoComplete="off"
                  min={0}
                  data-testid="input-access-code"
                  className={codeIsInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {codeIsValid && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400" data-testid="text-code-valid">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Code grants <strong>{codeResult.label}</strong> access — pending admin approval.</span>
                  </div>
                )}
                {codeIsInvalid && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid="text-code-invalid">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>This code is not recognized. Please check and try again.</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                    data-testid="input-register-password"
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                    data-testid="input-register-confirm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                Stay in the loop — members who opt in receive updates on new songs added to the catalog, featured artists, upcoming releases, and exclusive news from It's Country.
              </p>
              <div className="flex items-start gap-3">
                <input
                  id="marketingConsent"
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                  data-testid="checkbox-marketing-consent"
                />
                <label htmlFor="marketingConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to receive occasional marketing emails from It's Country about new songs, artists, and updates. This consent is voluntary and you may withdraw it at any time by clicking unsubscribe in any email we send.
                </label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !codeIsValid}
                data-testid="button-register"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Request Access
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary cursor-pointer font-medium" data-testid="link-to-login">
                  Sign In
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
