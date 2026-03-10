import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, CreditCard, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Settings" subtitle="Configure your hotspot system" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Settings */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Business Settings</h3>
          </div>
          <div className="space-y-4">
            <div><Label>Business Name</Label><Input defaultValue="HotSpot Pro Cafe" className="mt-1.5" /></div>
            <div><Label>Business Logo URL</Label><Input placeholder="https://..." className="mt-1.5" /></div>
            <div><Label>Support Phone</Label><Input defaultValue="+254712345678" className="mt-1.5" /></div>
            <div><Label>Welcome Message</Label><Input defaultValue="Welcome to fast, reliable WiFi!" className="mt-1.5" /></div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Payment Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Default Payment Method</Label>
              <Select defaultValue="till">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="till">M-Pesa Till Number</SelectItem>
                  <SelectItem value="paybill">M-Pesa Paybill</SelectItem>
                  <SelectItem value="phone">M-Pesa Phone Number</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Till / Paybill Number</Label><Input placeholder="123456" className="mt-1.5" /></div>
            <div><Label>Account Number (if Paybill)</Label><Input placeholder="Optional" className="mt-1.5" /></div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between"><Label>Enable M-Pesa Till</Label><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><Label>Enable M-Pesa Paybill</Label><Switch /></div>
              <div className="flex items-center justify-between"><Label>Enable Paystack</Label><Switch /></div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Require MAC binding</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Auto-disconnect on expiry</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Allow session resume</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Enable HTTPS</Label><Switch defaultChecked /></div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Subscription</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-success">Active - Trial</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trial Ends</span><span>2026-03-24</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Revenue</span><span className="font-display font-bold">KSH 18,500</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>KSH 500 + 3% = KSH 1,055</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button className="gradient-primary text-primary-foreground font-medium">
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
}
