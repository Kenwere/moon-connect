import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Router as RouterIcon, Settings, Wifi, WifiOff, Copy, Check, Link2, Download, RefreshCw, Trash2, MoreHorizontal, Eye, RotateCcw, Power } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateMikroTikScript } from "@/lib/mikrotik-script";

interface RouterDevice {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  api_port: number;
  username: string;
  model: string;
  status: string;
  active_users: number;
  payment_destination: string;
  disable_sharing: boolean;
  device_tracking: boolean;
  bandwidth_control: boolean;
  session_logging: boolean;
  dns_name: string | null;
  hotspot_address: string | null;
  provision_token: string | null;
  org_id: string | null;
  connection_type?: string;
  created_at?: string;
  password?: string;
  cpu_load?: number;
  free_memory?: number;
  total_memory?: number;
  hotspot_active_users?: number;
  pppoe_active_users?: number;
  uptime_seconds?: number;
  uptime_24h?: number;
  downtime_24h?: number;
  availability_24h?: number;
  board_name?: string;
  version?: string;
  last_seen_at?: string;
}

const emptyForm = {
  name: "",
  location: "",
  ip_address: "192.168.88.1",
  api_port: 8728,
  username: "admin",
  password: "",
  dns_name: "hotspot.local",
  hotspot_address: "10.5.50.1/24",
  payment_destination: "Till",
  connection_type: "hotspot",
  disable_sharing: false,
  device_tracking: true,
  bandwidth_control: true,
  session_logging: true,
};

function formatDuration(seconds?: number) {
  if (!seconds) return "0m";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatPercent(value?: number) {
  return value === undefined ? "N/A" : `${value.toFixed(1)}%`;
}

function formatMemory(bytes?: number) {
  if (!bytes) return "N/A";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Routers() {
  const [routers, setRouters] = useState<RouterDevice[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRouter, setSelectedRouter] = useState<RouterDevice | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provisionServiceReady, setProvisionServiceReady] = useState<boolean | null>(null);
  const [provisionServiceMessage, setProvisionServiceMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    void fetchRouters();
  }, []);

  const getProvisionUrl = (token: string) =>
    `${supabaseUrl}/functions/v1/provision-router?token=${token}`;

  const getMikroTikCommand = (token: string) =>
    `/tool fetch url="${getProvisionUrl(token)}" mode=https dst-path=moonconnect.rsc; :delay 2s; /import moonconnect.rsc;`;

  const mergeRouterStatus = (
    router: RouterDevice,
    data: Record<string, unknown>,
  ): RouterDevice => ({
    ...router,
    status: String(data.status || router.status),
    active_users: Number(data.active_users ?? router.active_users ?? 0),
    model: String(data.model || router.model || ""),
    cpu_load: Number(data.cpu_load ?? router.cpu_load ?? 0),
    free_memory: Number(data.free_memory ?? router.free_memory ?? 0),
    total_memory: Number(data.total_memory ?? router.total_memory ?? 0),
    hotspot_active_users: Number(data.hotspot_active_users ?? router.hotspot_active_users ?? 0),
    pppoe_active_users: Number(data.pppoe_active_users ?? router.pppoe_active_users ?? 0),
    uptime_seconds: Number(data.uptime_seconds ?? router.uptime_seconds ?? 0),
    uptime_24h: Number(data.uptime_24h ?? router.uptime_24h ?? 0),
    downtime_24h: Number(data.downtime_24h ?? router.downtime_24h ?? 0),
    availability_24h: Number(data.availability_24h ?? router.availability_24h ?? 0),
    board_name: String(data.board_name || router.board_name || ""),
    version: String(data.version || router.version || ""),
    last_seen_at: String(data.last_seen_at || router.last_seen_at || ""),
  });

  const fetchRouters = async () => {
    const { data, error } = await supabase.from("routers").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load routers");
    else setRouters((data as RouterDevice[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: orgs } = await supabase.from("organizations").select("id").eq("owner_id", user.id).limit(1);
    const orgId = orgs?.[0]?.id || null;
    const { error } = await supabase.from("routers").insert({
      user_id: user.id,
      org_id: orgId,
      name: form.name,
      location: form.location,
      ip_address: form.ip_address,
      api_port: form.api_port,
      username: form.username,
      password: form.password,
      dns_name: form.dns_name,
      hotspot_address: form.hotspot_address,
      payment_destination: form.payment_destination,
      connection_type: form.connection_type,
      disable_sharing: form.disable_sharing,
      device_tracking: form.device_tracking,
      bandwidth_control: form.bandwidth_control,
      session_logging: form.session_logging,
    } as RouterDevice);
    if (error) toast.error("Failed to add router");
    else {
      toast.success("Router added!");
      setDialogOpen(false);
      void fetchRouters();
      setForm(emptyForm);
    }
  };

  const deleteRouter = async (id: string) => {
    const { error } = await supabase.from("routers").delete().eq("id", id);
    if (error) toast.error("Failed to delete router");
    else {
      toast.success("Router deleted");
      void fetchRouters();
    }
  };

  const refreshToken = async (routerId: string) => {
    const newToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("routers").update({ provision_token: newToken } as RouterDevice).eq("id", routerId);
    if (error) toast.error("Failed to refresh link");
    else {
      toast.success("Provision link refreshed!");
      void fetchRouters();
      if (selectedRouter?.id === routerId) setSelectedRouter({ ...selectedRouter, provision_token: newToken });
    }
  };

  const refreshRouterStatus = async (routerId: string) => {
    const { data, error } = await supabase.functions.invoke("router-status", {
      body: { router_id: routerId },
    });
    if (error) {
      toast.error("Failed to check router status");
      return;
    }
    setRouters((current) =>
      current.map((router) =>
        router.id === routerId
          ? mergeRouterStatus(router, (data || {}) as Record<string, unknown>)
          : router,
      ),
    );
    if (selectedRouter?.id === routerId) {
      setSelectedRouter(
        mergeRouterStatus(selectedRouter, (data || {}) as Record<string, unknown>),
      );
    }
    toast.success(`Router is ${data?.status || "updated"}`);
  };

  const restartRouterDevice = async (routerId: string) => {
    const { data, error } = await supabase.functions.invoke("router-restart", {
      body: { router_id: routerId },
    });
    if (error) {
      toast.error("Failed to restart router");
      return;
    }
    setRouters((current) =>
      current.map((router) =>
        router.id === routerId
          ? { ...router, status: String(data?.status || "Restarting") }
          : router,
      ),
    );
    if (selectedRouter?.id === routerId) {
      setSelectedRouter({
        ...selectedRouter,
        status: String(data?.status || "Restarting"),
      });
    }
    toast.success("Router restart command sent");
  };

  const downloadRsc = (router: RouterDevice) => {
    const script = generateMikroTikScript({
      provisionUrl: getProvisionUrl(router.provision_token || ""),
    });
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "moonconnect.rsc";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("moonconnect.rsc downloaded!");
  };

  const checkProvisionService = async (token: string) => {
    try {
      const response = await fetch(getProvisionUrl(token), { method: "GET" });
      if (response.ok) {
        setProvisionServiceReady(true);
        setProvisionServiceMessage(null);
        return;
      }
      setProvisionServiceReady(false);
      if (response.status === 401) {
        const message =
          "Provision function is live but still protected by Supabase auth. Redeploy `provision-router` with `verify_jwt = false` so MikroTik can fetch it directly.";
        setProvisionServiceMessage(message);
        toast.error(message);
        return;
      }
      const message =
        "Provision function could not be reached from this deployment. Use the .rsc download until the Supabase function is redeployed.";
      setProvisionServiceMessage(message);
      toast.error(message);
    } catch {
      setProvisionServiceReady(false);
      setProvisionServiceMessage(
        "Provision function could not be reached from this deployment. Use the .rsc download until the Supabase function is redeployed.",
      );
      toast.error("Provision service could not be reached. Use the .rsc download for now.");
    }
  };

  const openProvision = (router: RouterDevice) => {
    setSelectedRouter(router);
    setProvisionDialogOpen(true);
    setCopiedLink(false);
    setCopiedCmd(false);
    setProvisionServiceReady(null);
    setProvisionServiceMessage(null);
    if (router.provision_token) void checkProvisionService(router.provision_token);
  };

  const openDetail = (router: RouterDevice) => {
    setSelectedRouter(router);
    setDetailDialogOpen(true);
  };

  const copyToClipboard = async (text: string, type: "link" | "cmd") => {
    await navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 3000);
    }
    toast.success("Copied to clipboard!");
  };

  return (
    <AdminLayout>
      <PageHeader title="Routers" subtitle="Manage MikroTik routers across locations">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-medium"><Plus className="w-4 h-4 mr-2" /> Add Router</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Add MikroTik Router</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Router Name</Label><Input placeholder="e.g. Main Router" className="mt-1.5" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Location</Label><Input placeholder="e.g. Cafe" className="mt-1.5" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div>
                <Label>Connection Type</Label>
                <Select value={form.connection_type} onValueChange={v => setForm(f => ({ ...f, connection_type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotspot">Hotspot</SelectItem>
                    <SelectItem value="pppoe">PPPoE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>IP Address</Label><Input placeholder="192.168.88.1" className="mt-1.5" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} /></div>
                <div><Label>API Port</Label><Input type="number" placeholder="8728" className="mt-1.5" value={form.api_port} onChange={e => setForm(f => ({ ...f, api_port: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Username</Label><Input placeholder="admin" className="mt-1.5" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
                <div><Label>Password</Label><Input type="password" className="mt-1.5" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>DNS Name</Label><Input placeholder="hotspot.local" className="mt-1.5" value={form.dns_name} onChange={e => setForm(f => ({ ...f, dns_name: e.target.value }))} /></div>
                <div><Label>Hotspot Address</Label><Input placeholder="10.5.50.1/24" className="mt-1.5" value={form.hotspot_address} onChange={e => setForm(f => ({ ...f, hotspot_address: e.target.value }))} /></div>
              </div>
              <div><Label>Payment Destination</Label><Input placeholder="Till / Paybill" className="mt-1.5" value={form.payment_destination} onChange={e => setForm(f => ({ ...f, payment_destination: e.target.value }))} /></div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between"><Label>Disable hotspot sharing</Label><Switch checked={form.disable_sharing} onCheckedChange={v => setForm(f => ({ ...f, disable_sharing: v }))} /></div>
                <div className="flex items-center justify-between"><Label>Enable device tracking</Label><Switch checked={form.device_tracking} onCheckedChange={v => setForm(f => ({ ...f, device_tracking: v }))} /></div>
                <div className="flex items-center justify-between"><Label>Enable bandwidth control</Label><Switch checked={form.bandwidth_control} onCheckedChange={v => setForm(f => ({ ...f, bandwidth_control: v }))} /></div>
                <div className="flex items-center justify-between"><Label>Enable session logging</Label><Switch checked={form.session_logging} onCheckedChange={v => setForm(f => ({ ...f, session_logging: v }))} /></div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground" onClick={handleAdd}><Settings className="w-4 h-4 mr-2" /> Add Router</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={provisionDialogOpen} onOpenChange={setProvisionDialogOpen}>
        <DialogContent className="glass-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Provision - {selectedRouter?.name}</DialogTitle>
          </DialogHeader>
          {selectedRouter?.provision_token && (
            <div className="space-y-5 mt-2">
              <div>
                <h4 className="text-sm font-semibold mb-2">Option 1: Auto-Provision via Terminal</h4>
                <p className="text-xs text-muted-foreground mb-3">Paste in MikroTik Terminal to download the MoonConnect bootstrap script, then let it pull the full config and hotspot files.</p>
                {provisionServiceReady === false && (
                  <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    {provisionServiceMessage || "Auto-provision is unavailable right now."}
                  </div>
                )}
                <div className="relative">
                  <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{getMikroTikCommand(selectedRouter.provision_token)}</pre>
                  <Button size="sm" variant="outline" className="absolute top-2 right-2" disabled={provisionServiceReady === false} onClick={() => copyToClipboard(getMikroTikCommand(selectedRouter.provision_token!), "cmd")}>
                    {copiedCmd ? <Check className="w-3 h-3 mr-1 text-success" /> : <Copy className="w-3 h-3 mr-1" />} {copiedCmd ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Option 2: Download .rsc File</h4>
                <p className="text-xs text-muted-foreground mb-3">Upload the bootstrap `.rsc` to MikroTik Files, then run: <code className="text-primary">/import moonconnect.rsc</code></p>
                <Button variant="outline" size="sm" onClick={() => downloadRsc(selectedRouter)}><Download className="w-4 h-4 mr-2" /> Download moonconnect.rsc</Button>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => refreshToken(selectedRouter.id)}><RefreshCw className="w-4 h-4 mr-1" /> Refresh Link</Button>
                <Button variant="outline" size="sm" onClick={() => refreshRouterStatus(selectedRouter.id)}><RotateCcw className="w-4 h-4 mr-1" /> Check Status</Button>
                <Button variant="outline" size="sm" className="text-warning hover:bg-warning/10" onClick={() => restartRouterDevice(selectedRouter.id)}><Power className="w-4 h-4 mr-1" /> Restart</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="glass-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><RouterIcon className="w-5 h-5 text-primary" /> {selectedRouter?.name}</DialogTitle>
          </DialogHeader>
          {selectedRouter && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Status</p><p className={`font-medium ${selectedRouter.status === "Online" ? "text-success" : "text-destructive"}`}>{selectedRouter.status}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Type</p><p className="font-medium capitalize">{selectedRouter.connection_type || "hotspot"}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">IP Address</p><p className="font-mono text-xs">{selectedRouter.ip_address}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">API Port</p><p className="font-mono text-xs">{selectedRouter.api_port}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Model</p><p>{selectedRouter.model}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Active Users</p><p className="font-display font-bold text-primary">{selectedRouter.active_users}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Location</p><p>{selectedRouter.location || "-"}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">DNS Name</p><p className="font-mono text-xs">{selectedRouter.dns_name || "-"}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">CPU Load</p><p className="font-medium">{selectedRouter.cpu_load ?? 0}%</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Current Uptime</p><p className="font-medium">{formatDuration(selectedRouter.uptime_seconds)}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">24h Availability</p><p className="font-medium">{formatPercent(selectedRouter.availability_24h)}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">24h Downtime</p><p className="font-medium">{formatDuration(selectedRouter.downtime_24h)}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Hotspot Users</p><p className="font-medium">{selectedRouter.hotspot_active_users ?? 0}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">PPPoE Users</p><p className="font-medium">{selectedRouter.pppoe_active_users ?? 0}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Memory</p><p className="font-medium">{formatMemory(selectedRouter.free_memory)} free / {formatMemory(selectedRouter.total_memory)}</p></div>
                <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">{selectedRouter.version || selectedRouter.board_name || "-"}</p></div>
                <div className="bg-muted/30 rounded-lg p-3 lg:col-span-3"><p className="text-xs text-muted-foreground">Last Checked</p><p className="font-medium">{selectedRouter.last_seen_at ? new Date(selectedRouter.last_seen_at).toLocaleString() : "Run Status to fetch live metrics"}</p></div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => { setDetailDialogOpen(false); openProvision(selectedRouter); }}><Link2 className="w-3 h-3 mr-1" /> Provision</Button>
                <Button variant="outline" size="sm" onClick={() => refreshRouterStatus(selectedRouter.id)}><RotateCcw className="w-3 h-3 mr-1" /> Status</Button>
                <Button variant="outline" size="sm" className="text-warning hover:bg-warning/10" onClick={() => restartRouterDevice(selectedRouter.id)}><Power className="w-3 h-3 mr-1" /> Restart</Button>
                <Button variant="outline" size="sm" onClick={() => downloadRsc(selectedRouter)}><Download className="w-3 h-3 mr-1" /> .rsc</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { void deleteRouter(selectedRouter.id); setDetailDialogOpen(false); }}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : routers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <RouterIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No routers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first MikroTik router to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routers.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${r.status === "Online" ? "bg-success/15" : "bg-muted"}`}>
                    {r.status === "Online" ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.location}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-border">
                    <DropdownMenuItem onClick={() => openDetail(r)}><Eye className="w-3.5 h-3.5 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => refreshRouterStatus(r.id)}><RotateCcw className="w-3.5 h-3.5 mr-2" /> Check Status</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => restartRouterDevice(r.id)}><Power className="w-3.5 h-3.5 mr-2" /> Restart Router</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openProvision(r)}><Link2 className="w-3.5 h-3.5 mr-2" /> Provision</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadRsc(r)}><Download className="w-3.5 h-3.5 mr-2" /> Download .rsc</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void deleteRouter(r.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "Online" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{r.status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize text-xs">{r.connection_type || "hotspot"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-xs">{r.ip_address}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active Users</span><span className="font-display font-bold text-primary">{r.active_users}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPU</span><span className="text-xs">{r.cpu_load ?? 0}%</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => refreshRouterStatus(r.id)}><RotateCcw className="w-3 h-3 mr-1" /> Status</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openProvision(r)}><Link2 className="w-3 h-3 mr-1" /> Provision</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetail(r)}><Eye className="w-3 h-3 mr-1" /> Details</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
