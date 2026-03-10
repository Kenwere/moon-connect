import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Trophy, Clock, Wifi } from "lucide-react";

const medalColors = ["text-warning", "text-muted-foreground", "text-warning/60"];

export default function Rankings() {
  const [rankings, setRankings] = useState<Array<{
    rank: number;
    phone: string;
    hours: number;
    sessions: number;
    dataUsed: string;
  }>>([]);
  return (
    <AdminLayout>
      <PageHeader title="User Rankings" subtitle="Top internet users by usage" />

      {rankings.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No rankings yet</p>
          <p className="text-xs text-muted-foreground mt-1">User rankings will appear here once there is usage data</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {rankings.slice(0, 3).map((u, i) => (
              <div key={i} className={`glass-card-glow rounded-xl p-6 text-center ${i === 0 ? "sm:order-2 ring-1 ring-primary/30" : i === 1 ? "sm:order-1" : "sm:order-3"}`}>
                <Trophy className={`w-8 h-8 mx-auto mb-2 ${medalColors[i]}`} />
                <p className="text-2xl font-display font-bold">#{u.rank}</p>
                <p className="font-mono text-sm mt-1">{u.phone}</p>
                <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {u.hours}h</span>
                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> {u.sessions}</span>
                </div>
                <p className="text-sm font-medium text-primary mt-2">{u.dataUsed}</p>
              </div>
            ))}
          </div>

          {/* Full Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Rank</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Hours Used</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Sessions</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Data Used</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((u, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-display font-bold">#{u.rank}</td>
                      <td className="py-3 px-4 font-mono text-xs">{u.phone}</td>
                      <td className="py-3 px-4">{u.hours} hrs</td>
                      <td className="py-3 px-4">{u.sessions}</td>
                      <td className="py-3 px-4">{u.dataUsed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
