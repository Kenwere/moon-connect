import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DollarSign, Users, Wifi, Clock, TrendingUp, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Dashboard() {
  return (
    <AdminLayout>
      <PageHeader title="Dashboard" subtitle="Overview of your hotspot network" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} title="Today's Revenue" value="KSH 0" change="No data yet" changeType="neutral" />
        <StatCard icon={Users} title="Active Users" value="0" change="No users yet" changeType="neutral" />
        <StatCard icon={Wifi} title="Active Sessions" value="0" change="No sessions yet" changeType="neutral" />
        <StatCard icon={Clock} title="Avg. Session" value="0 hrs" change="No data" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Weekly Revenue</h3>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={[]}>
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
          <p className="text-center text-sm text-muted-foreground mt-4">No revenue data available yet</p>
        </div>

        {/* Sessions Chart */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Sessions Today</h3>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
              <XAxis dataKey="hour" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 9%)', border: '1px solid hsl(220, 20%, 16%)', borderRadius: 8, color: 'hsl(220, 10%, 90%)' }} />
              <Bar dataKey="sessions" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-muted-foreground mt-4">No session data available yet</p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Recent Sessions</h3>
        <div className="text-center py-12">
          <Wifi className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No sessions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions will appear here once users start connecting</p>
        </div>
      </div>
    </AdminLayout>
  );
}
