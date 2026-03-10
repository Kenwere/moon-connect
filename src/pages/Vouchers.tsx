import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Send, Ticket } from "lucide-react";

interface Voucher {
  code: string;
  package: string;
  expiry: string;
  status: "Unused" | "Used";
  createdAt: string;
}

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="Vouchers" subtitle="Generate and manage WiFi access vouchers">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-medium">
              <Plus className="w-4 h-4 mr-2" /> Generate Vouchers
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Generate Vouchers</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Number of Vouchers</Label><Input type="number" placeholder="10" className="mt-1.5" /></div>
              <div>
                <Label>Package</Label>
                <Select>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2h">Quick Browse - 2 Hours</SelectItem>
                    <SelectItem value="6h">Half Day - 6 Hours</SelectItem>
                    <SelectItem value="24h">Full Day - 24 Hours</SelectItem>
                    <SelectItem value="7d">Weekly Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Expiry Date</Label><Input type="date" className="mt-1.5" /></div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => setDialogOpen(false)}>Generate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {vouchers.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Ticket className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No vouchers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Generate vouchers to provide WiFi access codes</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Package</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Created</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Expiry</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                        <Ticket className="w-3 h-3 text-primary" /> {v.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">{v.package}</td>
                    <td className="py-3 px-4">{v.createdAt}</td>
                    <td className="py-3 px-4">{v.expiry}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        v.status === "Unused" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}>{v.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs"><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs"><Send className="w-3 h-3 mr-1" /> Send</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
