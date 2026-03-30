import { useEffect, useState } from "react";
import { Wifi, Zap, Clock, ArrowRight, Phone, Ticket, Router } from "lucide-react";
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
  const [routerName, setRouterName] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  const selectedPkg = packages.find((pkg) => pkg.id === selected);

  useEffect(() => {
    void loadPortalData();
  }, []);

  const loadPortalData = async () => {
    const hostname = window.location.hostname;
    const hostnameParts = hostname.split(".");
    const params = new URLSearchParams(window.location.search);
    const paramSubdomain = params.get("org");
    const paramRouterToken = params.get("router_token");
    const paramDeviceIp = params.get("ip");
    const paramMac = params.get("mac");

    setRouterToken(paramRouterToken);
    setDeviceIp(paramDeviceIp);
    setMacAddress(paramMac);

    let resolvedOrg: { id: string; name: string } | null = null;

    if (paramRouterToken) {
      const { data: routerData } = await supabase
        .from("routers")
        .select("id, name, org_id")
        .eq("provision_token", paramRouterToken)
        .single();

      if (routerData?.org_id) {
        setRouterName(routerData.name);
        const { data: organization } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("id", routerData.org_id)
          .single();
        resolvedOrg = organization;
      }
    }

    if (!resolvedOrg) {
      let subdomain = "";

      if (paramSubdomain) {
        subdomain = paramSubdomain;
      } else if (hostnameParts.length >= 3 && hostnameParts[0] !== "www") {
        subdomain = hostnameParts[0];
      }

      if (subdomain) {
        const { data } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("subdomain", subdomain)
          .single();
        resolvedOrg = data;
      }
    }

    if (!resolvedOrg) {
      setPortalError(
        "This captive portal is not linked to an ISP yet. Re-provision the router or open the portal with a valid ISP link.",
      );
      setLoading(false);
      return;
    }

    setOrgId(resolvedOrg.id);
    setBusinessName(resolvedOrg.name);

    const [settingsRes, packagesRes] = await Promise.all([
      supabase.from("settings").select("*").eq("org_id", resolvedOrg.id).limit(1).single(),
      supabase
        .from("packages")
        .select(
          "id, name, price, duration_label, duration_minutes, speed_limit, data_limit",
        )
        .eq("org_id", resolvedOrg.id)
        .eq("active", true)
        .order("price", { ascending: true }),
    ]);

    if (settingsRes.data) {
      const settings = settingsRes.data as Record<string, unknown>;
      if (settings.business_name) setBusinessName(String(settings.business_name));
      if (settings.welcome_message) {
        setWelcomeMessage(String(settings.welcome_message));
      }
      if (settings.business_logo_url) setLogoUrl(String(settings.business_logo_url));
      setThemeState(getTheme(String(settings.portal_theme || "classic")));
    }

    setPackages((packagesRes.data as PortalPackage[]) || []);
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

      if (data?.authorization_url) {
        window.location.href = String(data.authorization_url);
        return;
      }

      if (data?.redirect_url) {
        window.location.href = String(data.redirect_url);
        return;
      }

      setStep("pay");
    } catch (error) {
      console.error("Payment error:", error);
      setStep("pay");
    } finally {
      setPaying(false);
    }
  };

  const t = theme;

  if (loading) {
    return (
      <div className={`min-h-screen ${t.background} flex items-center justify-center`}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent opacity-50" />
      </div>
    );
  }

  if (portalError) {
    return (
      <div className={`min-h-screen ${t.background} flex items-center justify-center p-4`}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 text-center shadow-xl">
          <Router className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-xl font-semibold text-foreground">
            Captive Portal Not Linked
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{portalError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.background} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="mx-auto mb-4 h-16 w-16 rounded-2xl object-contain"
            />
          ) : (
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${t.accent}`}>
              <Wifi className={`h-8 w-8 ${t.accentFg}`} />
            </div>
          )}
          <h1
            className={`text-2xl font-bold ${t.textPrimary}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {businessName}
          </h1>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>{welcomeMessage}</p>
          {routerName && (
            <p className={`mt-2 text-xs ${t.textSecondary}`}>Router: {routerName}</p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className={`mb-3 text-sm font-medium ${t.textSecondary}`}>
                Choose your plan
              </h2>

              {packages.length === 0 ? (
                <div className={`${t.cardBg} ${t.cardBorder} rounded-xl border p-8 text-center`}>
                  <Wifi className={`mx-auto mb-3 h-10 w-10 ${t.textSecondary}`} />
                  <p className={`text-sm ${t.textSecondary}`}>No packages available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelected(pkg.id)}
                      className={`relative w-full rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] ${t.cardBg} ${t.cardBorder} ${
                        selected === pkg.id ? `ring-2 ${t.selectedRing} shadow-md` : ""
                      }`}
                    >
                      {index === Math.floor(packages.length / 2) && packages.length > 2 && (
                        <span
                          className={`absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${t.badgeBg} ${t.badgeText}`}
                        >
                          POPULAR
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.accent}/15`}>
                          <Zap className={`h-5 w-5 ${t.textSecondary}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${t.textPrimary}`}>{pkg.name}</p>
                          <div className={`mt-0.5 flex items-center gap-2 text-xs ${t.textSecondary}`}>
                            <Clock className="h-3 w-3" /> {pkg.duration_label}
                            {pkg.speed_limit && (
                              <>
                                <span>&bull;</span>
                                <Zap className="h-3 w-3" /> {pkg.speed_limit}
                              </>
                            )}
                          </div>
                        </div>
                        <p
                          className="text-lg font-bold"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: "inherit" }}
                        >
                          <span className={`${t.textSecondary} mr-0.5 text-xs`}>KSH</span>
                          <span className={t.textPrimary}>{pkg.price}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                className={`mt-4 h-12 w-full ${t.accent} ${t.accentFg} font-medium`}
                disabled={!selected}
                onClick={() => setStep("phone")}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <button
                onClick={() => setShowVoucher(!showVoucher)}
                className={`mt-3 w-full text-center text-xs ${t.textSecondary} transition-opacity hover:opacity-80`}
              >
                <Ticket className="mr-1 inline h-3 w-3" /> Have a voucher code?
              </button>

              {showVoucher && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 flex gap-2"
                >
                  <Input
                    placeholder="Enter voucher code"
                    value={voucher}
                    onChange={(event) => setVoucher(event.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline">Redeem</Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className={`${t.cardBg} ${t.cardBorder} mb-4 rounded-xl border p-5`}>
                <p className={`mb-1 text-xs ${t.textSecondary}`}>Selected package</p>
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${t.textPrimary}`}>
                    {selectedPkg?.name} - {selectedPkg?.duration_label}
                  </p>
                  <p
                    className={`font-bold ${t.textPrimary}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    KSH {selectedPkg?.price}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${t.textPrimary}`}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.textSecondary}`}
                    />
                    <Input
                      placeholder="07XXXXXXXX"
                      className="h-12 pl-10 font-mono"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className={`h-12 w-full ${t.accent} ${t.accentFg} font-medium`}
                  disabled={phone.length < 10 || paying}
                  onClick={handlePay}
                >
                  {paying ? "Processing..." : "Pay Now"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => setStep("select")}
                  className={`w-full text-center text-xs ${t.textSecondary} transition-opacity hover:opacity-80`}
                >
                  &larr; Back to packages
                </button>
              </div>
            </motion.div>
          )}

          {step === "pay" && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className={`${t.cardBg} ${t.cardBorder} rounded-xl border p-8`}>
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${t.accent}/15`}>
                  <Wifi className={`h-8 w-8 ${t.textSecondary} animate-pulse`} />
                </div>
                <h3
                  className={`mb-1 text-lg font-bold ${t.textPrimary}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Payment Request Sent
                </h3>
                <p className={`mb-4 text-sm ${t.textSecondary}`}>
                  Check your phone <span className={`font-mono ${t.textPrimary}`}>{phone}</span> for the payment prompt
                </p>
                <div className={`${t.cardBg} ${t.cardBorder} mb-4 space-y-2 rounded-lg border p-4 text-left text-sm`}>
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
                    <span
                      className={`font-bold ${t.textPrimary}`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      KSH {selectedPkg?.price}
                    </span>
                  </div>
                </div>
                <p className={`text-xs ${t.textSecondary}`}>
                  You&apos;ll be connected automatically once payment is confirmed
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("select");
                  setSelected(null);
                  setPhone("");
                }}
                className={`mt-4 text-xs ${t.textSecondary} transition-opacity hover:opacity-80`}
              >
                &larr; Start over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
