import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Router as RouterIcon, Settings, Wifi, WifiOff } from "lucide-react";

interface RouterDevice {
  id: string;
  name: string;
  location: string;
  ip: string;
  model: string;
  status: "Online" | "Offline";
  activeUsers: number;
  paymentDest: string;
}

const mockRouters: RouterDevice[] = [
  { id: "1", name: "Router 1", location: "Main Cafe", ip: "192.168.88.1", model: "RB951", status: "Online", activeUsers: 45, paymentDest: "M-Pesa Till" },
  { id: "2", name: "Router 2", location: "Hostel Block A", ip: "192.168.88.2", model: "hAP ac²", status: "Online", activeUsers: 32, paymentDest: "M-Pesa Paybill" },
  { id: "3", name: "Router 3", location: "Library", ip: "192.168.88.3", model: "RB951", status: "Offline", activeUsers: 0, paymentDest: "Paystack" },
];

export default function Routers() {
  const [routers] = useState(mockRouters);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="Routers" subtitle="Manage MikroTik routers across locations">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-medium">
              <Plus className="w-4 h-4 mr-2" /> Add Router
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Add MikroTik Router</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Router Name</Label><Input placeholder="e.g. Main Router" className="mt-1.5" /></div>
              <div><Label>Location</Label><Input placeholder="e.g. Cafe" className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>IP Address</Label><Input placeholder="192.168.88.1" className="mt-1.5" /></div>
                <div><Label>API Port</Label><Input placeholder="8728" className="mt-1.5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Username</Label><Input placeholder="admin" className="mt-1.5" /></div>
                <div><Label>Password</Label><Input type="password" className="mt-1.5" /></div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between"><Label>Disable hotspot sharing</Label><Switch /></div>
                <div className="flex items-center justify-between"><Label>Enable device tracking</Label><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Enable bandwidth control</Label><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Enable session logging</Label><Switch defaultChecked /></div>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => setDialogOpen(false)}>
                <Settings className="w-4 h-4 mr-2" /> Setup MikroTik
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routers.map((r) => (
          <div key={r.id} className="glass-card-glow rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  r.status === "Online" ? "bg-success/15" : "bg-muted"
                }`}>
                  {r.status === "Online" ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.location}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                r.status === "Online" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}>{r.status}</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-xs">{r.ip}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span>{r.model}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Users</span><span className="font-display font-bold text-primary">{r.activeUsers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{r.paymentDest}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1"><Settings className="w-3 h-3 mr-1" /> Configure</Button>
              <Button variant="outline" size="sm" className="flex-1"><RouterIcon className="w-3 h-3 mr-1" /> Auto Setup</Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
