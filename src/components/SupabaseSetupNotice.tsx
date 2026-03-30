import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink, Wifi } from "lucide-react";

export default function SupabaseSetupNotice() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Wifi className="h-8 w-8 text-primary-foreground" />
          </div>
          <Badge variant="secondary" className="mb-4">
            Setup required
          </Badge>
          <h1 className="text-3xl font-display font-bold">
            Connect Supabase before going live
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The app is loading correctly, but your Supabase keys are missing.
            Add them to a local `.env` file to enable login, registration, and
            live data.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Required environment variables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-4 font-mono">
              <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
              <div>VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key</div>
            </div>
            <p className="text-muted-foreground">
              Copy `.env.example` to `.env`, fill in your real project values,
              then restart `npm run dev`.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Create a Supabase project.</p>
            <p>2. Run the SQL migrations in the `supabase/migrations` folder.</p>
            <p>3. Add the project URL and anon key to `.env`.</p>
            <p>4. Deploy the frontend after confirming login and dashboard load.</p>
            <div className="pt-2">
              <Button asChild variant="outline">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
