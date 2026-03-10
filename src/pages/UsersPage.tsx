import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserX, Wifi, WifiOff } from "lucide-react";

const mockUsers = [
  { phone: "0712345678", mac: "AA:BB:CC:DD:EE:01", device: "iPhone 14", package: "Full Day", status: "Active", connected: "2h 15m", router: "Router 1" },
  { phone: "0798765432", mac: "AA:BB:CC:DD:EE:02", device: "Samsung S23", package: "2 Hours", status: "Active", connected: "45m", router: "Router 1" },
  { phone: "0723456789", mac: "AA:BB:CC:DD:EE:03", device: "MacBook Pro", package: "Half Day", status: "Expired", connected: "6h 0m", router: "Router 2" },
  { phone: "0701234567", mac: "AA:BB:CC:DD:EE:04", device: "Pixel 8", package: "2 Hours", status: "Active", connected: "1h 20m", router: "Router 1" },
  { phone: "0745678901", mac: "AA:BB:CC:DD:EE:05", device: "iPad Air", package: "Full Day", status: "Active", connected: "5h 30m", router: "Router 2" },
  { phone: "0756789012", mac: "AA:BB:CC:DD:EE:06", device: "Dell Laptop", package: "Weekly Pass", status: "Active", connected: "3d 4h", router: "Router 1" },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const filtered = mockUsers.filter(u => u.phone.includes(search) || u.device.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <PageHeader title="Users & Sessions" subtitle="Manage connected users and active sessions">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by phone or device..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </PageHeader>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Phone</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Device</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">MAC</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Package</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Connected</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Router</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">{u.phone}</td>
                  <td className="py-3 px-4">{u.device}</td>
                  <td className="py-3 px-4 font-mono text-xs hidden md:table-cell">{u.mac}</td>
                  <td className="py-3 px-4">{u.package}</td>
                  <td className="py-3 px-4">{u.connected}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">{u.router}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      u.status === "Active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {u.status === "Active" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 h-7 text-xs">
                        <UserX className="w-3 h-3 mr-1" /> Disconnect
                      </Button>
                    </div>
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
