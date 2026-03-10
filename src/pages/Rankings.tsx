import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Trophy, Clock, Wifi } from "lucide-react";

const mockRankings = [
  { rank: 1, phone: "0712xxxx78", hours: 45, sessions: 28, dataUsed: "12.5 GB" },
  { rank: 2, phone: "0798xxxx32", hours: 33, sessions: 22, dataUsed: "9.8 GB" },
  { rank: 3, phone: "0723xxxx89", hours: 28, sessions: 18, dataUsed: "8.2 GB" },
  { rank: 4, phone: "0701xxxx67", hours: 24, sessions: 15, dataUsed: "7.1 GB" },
  { rank: 5, phone: "0745xxxx01", hours: 20, sessions: 12, dataUsed: "5.9 GB" },
  { rank: 6, phone: "0756xxxx12", hours: 18, sessions: 11, dataUsed: "5.2 GB" },
  { rank: 7, phone: "0767xxxx23", hours: 15, sessions: 9, dataUsed: "4.5 GB" },
  { rank: 8, phone: "0778xxxx34", hours: 12, sessions: 8, dataUsed: "3.8 GB" },
];

const medalColors = ["text-warning", "text-muted-foreground", "text-warning/60"];

export default function Rankings() {
  return (
    <AdminLayout>
      <PageHeader title="User Rankings" subtitle="Top internet users by usage" />

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {mockRankings.slice(0, 3).map((u, i) => (
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
              {mockRankings.map((u, i) => (
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
    </AdminLayout>
  );
}
