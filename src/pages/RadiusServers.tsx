import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Wifi, WifiOff, Copy, Check, Trash2, MoreHorizontal, Eye, RotateCcw, Shield, Network } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RadiusServer {
  id: string;
  name: string;
  ip_address: string;
  auth_port: number;
  acct_port: number;
  secret: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  ip_address: "",
  auth_port: 1812,
  acct_port: 1813,
  secret: "",
  description: "",
  is_active: true,
};

export default function RadiusServers() {
  const [servers, setServers] = useState<RadiusServer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    void fetchServers();
  }, []);

  const fetchServers = async () => {
    const { data, error } = await supabase.from("radius_servers").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load RADIUS servers");
    else setServers((data as RadiusServer[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("radius_servers").insert({
      name: form.name,
      ip_address: form.ip_address,
      auth_port: form.auth_port,
      acct_port: form.acct_port,
      secret: form.secret,
      description: form.description,
      is_active: form.is_active,
    });

    if (error) toast.error("Failed to add RADIUS server");
    else {
      toast.success("RADIUS server added!");
      setDialogOpen(false);
      void fetchServers();
      setForm(emptyForm);
    }
  };

  const deleteServer = async (id: string) => {
    const { error } = await supabase.from("radius_servers").delete().eq("id", id);
    if (error) toast.error("Failed to delete RADIUS server");
    else {
      toast.success("RADIUS server deleted!");
      void fetchServers();
    }
  };

  const toggleServer = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("radius_servers")
      .update({ is_active: !is_active })
      .eq("id", id);

    if (error) toast.error("Failed to update RADIUS server");
    else {
      toast.success(`RADIUS server ${!is_active ? "activated" : "deactivated"}!`);
      void fetchServers();
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="RADIUS Servers"
        description="Manage RADIUS authentication servers for PPPoE connections"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add RADIUS Server
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Add RADIUS Server
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Server Name</Label>
                  <Input
                    placeholder="e.g. Primary RADIUS"
                    className="mt-1.5"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    className="mt-1.5"
                    value={form.ip_address}
                    onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Auth Port</Label>
                    <Input
                      type="number"
                      placeholder="1812"
                      className="mt-1.5"
                      value={form.auth_port}
                      onChange={(e) => setForm((f) => ({ ...f, auth_port: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Acct Port</Label>
                    <Input
                      type="number"
                      placeholder="1813"
                      className="mt-1.5"
                      value={form.acct_port}
                      onChange={(e) => setForm((f) => ({ ...f, acct_port: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Shared Secret</Label>
                  <Input
                    type="password"
                    placeholder="Enter shared secret"
                    className="mt-1.5"
                    value={form.secret}
                    onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Brief description"
                    className="mt-1.5"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground mt-6" onClick={handleAdd}>
                <Settings className="w-4 h-4 mr-2" />
                Add RADIUS Server
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : servers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No RADIUS servers yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first RADIUS server to enable PPPoE authentication
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <Card key={server.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        server.is_active ? "bg-success/15" : "bg-muted"
                      }`}
                    >
                      <Shield className={`w-5 h-5 ${server.is_active ? "text-success" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-display font-semibold">{server.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{server.ip_address}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-border">
                      <DropdownMenuItem onClick={() => toggleServer(server.id, server.is_active)}>
                        {server.is_active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void deleteServer(server.id)} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={server.is_active ? "default" : "secondary"}>
                      {server.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auth Port</span>
                    <span className="font-mono text-xs">{server.auth_port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acct Port</span>
                    <span className="font-mono text-xs">{server.acct_port}</span>
                  </div>
                  {server.description && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">{server.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}