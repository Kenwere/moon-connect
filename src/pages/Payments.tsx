import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  phone: string;
  package_name: string;
  amount: number;
  method: string;
  router_name: string | null;
  session_expiry: string | null;
  status: string;
  transaction_id: string | null;
  provider_reference: string | null;
  billing_cycle: string | null;
  period_end: string | null;
  created_at: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayments((data as Payment[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = payments.filter(
    (payment) =>
      payment.phone.includes(search) ||
      payment.package_name.toLowerCase().includes(search.toLowerCase()),
  );

  const exportCSV = () => {
    const csv = [
      "Phone,Package,Amount,Method,Billing Cycle,Status,Date,Provider Reference",
      ...filtered.map(
        (payment) =>
          `${payment.phone},${payment.package_name},${payment.amount},${payment.method},${payment.billing_cycle || ""},${payment.status},${payment.created_at},${payment.provider_reference || ""}`,
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <PageHeader title="Payment Logs" subtitle="Track payment status, billing cycles, and renewals">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone or package..."
              className="w-56 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Receipt className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No payments yet</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Package</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Billing</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{payment.phone}</td>
                    <td className="px-4 py-3">{payment.package_name}</td>
                    <td className="px-4 py-3 font-medium">
                      KSH {Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">{payment.method}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs">
                      <div>{payment.billing_cycle || "one-time"}</div>
                      <div className="text-muted-foreground">
                        {payment.period_end
                          ? `Ends ${new Date(payment.period_end).toLocaleDateString()}`
                          : "No end date"}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 font-mono text-xs">
                      {payment.provider_reference || payment.transaction_id || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          payment.status === "Completed"
                            ? "bg-success/15 text-success"
                            : payment.status === "Pending"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {payment.status}
                      </span>
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
