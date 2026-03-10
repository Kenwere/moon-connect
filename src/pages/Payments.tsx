import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Payments() {
  const [payments, setPayments] = useState<Array<{
    phone: string;
    package: string;
    amount: number;
    method: string;
    time: string;
    date: string;
    status: string;
    router: string;
    expiry: string;
  }>>([]);
  const [search, setSearch] = useState("");
  const filtered = payments.filter(p => p.phone.includes(search));

  return (
    <AdminLayout>
      <PageHeader title="Payment Logs" subtitle="Track all payment transactions">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by phone..." className="pl-9 w-56" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No payments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Payment transactions will appear here</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Package</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Method</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Time</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Router</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Expiry</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">{p.phone}</td>
                    <td className="py-3 px-4">{p.package}</td>
                    <td className="py-3 px-4 font-medium">KSH {p.amount}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{p.method}</td>
                    <td className="py-3 px-4">{p.time}</td>
                    <td className="py-3 px-4">{p.date}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">{p.router}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-xs">{p.expiry}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === "Completed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}>{p.status}</span>
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
