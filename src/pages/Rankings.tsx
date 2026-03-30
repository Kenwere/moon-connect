import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, Trophy, Wifi } from "lucide-react";

const medalColors = ["text-warning", "text-muted-foreground", "text-warning/60"];
const ranges = [
  { key: "day", label: "Daily", hours: 24 },
  { key: "week", label: "Weekly", hours: 24 * 7 },
  { key: "month", label: "Monthly", hours: 24 * 30 },
  { key: "year", label: "Yearly", hours: 24 * 365 },
] as const;

interface RankEntry {
  phone: string;
  hours: number;
  sessions: number;
}

interface RouterHealthRow {
  router_id: string;
  router_name: string;
  is_online: boolean;
  uptime_seconds: number;
  downtime_seconds: number;
  sample_interval_seconds: number;
  recorded_at: string;
}

interface RouterHealthSummary {
  routerId: string;
  routerName: string;
  uptimeSeconds: number;
  downtimeSeconds: number;
  availability: number;
  lastRecordedAt: string | null;
  lastState: "Online" | "Offline";
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function Rankings() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [routerHealth, setRouterHealth] = useState<RouterHealthRow[]>([]);
  const [selectedRange, setSelectedRange] =
    useState<(typeof ranges)[number]["key"]>("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: sessions }, { data: healthSamples }] = await Promise.all([
        supabase.from("sessions").select("phone, duration_used"),
        supabase
          .from("router_health_samples")
          .select(
            "router_id, router_name, is_online, uptime_seconds, downtime_seconds, sample_interval_seconds, recorded_at",
          )
          .order("recorded_at", { ascending: false }),
      ]);

      if (sessions) {
        const map = new Map<string, { hours: number; sessions: number }>();
        (sessions as Array<{ phone: string; duration_used: number | null }>).forEach(
          (session) => {
            const current = map.get(session.phone) || { hours: 0, sessions: 0 };
            current.hours += (session.duration_used || 0) / 60;
            current.sessions += 1;
            map.set(session.phone, current);
          },
        );

        setRankings(
          Array.from(map.entries())
            .map(([phone, value]) => ({
              phone,
              hours: Math.round(value.hours * 10) / 10,
              sessions: value.sessions,
            }))
            .sort((a, b) => b.hours - a.hours),
        );
      }

      setRouterHealth((healthSamples as RouterHealthRow[]) || []);
      setLoading(false);
    };

    void fetch();
  }, []);

  const selectedRangeConfig = useMemo(
    () => ranges.find((range) => range.key === selectedRange) || ranges[0],
    [selectedRange],
  );

  const routerHealthSummaries = useMemo(() => {
    const cutoff = Date.now() - selectedRangeConfig.hours * 60 * 60 * 1000;
    const filteredSamples = routerHealth.filter(
      (sample) => new Date(sample.recorded_at).getTime() >= cutoff,
    );
    const map = new Map<string, RouterHealthSummary>();

    filteredSamples.forEach((sample) => {
      const current = map.get(sample.router_id) || {
        routerId: sample.router_id,
        routerName: sample.router_name,
        uptimeSeconds: 0,
        downtimeSeconds: 0,
        availability: 0,
        lastRecordedAt: null,
        lastState: "Offline" as const,
      };

      current.uptimeSeconds += sample.uptime_seconds || 0;
      current.downtimeSeconds += sample.downtime_seconds || 0;

      if (
        !current.lastRecordedAt ||
        new Date(sample.recorded_at).getTime() > new Date(current.lastRecordedAt).getTime()
      ) {
        current.lastRecordedAt = sample.recorded_at;
        current.lastState = sample.is_online ? "Online" : "Offline";
      }

      const total = current.uptimeSeconds + current.downtimeSeconds;
      current.availability = total > 0 ? (current.uptimeSeconds / total) * 100 : 0;

      map.set(sample.router_id, current);
    });

    return Array.from(map.values()).sort((a, b) => b.availability - a.availability);
  }, [routerHealth, selectedRangeConfig.hours]);

  return (
    <AdminLayout>
      <PageHeader
        title="Reports"
        subtitle="Review top users and router uptime or downtime across daily, weekly, monthly, and yearly windows"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-8 glass-card p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-sm font-semibold">Router Availability</h2>
                <p className="text-sm text-muted-foreground">
                  Uptime and downtime are calculated from router health samples saved in Supabase.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ranges.map((range) => (
                  <Button
                    key={range.key}
                    variant={range.key === selectedRange ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRange(range.key)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            {routerHealthSummaries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No router health samples yet. Deploy and schedule the `router-health-snapshot`
                  function to start collecting uptime data.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Router</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Availability</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uptime</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Downtime</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routerHealthSummaries.map((router) => (
                      <tr
                        key={router.routerId}
                        className="border-b border-border/50 transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium">{router.routerName}</td>
                        <td className="px-4 py-3">
                          <div>{formatPercent(router.availability)}</div>
                        </td>
                        <td className="px-4 py-3">{formatHours(router.uptimeSeconds)}</td>
                        <td className="px-4 py-3">{formatHours(router.downtimeSeconds)}</td>
                        <td className="px-4 py-3 text-xs">
                          <div
                            className={
                              router.lastState === "Online"
                                ? "text-success"
                                : "text-destructive"
                            }
                          >
                            {router.lastState}
                          </div>
                          <div className="text-muted-foreground">
                            {router.lastRecordedAt
                              ? new Date(router.lastRecordedAt).toLocaleString()
                              : "No samples"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {rankings.length >= 3 && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {rankings.slice(0, 3).map((user, index) => (
                <div
                  key={user.phone}
                  className={`glass-card p-6 text-center ${
                    index === 0
                      ? "sm:order-2 ring-1 ring-primary/30"
                      : index === 1
                        ? "sm:order-1"
                        : "sm:order-3"
                  }`}
                >
                  <Trophy className={`mx-auto mb-2 h-8 w-8 ${medalColors[index]}`} />
                  <p className="font-display text-2xl font-bold">#{index + 1}</p>
                  <p className="mt-1 font-mono text-sm">{user.phone}</p>
                  <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {user.hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      {user.sessions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hours Used</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((user, index) => (
                  <tr
                    key={`${user.phone}-${index}`}
                    className="border-b border-border/50 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-display font-bold">#{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{user.phone}</td>
                    <td className="px-4 py-3">{user.hours} hrs</td>
                    <td className="px-4 py-3">{user.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
