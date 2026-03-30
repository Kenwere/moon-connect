import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Loader2,
  Lock,
  Mail,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { getTenantAppUrl, getTenantSubdomain } from "@/lib/tenant";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const tenantSubdomain = useMemo(() => getTenantSubdomain(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Add your Supabase keys to the .env file first.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: org } = await supabase
          .from("organizations")
          .select("subdomain")
          .eq("owner_id", data.user.id)
          .limit(1)
          .single();

        const targetSubdomain = org?.subdomain || tenantSubdomain;
        const appUrl = getTenantAppUrl(targetSubdomain);

        toast.success("Login successful");

        if (appUrl.startsWith("http")) {
          window.location.href = appUrl;
        } else {
          window.location.href = "/app";
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to login";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(220_24%_8%))] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr,1.05fr]">
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
                ISP tenant login
              </p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold text-white">
            Sign in to your ISP workspace.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Use your admin email and password. If you signed up with a custom
            tenant URL, keep using that subdomain for future access.
          </p>

          <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" />
              Current tenant
            </div>
            <p className="mt-2 font-mono text-base text-primary">
              {tenantSubdomain
                ? `${tenantSubdomain}.moonconnect.app`
                : "main site login"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              After login, we will route you to your ISP tenant dashboard.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <Link to="/" className="hover:text-primary">
              Back to landing page
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/60 bg-card/70 p-6 backdrop-blur sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              ISP Login
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your account credentials to open the admin dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {!isSupabaseConfigured && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Supabase is not configured yet. Add `VITE_SUPABASE_URL` and
                `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env`.
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
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

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-primary text-primary-foreground"
              disabled={loading || !isSupabaseConfigured}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Open ISP Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Need a new tenant?
              <Link to="/register" className="ml-1 text-primary hover:underline">
                Register your ISP
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
