import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DollarSign, Users, Wifi, Clock, TrendingUp, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { name: "Mon", revenue: 4200 }, { name: "Tue", revenue: 5800 },
  { name: "Wed", revenue: 3900 }, { name: "Thu", revenue: 7200 },
  { name: "Fri", revenue: 6100 }, { name: "Sat", revenue: 8400 },
  { name: "Sun", revenue: 7800 },
];

const sessionData = [
  { hour: "6am", sessions: 12 }, { hour: "8am", sessions: 45 },
  { hour: "10am", sessions: 78 }, { hour: "12pm", sessions: 92 },
  { hour: "2pm", sessions: 85 }, { hour: "4pm", sessions: 68 },
  { hour: "6pm", sessions: 95 }, { hour: "8pm", sessions: 110 },
  { hour: "10pm", sessions: 72 }, { hour: "12am", sessions: 30 },
];

const recentSessions = [
  { phone: "0712345678", package: "Full Day", amount: 60, status: "Active", time: "2h 15m" },
  { phone: "0798765432", package: "2 Hours", amount: 15, status: "Active", time: "45m" },
  { phone: "0723456789", package: "Half Day", amount: 30, status: "Expired", time: "6h 0m" },
  { phone: "0701234567", package: "2 Hours", amount: 15, status: "Active", time: "1h 20m" },
  { phone: "0745678901", package: "Full Day", amount: 60, status: "Active", time: "5h 30m" },
];

export default function Dashboard() {
  return (
    <AdminLayout>
      <PageHeader title="Dashboard" subtitle="Overview of your hotspot network" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} title="Today's Revenue" value="KSH 12,450" change="+18% from yesterday" changeType="up" />
        <StatCard icon={Users} title="Active Users" value="142" change="+24 new today" changeType="up" />
        <StatCard icon={Wifi} title="Active Sessions" value="89" change="3 routers online" changeType="neutral" />
        <StatCard icon={Clock} title="Avg. Session" value="2.4 hrs" change="-5% this week" changeType="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Weekly Revenue</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 9%)', border: '1px solid hsl(220, 20%, 16%)', borderRadius: 8, color: 'hsl(220, 10%, 90%)' }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(175, 80%, 45%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sessions Chart */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Sessions Today</h3>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
              <XAxis dataKey="hour" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 9%)', border: '1px solid hsl(220, 20%, 16%)', borderRadius: 8, color: 'hsl(220, 10%, 90%)' }} />
              <Bar dataKey="sessions" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Recent Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Phone</th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Package</th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Duration</th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((s, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2 font-mono text-xs">{s.phone}</td>
                  <td className="py-3 px-2">{s.package}</td>
                  <td className="py-3 px-2">KSH {s.amount}</td>
                  <td className="py-3 px-2">{s.time}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.status === "Active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
