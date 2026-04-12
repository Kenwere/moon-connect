import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const textHeaders = {
  ...corsHeaders,
  "Content-Type": "text/plain; charset=utf-8",
};

const htmlHeaders = {
  ...corsHeaders,
  "Content-Type": "text/html; charset=utf-8",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

const svgHeaders = {
  ...corsHeaders,
  "Content-Type": "image/svg+xml; charset=utf-8",
};

function buildBootstrapScript(functionUrl: string) {
  return `# MoonConnect Bootstrap Script
# RouterOS Compatible Version

:local provisionUrl "${functionUrl}"

:put "Checking internet connectivity..."
/ping 8.8.8.8 count=3

:if ([/ping 8.8.8.8 count=1] = 0) do={
  :error "No internet connection"
}

:put "Downloading MoonConnect configuration..."
/tool fetch url=($provisionUrl . "&mode=config") mode=https dst-path=moonconnect-config.rsc check-certificate=no

:delay 2

:local fileId [/file find where name="moonconnect-config.rsc"]
:if ([:len $fileId] = 0) do={
  :error "Failed to download configuration file"
}

:put "Applying MoonConnect configuration..."
/import file-name=moonconnect-config.rsc

:put "MoonConnect provisioning completed!"
/file remove moonconnect-config.rsc
`;
}

function safeRouterSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "router";
}

function buildConfigScript(options: {
  functionUrl: string;
  portalUrl: string;
  routerName: string;
  hotspotAddress: string;
  dnsName: string;
  disableSharing: boolean;
  deviceTracking: boolean;
  bandwidthControl: boolean;
  sessionLogging: boolean;
  supabaseUrl: string;
}) {
  const {
    functionUrl,
    portalUrl,
    routerName,
    hotspotAddress,
    dnsName,
    disableSharing,
    deviceTracking,
    bandwidthControl,
    sessionLogging,
    supabaseUrl,
  } = options;

  const networkBase = hotspotAddress.split("/")[0];
  const networkParts = networkBase.split(".");
  const poolStart = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.2`;
  const poolEnd = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.254`;
  const hotspotName = `hotspot-${safeRouterSlug(routerName)}`;
  const portalHost = new URL(portalUrl).hostname;
  const supabaseHost = new URL(supabaseUrl).hostname;

  const assetPaths = [
    "login.html",
    "alogin.html",
    "status.html",
    "logout.html",
    "redirect.html",
    "rlogin.html",
    "error.html",
    "md5.js",
    "api.json",
    "css/style.css",
    "img/user.svg",
    "img/password.svg",
    "xml/alogin.html",
    "xml/error.html",
    "xml/flogout.html",
    "xml/login.html",
  ];

  // Generate asset download commands using RouterOS syntax
  const assetCommands: string[] = [];
  for (const assetPath of assetPaths) {
    const destination = `hotspot/${assetPath}`;
    const assetUrl = `${functionUrl}&mode=asset&asset=${encodeURIComponent(assetPath)}`;
    assetCommands.push(`/tool fetch url="${assetUrl}" mode=https dst-path="${destination}" check-certificate=no`);
  }

  // PURE ROUTEROS SYNTAX - WITH ALL FIXES
  return `# MoonConnect Router Configuration
# RouterOS Compatible Version
# Generated for router: ${routerName}

# Detect LAN interface
:local lanInterface ""
:if ([:len [/interface find where name="bridge"]] > 0) do={
  :set lanInterface "bridge"
}
:if ([:len [/interface find where name="bridge1"]] > 0) do={
  :set lanInterface "bridge1"
}
:if ([:len [/interface find where name="ether2"]] > 0) do={
  :set lanInterface "ether2"
}
:if ([:len [/interface find where name="LAN"]] > 0) do={
  :set lanInterface "LAN"
}

:if ([:len $lanInterface] = 0) do={
  :error "Could not detect LAN interface"
}

:put ("Using LAN interface: " . $lanInterface)

# Create directories
/file make-dir hotspot
/file make-dir hotspot/css
/file make-dir hotspot/img
/file make-dir hotspot/xml

# Download hotspot files
:put "Downloading hotspot assets..."
${assetCommands.join("\n")}

# Safely remove existing configurations
:foreach i in=[/queue simple find where name="hotspot-queue"] do={ /queue simple remove $i }
:foreach i in=[/queue type find where name="hotspot-default"] do={ /queue type remove $i }
:foreach i in=[/ip hotspot find where name="${hotspotName}"] do={ /ip hotspot remove $i }
:foreach i in=[/ip hotspot profile find where name="hsprof-moonconnect"] do={ /ip hotspot profile remove $i }
:foreach i in=[/ip dhcp-server find where name="hotspot-dhcp"] do={ /ip dhcp-server remove $i }
:foreach i in=[/ip pool find where name="hotspot-pool"] do={ /ip pool remove $i }
:foreach i in=[/ip dns static find where name="${dnsName}"] do={ /ip dns static remove $i }

# Safely create IP pool
:if ([:len [/ip pool find where name="hotspot-pool"]] = 0) do={
  /ip pool add name=hotspot-pool ranges=${poolStart}-${poolEnd}
}

# Safely assign hotspot address
:local addressExists [/ip address find where address="${hotspotAddress}"]
:if ([:len $addressExists] = 0) do={
  /ip address add address=${hotspotAddress} interface=$lanInterface comment="MoonConnect Interface"
}

# Safely configure DHCP
:if ([:len [/ip dhcp-server network find where address="${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24"]] = 0) do={
  /ip dhcp-server network add address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 gateway=${networkBase} dns-server=${networkBase}
}

:if ([:len [/ip dhcp-server find where name="hotspot-dhcp"]] = 0) do={
  /ip dhcp-server add name=hotspot-dhcp interface=$lanInterface address-pool=hotspot-pool lease-time=1h disabled=no
}

# Safely configure DNS
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4

:if ([:len [/ip dns static find where name="${dnsName}"]] = 0) do={
  /ip dns static add name="${dnsName}" address=${networkBase}
}

# Safely create hotspot profile
:if ([:len [/ip hotspot profile find where name="hsprof-moonconnect"]] = 0) do={
  /ip hotspot profile add name=hsprof-moonconnect hotspot-address=${networkBase} dns-name="${dnsName}" html-directory=hotspot login-by=http-chap,http-pap,cookie,mac-cookie http-cookie-lifetime=1d
}

# Safely create hotspot server
:if ([:len [/ip hotspot find where name="${hotspotName}"]] = 0) do={
  /ip hotspot add name="${hotspotName}" interface=$lanInterface address-pool=hotspot-pool profile=hsprof-moonconnect disabled=no
}

# Safely configure walled garden - FIXED: path="/*" with quotes
:local portalRuleExists [/ip hotspot walled-garden find where dst-host="${portalHost}"]
:if ([:len $portalRuleExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="${portalHost}" action=accept comment="MoonConnect Portal"
}

:local supabaseRuleExists [/ip hotspot walled-garden find where dst-host="${supabaseHost}"]
:if ([:len $supabaseRuleExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="${supabaseHost}" action=accept comment="MoonConnect Supabase"
}

:local paystackRuleExists [/ip hotspot walled-garden find where dst-host="checkout.paystack.com"]
:if ([:len $paystackRuleExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="checkout.paystack.com" action=accept comment="Paystack Checkout"
}

:local paystackApiExists [/ip hotspot walled-garden find where dst-host="api.paystack.co"]
:if ([:len $paystackApiExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="api.paystack.co" action=accept comment="Paystack API"
}

:local intasendExists [/ip hotspot walled-garden find where dst-host="payment.intasend.com"]
:if ([:len $intasendExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="payment.intasend.com" action=accept comment="IntaSend"
}

:local pesapalExists [/ip hotspot walled-garden find where dst-host="pay.pesapal.com"]
:if ([:len $pesapalExists] = 0) do={
  /ip hotspot walled-garden ip add dst-host="pay.pesapal.com" action=accept comment="PesaPal"
}

# CRITICAL FIX: path="/*" with quotes, not path=/*
:local portalPathExists [/ip hotspot walled-garden find where dst-host="${portalHost}" and path="/*"]
:if ([:len $portalPathExists] = 0) do={
  /ip hotspot walled-garden add dst-host="${portalHost}" path="/*" action=allow comment="MoonConnect Portal Page"
}

# Safely configure NAT
:local natExists [/ip firewall nat find where comment="MoonConnect NAT"]
:if ([:len $natExists] = 0) do={
  /ip firewall nat add chain=srcnat src-address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 action=masquerade comment="MoonConnect NAT"
}

# Safely configure firewall filters
:local inputFilterExists [/ip firewall filter find where comment="Allow Router Management"]
:if ([:len $inputFilterExists] = 0) do={
  /ip firewall filter add chain=input protocol=tcp dst-port=8728,8729,80,443 action=accept comment="Allow Router Management"
}

:local forwardEstablishedExists [/ip firewall filter find where comment="Allow established"]
:if ([:len $forwardEstablishedExists] = 0) do={
  /ip firewall filter add chain=forward action=accept connection-state=established,related comment="Allow established"
}

:local forwardHotspotExists [/ip firewall filter find where comment="Allow hotspot traffic"]
:if ([:len $forwardHotspotExists] = 0) do={
  /ip firewall filter add chain=forward action=accept in-interface=$lanInterface comment="Allow hotspot traffic"
}

# Optional features with safe checks
${disableSharing ? `:if ([:len [/ip hotspot profile find where name="hsprof-moonconnect"]] > 0) do={
  /ip hotspot profile set [find where name="hsprof-moonconnect"] shared-users=1
}` : ''}

${deviceTracking ? `:if ([:len [/ip hotspot find where name="${hotspotName}"]] > 0) do={
  /ip hotspot set [find where name="${hotspotName}"] addresses-per-mac=1
}` : ''}

${bandwidthControl ? `:if ([:len [/queue simple find where name="hotspot-queue"]] = 0) do={
  /queue simple add name=hotspot-queue target=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 max-limit=10M/10M
}` : ''}

${sessionLogging ? `:if ([:len [/system logging find where topics="hotspot"]] = 0) do={
  /system logging add topics=hotspot action=memory
}` : ''}

# Safely create default user profile
:foreach i in=[/ip hotspot user profile find where name="default"] do={ /ip hotspot user profile remove $i }
/ip hotspot user profile add name=default shared-users=1 rate-limit=2M/2M

# Safely enable hotspot server
:if ([:len [/ip hotspot find where name="${hotspotName}"]] > 0) do={
  /ip hotspot set [find where name="${hotspotName}"] disabled=no
}

:put "MoonConnect hotspot setup complete!"
`;
}

// All the helper functions remain the same
function redirectHtml(options: { title: string; message: string; targetUrl: string }) {
  const { title, message, targetUrl } = options;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="3;url=${targetUrl}">
  <link rel="stylesheet" href="css/style.css">
  <title>${title}</title>
</head>
<body class="shell">
  <main class="card">
    <div class="badge">MoonConnect</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="button" href="${targetUrl}">Continue</a>
  </main>
</body>
</html>`;
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hotspotStyleCss() {
  return `:root {
  --bg: #08111f;
  --card: rgba(11, 23, 42, 0.88);
  --line: rgba(255, 255, 255, 0.09);
  --text: #e7eef8;
  --muted: #9bb0c9;
  --primary: #5eead4;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: "Segoe UI", Tahoma, sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 30%),
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.15), transparent 32%),
    linear-gradient(180deg, #07101d 0%, #0b1424 100%);
}
.shell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 460px;
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--card);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.badge {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  color: var(--primary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 { margin: 0 0 10px; font-size: 28px; }
p { margin: 0; color: var(--muted); line-height: 1.6; }
.button {
  display: inline-flex;
  margin-top: 18px;
  padding: 12px 18px;
  border-radius: 14px;
  color: #04131b;
  text-decoration: none;
  font-weight: 700;
  background: var(--primary);
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}
.icon {
  width: 42px;
  height: 42px;
}`;
}

function md5Js() {
  return `window.hexMD5 = function (value) { return value; };`;
}

function userSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9bb0c9" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.8-3.7 5.2-5.5 8-5.5s6.2 1.8 8 5.5"/></svg>`;
}

function passwordSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9bb0c9" stroke-width="1.7"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>`;
}

function loginHtml(options: {
  businessName: string;
  routerName: string;
  portalUrl: string;
  routerToken: string;
}) {
  const { businessName, routerName, portalUrl, routerToken } = options;
  const redirectUrl = `${portalUrl}?router_token=${routerToken}&mac=$(mac)&ip=$(ip)&link-login=$(link-login-only)&link-orig=$(link-orig-esc)`;
  const redirectUrlHtml = escapeHtmlAttribute(redirectUrl);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="css/style.css">
  <title>${businessName}</title>
</head>
<body class="shell">
  <main class="card">
    <div class="badge">MoonConnect Hotspot</div>
    <h1>${businessName}</h1>
    <p>Preparing your secure hotspot session on ${routerName}. You will be redirected to the customer portal automatically.</p>
    <div class="row">
      <img class="icon" src="img/user.svg" alt="">
      <p>Device details are passed to your hosted captive portal so billing and login stay in sync.</p>
    </div>
    <a class="button" href="${redirectUrlHtml}">Open Portal</a>
  </main>
  <script>
    setTimeout(function () {
      window.location.replace("${redirectUrl}");
    }, 1200);
  </script>
</body>
</html>`;
}

function apiJson(options: {
  businessName: string;
  routerName: string;
  portalUrl: string;
}) {
  const { businessName, routerName, portalUrl } = options;
  return JSON.stringify(
    {
      provider: "MoonConnect",
      business_name: businessName,
      router_name: routerName,
      portal_url: portalUrl,
      generated_at: new Date().toISOString(),
    },
    null,
    2,
  );
}

function assetResponse(options: {
  asset: string;
  businessName: string;
  routerName: string;
  portalUrl: string;
  routerToken: string;
}) {
  const { asset, businessName, routerName, portalUrl, routerToken } = options;
  const decodedAsset = decodeURIComponent(asset);
  const portalHome = `${portalUrl}?router_token=${routerToken}`;

  if (decodedAsset === "login.html") {
    return new Response(
      loginHtml({ businessName, routerName, portalUrl, routerToken }),
      { headers: htmlHeaders },
    );
  }

  if (decodedAsset === "api.json") {
    return new Response(apiJson({ businessName, routerName, portalUrl }), {
      headers: jsonHeaders,
    });
  }

  if (decodedAsset === "css/style.css") {
    return new Response(hotspotStyleCss(), { headers: textHeaders });
  }

  if (decodedAsset === "md5.js") {
    return new Response(md5Js(), { headers: textHeaders });
  }

  if (decodedAsset === "img/user.svg") {
    return new Response(userSvg(), { headers: svgHeaders });
  }

  if (decodedAsset === "img/password.svg") {
    return new Response(passwordSvg(), { headers: svgHeaders });
  }

  const xmlRedirect = `<?xml version="1.0" encoding="UTF-8"?><response><redirect>${portalHome}</redirect></response>`;
  if (decodedAsset === "xml/alogin.html" || decodedAsset === "xml/error.html" || decodedAsset === "xml/flogout.html" || decodedAsset === "xml/login.html") {
    return new Response(xmlRedirect, { headers: textHeaders });
  }

  const pages: Record<string, { title: string; message: string }> = {
    "alogin.html": {
      title: "Already connected",
      message: "Your router session is active. Continue to the MoonConnect portal to manage access.",
    },
    "status.html": {
      title: "Session status",
      message: "Your access state is managed in the hosted MoonConnect portal.",
    },
    "logout.html": {
      title: "Logged out",
      message: "You have been logged out locally. Re-open the portal when you want to reconnect.",
    },
    "redirect.html": {
      title: "Redirecting",
      message: "MoonConnect is redirecting you to the hosted captive portal.",
    },
    "rlogin.html": {
      title: "Remote login",
      message: "Continue to the secure MoonConnect login page for package selection and access.",
    },
    "error.html": {
      title: "Portal unavailable",
      message: "The hosted portal is temporarily unavailable. Try again in a moment or contact your ISP admin.",
    },
  };

  if (pages[decodedAsset]) {
    return new Response(
      redirectHtml({
        title: pages[decodedAsset].title,
        message: pages[decodedAsset].message,
        targetUrl: portalHome,
      }),
      { headers: htmlHeaders },
    );
  }

  return new Response("Asset not found", { status: 404, headers: textHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const mode = url.searchParams.get("mode") || "bootstrap";
  const requestedAsset = url.searchParams.get("asset");

  if (!token) {
    return new Response("Missing provision token", {
      status: 400,
      headers: textHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("PROJECT_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_KEY");
  const publicAppUrl = Deno.env.get("APP_URL");

  if (!supabaseUrl || !supabaseServiceKey || !publicAppUrl) {
    return new Response("Server configuration error", { 
      status: 500, 
      headers: textHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: router, error } = await supabase
    .from("routers")
    .select("*")
    .eq("provision_token", token)
    .single();

  if (error || !router) {
    return new Response("# Invalid provision token\n", {
      status: 404,
      headers: textHeaders,
    });
  }

  const baseAppUrl = publicAppUrl.replace(/\/$/, "");
  let portalUrl = `${baseAppUrl}/portal`;
  let businessName = String(router.name || "MoonConnect ISP");

  if (router.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("subdomain, name")
      .eq("id", router.org_id)
      .single();

    if (org?.name) {
      businessName = String(org.name);
    }

    if (org?.subdomain) {
      portalUrl = `${baseAppUrl}/portal?org=${org.subdomain}`;
    }
  }

  const functionUrl = `${supabaseUrl}/functions/v1/provision-router?token=${token}`;

  if (mode === "asset" && requestedAsset) {
    return assetResponse({
      asset: requestedAsset,
      businessName,
      routerName: String(router.name || "MoonConnect Router"),
      portalUrl,
      routerToken: token,
    });
  }

  if (mode === "config") {
    const script = buildConfigScript({
      functionUrl,
      portalUrl,
      routerName: String(router.name || "MoonConnect Router"),
      hotspotAddress: String(router.hotspot_address || "10.5.50.1/24"),
      dnsName: String(router.dns_name || "hotspot.local"),
      disableSharing: Boolean(router.disable_sharing),
      deviceTracking: Boolean(router.device_tracking),
      bandwidthControl: Boolean(router.bandwidth_control),
      sessionLogging: Boolean(router.session_logging),
      supabaseUrl: supabaseUrl,
    });

    return new Response(script, {
      headers: {
        ...textHeaders,
        "Content-Disposition": 'attachment; filename="moonconnect-config.rsc"',
      },
    });
  }

  return new Response(buildBootstrapScript(functionUrl), {
    headers: {
      ...textHeaders,
      "Content-Disposition": 'attachment; filename="moonconnect.rsc"',
    },
  });
});