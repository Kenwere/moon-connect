import { useState, useEffect } from "react";
import { Wifi, Zap, Clock, ArrowRight, Phone, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getTheme, type PortalTheme } from "@/lib/portal-themes";

interface PortalPackage {
  id: string;
  name: string;
  price: number;
  duration_label: string;
  duration_minutes: number;
  speed_limit: string | null;
  data_limit: string | null;
}

type Step = "select" | "phone" | "pay";

export default function CaptivePortal() {
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [voucher, setVoucher] = useState("");
  const [showVoucher, setShowVoucher] = useState(false);
  const [packages, setPackages] = useState<PortalPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [businessName, setBusinessName] = useState("MoonConnect");
  const [welcomeMessage, setWelcomeMessage] = useState("Fast, reliable WiFi access");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setThemeState] = useState<PortalTheme>(getTheme("classic"));
  const [orgId, setOrgId] = useState<string | null>(null);
  const [routerToken, setRouterToken] = useState<string | null>(null);
  const [deviceIp, setDeviceIp] = useState<string | null>(null);
  const [macAddress, setMacAddress] = useState<string | null>(null);

  const selectedPkg = packages.find(p => p.id === selected);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    // Determine org from subdomain or query param
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    let subdomain = "";

    // Check URL param first (for testing), then subdomain
    const params = new URLSearchParams(window.location.search);
    const paramSub = params.get("org");
    const paramRouterToken = params.get("router_token");
    const paramDeviceIp = params.get("ip");
    const paramMac = params.get("mac");

    setRouterToken(paramRouterToken);
    setDeviceIp(paramDeviceIp);
    setMacAddress(paramMac);

    if (paramSub) {
      subdomain = paramSub;
    } else if (parts.length >= 3 && parts[0] !== "www") {
      subdomain = parts[0];
    }

    let orgData: any = null;

    if (subdomain) {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("subdomain", subdomain)
        .limit(1)
        .single();
      orgData = data;
    }

    if (!orgData) {
      // Fallback: get first org (for dev/testing)
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .limit(1)
        .single();
      orgData = data;
    }

    if (orgData) {
      setOrgId(orgData.id);
      setBusinessName(orgData.name);

      // Load settings and packages in parallel
      const [settingsRes, packagesRes] = await Promise.all([
        supabase.from("settings").select("*").eq("org_id", orgData.id).limit(1).single(),
        supabase.from("packages").select("id, name, price, duration_label, duration_minutes, speed_limit, data_limit").eq("org_id", orgData.id).eq("active", true).order("price", { ascending: true }),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data as any;
        if (s.business_name) setBusinessName(s.business_name);
        if (s.welcome_message) setWelcomeMessage(s.welcome_message);
        if (s.business_logo_url) setLogoUrl(s.business_logo_url);
        setThemeState(getTheme(s.portal_theme || "classic"));
      }

      setPackages((packagesRes.data as any[]) || []);
    }

    setLoading(false);
  };

  const handlePay = async () => {
    if (!selectedPkg || !phone || !orgId) return;
    setPaying(true);

    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: {
          phone,
          package_name: selectedPkg.name,
          amount: selectedPkg.price,
          package_id: selectedPkg.id,
          duration_minutes: selectedPkg.duration_minutes,
          org_id: orgId,
          router_token: routerToken,
          device_ip: deviceIp,
          mac_address: macAddress,
        },
      });

      if (error) throw error;
      setStep("pay");
    } catch (err: any) {
      console.error("Payment error:", err);
      // Still show pay screen as fallback
      setStep("pay");
    } finally {
      setPaying(false);
    }
  };

  const t = theme;

  if (loading) {
    return (
      <div className={`min-h-screen ${t.background} flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full opacity-50" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.background} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-contain" />
          ) : (
            <div className={`w-16 h-16 rounded-2xl ${t.accent} flex items-center justify-center mx-auto mb-4`}>
              <Wifi className={`w-8 h-8 ${t.accentFg}`} />
            </div>
          )}
          <h1 className={`text-2xl font-bold ${t.textPrimary}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {businessName}
          </h1>
          <p className={`text-sm mt-1 ${t.textSecondary}`}>{welcomeMessage}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className={`text-sm font-medium ${t.textSecondary} mb-3`}>Choose your plan</h2>

              {packages.length === 0 ? (
                <div className={`${t.cardBg} border ${t.cardBorder} rounded-xl p-8 text-center`}>
                  <Wifi className={`w-10 h-10 mx-auto mb-3 ${t.textSecondary}`} />
                  <p className={`text-sm ${t.textSecondary}`}>No packages available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelected(pkg.id)}
                      className={`w-full ${t.cardBg} border ${t.cardBorder} rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] ${
                        selected === pkg.id ? `ring-2 ${t.selectedRing} shadow-md` : ""
                      } ${index === Math.floor(packages.length / 2) ? "relative" : ""}`}
                    >
                      {index === Math.floor(packages.length / 2) && packages.length > 2 && (
                        <span className={`absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.badgeBg} ${t.badgeText}`}>
                          POPULAR
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${t.accent}/15 flex items-center justify-center`}>
                          <Zap className={`w-5 h-5 ${t.textSecondary}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${t.textPrimary}`}>{pkg.name}</p>
                          <div className={`flex items-center gap-2 text-xs ${t.textSecondary} mt-0.5`}>
                            <Clock className="w-3 h-3" /> {pkg.duration_label}
                            {pkg.speed_limit && <><span>•</span><Zap className="w-3 h-3" /> {pkg.speed_limit}</>}
                          </div>
                        </div>
                        <p className="font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace", color: "inherit" }}>
                          <span className={t.textSecondary + " text-xs mr-0.5"}>KSH</span>
                          <span className={t.textPrimary}>{pkg.price}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                className={`w-full mt-4 ${t.accent} ${t.accentFg} font-medium h-12`}
                disabled={!selected}
                onClick={() => setStep("phone")}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <button
                onClick={() => setShowVoucher(!showVoucher)}
                className={`w-full text-center text-xs ${t.textSecondary} mt-3 hover:opacity-80 transition-opacity`}
              >
                <Ticket className="w-3 h-3 inline mr-1" /> Have a voucher code?
              </button>

              {showVoucher && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex gap-2">
                  <Input
                    placeholder="Enter voucher code"
                    value={voucher}
                    onChange={e => setVoucher(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline">Redeem</Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className={`${t.cardBg} border ${t.cardBorder} rounded-xl p-5 mb-4`}>
                <p className={`text-xs ${t.textSecondary} mb-1`}>Selected package</p>
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${t.textPrimary}`}>{selectedPkg?.name} — {selectedPkg?.duration_label}</p>
                  <p className={`font-bold ${t.textPrimary}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    KSH {selectedPkg?.price}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`text-sm font-medium mb-1.5 block ${t.textPrimary}`}>Phone Number</label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textSecondary}`} />
                    <Input
                      placeholder="07XXXXXXXX"
                      className="pl-10 h-12 font-mono"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className={`w-full ${t.accent} ${t.accentFg} font-medium h-12`}
                  disabled={phone.length < 10 || paying}
                  onClick={handlePay}
                >
                  {paying ? "Processing..." : "Pay Now"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={() => setStep("select")}
                  className={`w-full text-center text-xs ${t.textSecondary} hover:opacity-80 transition-opacity`}
                >
                  ← Back to packages
                </button>
              </div>
            </motion.div>
          )}

          {step === "pay" && (
            <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
              <div className={`${t.cardBg} border ${t.cardBorder} rounded-xl p-8`}>
                <div className={`w-16 h-16 rounded-full ${t.accent}/15 flex items-center justify-center mx-auto mb-4`}>
                  <Wifi className={`w-8 h-8 ${t.textSecondary} animate-pulse`} />
                </div>
                <h3 className={`font-bold text-lg mb-1 ${t.textPrimary}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Payment Request Sent
                </h3>
                <p className={`text-sm ${t.textSecondary} mb-4`}>
                  Check your phone <span className={`font-mono ${t.textPrimary}`}>{phone}</span> for the payment prompt
                </p>
                <div className={`${t.cardBg} border ${t.cardBorder} rounded-lg p-4 text-sm space-y-2 text-left mb-4`}>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>Package</span>
                    <span className={t.textPrimary}>{selectedPkg?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>Duration</span>
                    <span className={t.textPrimary}>{selectedPkg?.duration_label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>Amount</span>
                    <span className={`font-bold ${t.textPrimary}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      KSH {selectedPkg?.price}
                    </span>
                  </div>
                </div>
                <p className={`text-xs ${t.textSecondary}`}>You'll be connected automatically once payment is confirmed</p>
              </div>
              <button
                onClick={() => { setStep("select"); setSelected(null); setPhone(""); }}
                className={`text-xs ${t.textSecondary} hover:opacity-80 transition-opacity mt-4`}
              >
                ← Start over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
