import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Globe,
  Loader2,
  Lock,
  Mail,
  User,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { getTenantLoginUrl, sanitizeSubdomain } from "@/lib/tenant";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ispName, setIspName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainTaken, setSubdomainTaken] = useState(false);
  const [successState, setSuccessState] = useState<{
    subdomain: string;
    loginUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!subdomain && ispName) {
      setSubdomain(sanitizeSubdomain(ispName));
    }
  }, [ispName, subdomain]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const cleanSubdomain = sanitizeSubdomain(subdomain);
    if (!cleanSubdomain) {
      setSubdomainTaken(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setCheckingSubdomain(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("subdomain", cleanSubdomain)
        .limit(1);

      if (!error) {
        setSubdomainTaken((data || []).length > 0);
      }
      setCheckingSubdomain(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [subdomain]);

  const subdomainPreview = useMemo(() => {
    const clean = sanitizeSubdomain(subdomain || ispName || "your-isp");
    return clean || "your-isp";
  }, [ispName, subdomain]);

  const loginPreviewUrl = useMemo(
    () => getTenantLoginUrl(subdomainPreview),
    [subdomainPreview],
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubdomain = sanitizeSubdomain(subdomain);

    if (!isSupabaseConfigured) {
      toast.error("Add your Supabase keys to the .env file first.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!ispName.trim()) {
      toast.error("ISP / Business name is required");
      return;
    }
    if (!cleanSubdomain) {
      toast.error("Choose a valid subdomain");
      return;
    }
    if (subdomainTaken) {
      toast.error("That subdomain is already taken");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            isp_name: ispName,
            subdomain: cleanSubdomain,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const loginUrl = getTenantLoginUrl(cleanSubdomain);
        setSuccessState({ subdomain: cleanSubdomain, loginUrl });
        toast.success("ISP account created");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to register";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (successState) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(220_24%_8%))] px-4 py-10">
        <div className="mx-auto max-w-xl">
          <div className="glass-card border-border p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-success/15">
              <BadgeCheck className="h-8 w-8 text-success" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              ISP account created
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your tenant login address is ready. Share it with your ISP admin
              team and use it to sign in.
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Your subdomain
              </p>
              <p className="mt-2 font-mono text-lg text-primary">
                {successState.subdomain}
              </p>
              <p className="mt-3 text-xs text-muted-foreground break-all">
                Login URL: {successState.loginUrl}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-primary text-primary-foreground">
                <a href={successState.loginUrl}>
                  Go to ISP login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to landing page</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_hsl(220_24%_8%))] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="rounded-[2rem] border border-border/60 bg-card/60 p-8 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
              <Wifi className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">
                MoonConnect
              </p>
              <p className="text-sm text-muted-foreground">
                Create your ISP tenant workspace
              </p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold text-white">
            Register your ISP and get your own subdomain.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Every ISP gets a tenant login URL, branded portal access, separate
            packages, routers, subscribers, payments, and settings.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="font-medium text-foreground">1. Register ISP</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the admin account and reserve the subdomain.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="font-medium text-foreground">2. Login on tenant URL</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We will generate the working tenant login URL for your setup.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="font-medium text-foreground">3. Configure billing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add packages, routers, hotspot flows, and PPPoE subscribers.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-6 backdrop-blur sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              ISP Registration
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose your business identity and the subdomain your team will use
              to sign in.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {!isSupabaseConfigured && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Supabase is not configured yet. Add `VITE_SUPABASE_URL` and
                `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env`.
              </div>
            )}

            <div>
              <Label htmlFor="ispName">ISP / Business Name</Label>
              <div className="relative mt-1.5">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ispName"
                  placeholder="e.g. Starlink Fiber"
                  className="pl-10"
                  value={ispName}
                  onChange={(e) => {
                    setIspName(e.target.value);
                    if (!subdomain) {
                      setSubdomain(sanitizeSubdomain(e.target.value));
                    }
                  }}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subdomain">Tenant Subdomain</Label>
              <div className="relative mt-1.5">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="subdomain"
                  placeholder="your-isp"
                  className="pl-10 font-mono"
                  value={subdomain}
                  onChange={(e) => setSubdomain(sanitizeSubdomain(e.target.value))}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  Login URL preview:
                  <span className="ml-1 font-mono text-primary">
                    {loginPreviewUrl}
                  </span>
                </span>
                <span
                  className={
                    subdomainTaken
                      ? "text-destructive"
                      : checkingSubdomain
                        ? "text-muted-foreground"
                        : "text-success"
                  }
                >
                  {checkingSubdomain
                    ? "Checking..."
                    : subdomainTaken
                      ? "Taken"
                      : "Available"}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="fullName">Admin Full Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  className="pl-10"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!isSupabaseConfigured}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!isSupabaseConfigured}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-primary text-primary-foreground"
              disabled={
                loading ||
                !isSupabaseConfigured ||
                checkingSubdomain ||
                subdomainTaken
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating ISP account...
                </>
              ) : (
                <>
                  Register ISP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already registered?
              <Link to="/login" className="ml-1 text-primary hover:underline">
                Login to your ISP account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
