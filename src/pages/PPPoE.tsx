import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  Ban,
  Cable,
  Clock3,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type PPPoEAccount = Tables<"pppoe_accounts">;
type PPPoESession = Tables<"pppoe_sessions">;
type PackageRow = Tables<"packages">;
type RouterRow = Tables<"routers">;

const initialForm = {
  full_name: "",
  phone: "",
  username: "",
  password: "",
  router_id: "",
  package_id: "",
  speed_limit: "",
  data_limit: "",
  bandwidth_profile: "",
  session_limit: "1",
  static_ip: "",
  notes: "",
  recurring_enabled: "yes",
  billing_cycle: "monthly",
  billing_amount: "",
  next_billing_date: "",
  expires_at: "",
};

export default function PPPoEPage() {
  const [accounts, setAccounts] = useState<PPPoEAccount[]>([]);
  const [sessions, setSessions] = useState<PPPoESession[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [routers, setRouters] = useState<RouterRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    const [
      { data: accountData, error: accountError },
      { data: sessionData, error: sessionError },
      { data: packageData, error: packageError },
      { data: routerData, error: routerError },
    ] = await Promise.all([
      supabase.from("pppoe_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("pppoe_sessions").select("*").order("connected_at", { ascending: false }).limit(10),
      supabase.from("packages").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("routers").select("*").eq("connection_type", "pppoe").order("created_at", { ascending: false }),
    ]);

    if (accountError || sessionError || packageError || routerError) {
      toast.error("Failed to load PPPoE data");
    }

    setAccounts(accountData || []);
    setSessions(sessionData || []);
    setPackages(packageData || []);
    setRouters(routerData || []);
    setLoading(false);
  };

  const packageMap = useMemo(() => new Map(packages.map((item) => [item.id, item])), [packages]);
  const routerMap = useMemo(() => new Map(routers.map((item) => [item.id, item])), [routers]);

  const filteredAccounts = accounts.filter((account) => {
    const term = search.toLowerCase();
    return (
      account.full_name.toLowerCase().includes(term) ||
      account.username.toLowerCase().includes(term) ||
      (account.phone || "").toLowerCase().includes(term)
    );
  });

  const activeAccounts = accounts.filter((account) => account.service_status === "active").length;
  const suspendedAccounts = accounts.filter((account) => account.service_status === "suspended").length;
  const onlineSessions = sessions.filter((session) => session.status === "online").length;

  const resetForm = () => setForm(initialForm);

  const handlePackageChange = (packageId: string) => {
    const selectedPackage = packageMap.get(packageId);
    setForm((current) => ({
      ...current,
      package_id: packageId,
      speed_limit: selectedPackage?.speed_limit || current.speed_limit,
      data_limit: selectedPackage?.data_limit || current.data_limit,
      bandwidth_profile: selectedPackage?.name || current.bandwidth_profile,
      billing_amount:
        selectedPackage?.price != null
          ? String(selectedPackage.price)
          : current.billing_amount,
    }));
  };

  const handleCreateSubscriber = async () => {
    if (!form.full_name || !form.username || !form.password) {
      toast.error("Full name, username, and password are required");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1);

    const { error } = await supabase.from("pppoe_accounts").insert({
      user_id: user.id,
      org_id: orgs?.[0]?.id || null,
      router_id: form.router_id || null,
      package_id: form.package_id || null,
      full_name: form.full_name,
      phone: form.phone || null,
      username: form.username,
      password: form.password,
      service_status: "active",
      speed_limit: form.speed_limit || null,
      data_limit: form.data_limit || null,
      bandwidth_profile: form.bandwidth_profile || null,
      session_limit: Number(form.session_limit) || 1,
      static_ip: form.static_ip || null,
      notes: form.notes || null,
      recurring_enabled: form.recurring_enabled === "yes",
      billing_cycle: form.billing_cycle,
      billing_amount: Number(form.billing_amount) || 0,
      next_billing_date: form.next_billing_date
        ? new Date(form.next_billing_date).toISOString()
        : form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });

    if (error) {
      toast.error(error.message || "Failed to create PPPoE subscriber");
      return;
    }

    toast.success("PPPoE subscriber created");
    setDialogOpen(false);
    resetForm();
    void fetchData();
  };

  const handleToggleStatus = async (account: PPPoEAccount) => {
    const nextStatus = account.service_status === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("pppoe_accounts")
      .update({ service_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", account.id);

    if (error) {
      toast.error("Failed to update subscriber status");
      return;
    }

    toast.success(`Subscriber ${nextStatus}`);
    void fetchData();
  };

  const handleDelete = async (accountId: string) => {
    const { error } = await supabase.from("pppoe_accounts").delete().eq("id", accountId);
    if (error) {
      toast.error("Failed to delete subscriber");
      return;
    }

    toast.success("Subscriber deleted");
    void fetchData();
  };

  const handleDisconnectSession = async (session: PPPoESession) => {
    const { error } = await supabase
      .from("pppoe_sessions")
      .update({ status: "offline", disconnected_at: new Date().toISOString() })
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to disconnect session");
      return;
    }

    toast.success("PPPoE session disconnected");
    void fetchData();
  };

  const formatTraffic = (value: number) => {
    if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <AdminLayout>
      <PageHeader
        title="PPPoE"
        subtitle="Manage PPPoE subscribers, credentials, speed profiles, and active sessions"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search subscriber..."
            className="w-64 pl-9"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Add PPPoE User
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-h-[90vh] overflow-y-auto border-border sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Create PPPoE Subscriber</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input className="mt-1.5" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1.5" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="07XXXXXXXX" />
              </div>
              <div>
                <Label>PPPoE Username</Label>
                <Input className="mt-1.5 font-mono" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="client001" />
              </div>
              <div>
                <Label>Password</Label>
                <Input className="mt-1.5 font-mono" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="secret123" />
              </div>
              <div>
                <Label>PPPoE Router</Label>
                <Select value={form.router_id} onValueChange={(value) => setForm((current) => ({ ...current, router_id: value }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select PPPoE router" />
                  </SelectTrigger>
                  <SelectContent>
                    {routers.map((router) => (
                      <SelectItem key={router.id} value={router.id}>
                        {router.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Package</Label>
                <Select value={form.package_id} onValueChange={handlePackageChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Speed Limit</Label>
                <Input className="mt-1.5" value={form.speed_limit} onChange={(event) => setForm((current) => ({ ...current, speed_limit: event.target.value }))} placeholder="10M/10M" />
              </div>
              <div>
                <Label>Data Limit</Label>
                <Input className="mt-1.5" value={form.data_limit} onChange={(event) => setForm((current) => ({ ...current, data_limit: event.target.value }))} placeholder="100 GB" />
              </div>
              <div>
                <Label>Bandwidth Profile</Label>
                <Input className="mt-1.5" value={form.bandwidth_profile} onChange={(event) => setForm((current) => ({ ...current, bandwidth_profile: event.target.value }))} placeholder="Home-10M" />
              </div>
              <div>
                <Label>Session Limit</Label>
                <Input className="mt-1.5" type="number" min="1" value={form.session_limit} onChange={(event) => setForm((current) => ({ ...current, session_limit: event.target.value }))} placeholder="1" />
              </div>
              <div>
                <Label>Static IP</Label>
                <Input className="mt-1.5" value={form.static_ip} onChange={(event) => setForm((current) => ({ ...current, static_ip: event.target.value }))} placeholder="172.16.10.10" />
              </div>
              <div>
                <Label>Recurring Billing</Label>
                <Select value={form.recurring_enabled} onValueChange={(value) => setForm((current) => ({ ...current, recurring_enabled: value }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose recurring mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Recurring monthly</SelectItem>
                    <SelectItem value="no">One-time billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(value) => setForm((current) => ({ ...current, billing_cycle: value }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Amount</Label>
                <Input className="mt-1.5" type="number" min="0" step="0.01" value={form.billing_amount} onChange={(event) => setForm((current) => ({ ...current, billing_amount: event.target.value }))} placeholder="5000" />
              </div>
              <div>
                <Label>Next Billing Date</Label>
                <Input className="mt-1.5" type="datetime-local" value={form.next_billing_date} onChange={(event) => setForm((current) => ({ ...current, next_billing_date: event.target.value }))} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input className="mt-1.5" type="datetime-local" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Input className="mt-1.5" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Installation notes or plan comments" />
              </div>
            </div>
            <Button className="mt-4 w-full bg-primary text-primary-foreground" onClick={handleCreateSubscriber}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Save PPPoE Subscriber
            </Button>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-6 rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Cable className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold">PPPoE lets each customer log in with a username and password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this section to manage subscriber credentials, assign bandwidth profiles, limit simultaneous sessions,
              and track who is online on your PPPoE routers.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} title="Subscribers" value={String(accounts.length)} change={`${activeAccounts} active accounts`} changeType="up" />
        <StatCard icon={Wifi} title="Online Sessions" value={String(onlineSessions)} change={onlineSessions > 0 ? "Live PPPoE users" : "No active PPPoE sessions"} changeType={onlineSessions > 0 ? "up" : "neutral"} />
        <StatCard icon={Ban} title="Suspended" value={String(suspendedAccounts)} change={suspendedAccounts > 0 ? "Needs review or payment" : "All accounts are clear"} changeType={suspendedAccounts > 0 ? "down" : "neutral"} />
        <StatCard icon={Clock3} title="PPPoE Routers" value={String(routers.length)} change={routers.length > 0 ? "Routers ready for PPPoE" : "Add a PPPoE router first"} changeType={routers.length > 0 ? "up" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr,1fr]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-sm font-semibold">Subscribers</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Cable className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No PPPoE subscribers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Subscriber</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Router</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Package</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Billing</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Speed</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => {
                    const assignedRouter = account.router_id ? routerMap.get(account.router_id) : null;
                    const assignedPackage = account.package_id ? packageMap.get(account.package_id) : null;
                    return (
                      <tr key={account.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{account.full_name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{account.username}</p>
                            {account.phone && <p className="text-xs text-muted-foreground">{account.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{assignedRouter?.name || "Not assigned"}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p>{assignedPackage?.name || "Custom"}</p>
                            <p className="text-xs text-muted-foreground">{assignedPackage?.duration_label || account.bandwidth_profile || "Manual profile"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>
                            KES {Number(account.billing_amount || assignedPackage?.price || 0).toLocaleString()}
                          </div>
                          <div className="text-muted-foreground">
                            {account.recurring_enabled ? account.billing_cycle : "one-time"}
                          </div>
                          <div className="text-muted-foreground">
                            Due {account.next_billing_date ? new Date(account.next_billing_date).toLocaleDateString() : "not set"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{account.speed_limit || "Not set"}</div>
                          <div className="text-muted-foreground">Sessions: {account.session_limit}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${account.service_status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                            {account.service_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card border-border">
                              <DropdownMenuItem onClick={() => handleToggleStatus(account)}>
                                {account.service_status === "active" ? "Suspend account" : "Activate account"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-sm font-semibold">Recent PPPoE Sessions</h3>
          </div>
          <div className="space-y-3 p-5">
            {sessions.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No PPPoE sessions recorded yet</p>
              </div>
            ) : (
              sessions.map((session) => {
                const router = session.router_id ? routerMap.get(session.router_id) : null;
                return (
                  <div key={session.id} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs">{session.username}</p>
                        <p className="text-xs text-muted-foreground">{router?.name || "Unknown router"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${session.status === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>IP: {session.ip_address || "Not assigned"}</p>
                      <p>Uptime: {formatUptime(session.uptime_seconds)}</p>
                      <p>Traffic: {formatTraffic(session.bytes_in + session.bytes_out)}</p>
                    </div>
                    {session.status === "online" && (
                      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => handleDisconnectSession(session)}>
                        Disconnect session
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
