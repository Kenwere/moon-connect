import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Zap } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  duration: string;
  speedLimit?: string;
  dataLimit?: string;
  active: boolean;
}

const initialPackages: Package[] = [
  { id: "1", name: "Quick Browse", price: 15, duration: "2 Hours", speedLimit: "5 Mbps", active: true },
  { id: "2", name: "Half Day", price: 30, duration: "6 Hours", speedLimit: "10 Mbps", active: true },
  { id: "3", name: "Full Day", price: 60, duration: "24 Hours", speedLimit: "20 Mbps", active: true },
  { id: "4", name: "Weekly Pass", price: 350, duration: "7 Days", speedLimit: "20 Mbps", dataLimit: "10 GB", active: true },
  { id: "5", name: "Monthly", price: 1200, duration: "30 Days", speedLimit: "50 Mbps", dataLimit: "50 GB", active: false },
];

export default function Packages() {
  const [packages, setPackages] = useState(initialPackages);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleActive = (id: string) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const deletePackage = (id: string) => {
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  return (
    <AdminLayout>
      <PageHeader title="Packages" subtitle="Manage internet access packages">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-medium">
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Create Package</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Package Name</Label><Input placeholder="e.g. Quick Browse" className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price (KSH)</Label><Input type="number" placeholder="15" className="mt-1.5" /></div>
                <div><Label>Duration</Label><Input placeholder="e.g. 2 Hours" className="mt-1.5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Speed Limit</Label><Input placeholder="e.g. 5 Mbps" className="mt-1.5" /></div>
                <div><Label>Data Limit</Label><Input placeholder="e.g. 5 GB" className="mt-1.5" /></div>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => setDialogOpen(false)}>Create Package</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`glass-card-glow rounded-xl p-5 transition-all ${!pkg.active && "opacity-50"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-sm">{pkg.name}</h3>
              </div>
              <Switch checked={pkg.active} onCheckedChange={() => toggleActive(pkg.id)} />
            </div>
            <p className="text-3xl font-display font-bold gradient-text mb-1">KSH {pkg.price}</p>
            <p className="text-sm text-muted-foreground mb-4">{pkg.duration}</p>
            <div className="flex gap-2 text-xs text-muted-foreground mb-4">
              {pkg.speedLimit && <span className="px-2 py-1 rounded-md bg-muted">{pkg.speedLimit}</span>}
              {pkg.dataLimit && <span className="px-2 py-1 rounded-md bg-muted">{pkg.dataLimit}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1"><Edit className="w-3 h-3 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deletePackage(pkg.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
