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
:local provisionUrl "${functionUrl}"
:put "Checking internet..."
/ping 8.8.8.8 count=3
:if ([/ping 8.8.8.8 count=1] = 0) do={
  :error "No internet"
}
:put "Downloading config..."
/tool fetch url=($provisionUrl . "&mode=config") mode=https dst-path=moonconnect-config.rsc check-certificate=no
:delay 2
:local fileId [/file find where name="moonconnect-config.rsc"]
:if ([:len $fileId] = 0) do={
  :error "Download failed"
}
:put "Applying config..."
/import moonconnect-config.rsc
:put "Done!"
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
  connectionType: string;
  hotspotInterfaces: string[];
  pppoeInterfaces: string[];
  radiusServerIp?: string;
  radiusServerSecret?: string;
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
    connectionType,
    hotspotInterfaces,
    pppoeInterfaces,
    radiusServerIp,
    radiusServerSecret,
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

  const assetCommands: string[] = [];
  for (const assetPath of assetPaths) {
    const destination = `hotspot/${assetPath}`;
    const assetUrl = `${functionUrl}&mode=asset&asset=${encodeURIComponent(assetPath)}`;
    assetCommands.push(`/tool fetch url="${assetUrl}" mode=https dst-path="${destination}" check-certificate=no`);
  }

  // SAFE ROUTEROS SYNTAX - no nested expressions, each step separate
  return `# MoonConnect Config
:local lanInterface ""

# Check for bridge interface
:local bridgeId [/interface find where name="bridge"]
:if ([:len $bridgeId] > 0) do={
  :set lanInterface "bridge"
}

# Check for ether2 interface
:if ($lanInterface = "") do={
  :local etherId [/interface find where name="ether2"]
  :if ([:len $etherId] > 0) do={
    :set lanInterface "ether2"
  }
}

# Check for LAN interface
:if ($lanInterface = "") do={
  :local lanId [/interface find where name="LAN"]
  :if ([:len $lanId] > 0) do={
    :set lanInterface "LAN"
  }
}

# Error if no interface found
:if ($lanInterface = "") do={
  :error "No LAN interface found"
}

:put ("Using interface: " . $lanInterface)

# Create directories
/file make-dir hotspot
/file make-dir hotspot/css
/file make-dir hotspot/img
/file make-dir hotspot/xml

# Download hotspot files
${assetCommands.join("\n")}

# Remove old configurations
/ip hotspot remove [find where name="${hotspotName}"]
/ip hotspot profile remove [find where name="hsprof-moonconnect"]
/ip dhcp-server remove [find where name="hotspot-dhcp"]
/ip pool remove [find where name="hotspot-pool"]
/ip dns static remove [find where name="${dnsName}"]

# Create IP pool
/ip pool add name=hotspot-pool ranges=${poolStart}-${poolEnd}

# Add IP address
/ip address add address=${hotspotAddress} interface=\$lanInterface

# Configure DHCP network
/ip dhcp-server network add address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 gateway=${networkBase} dns-server=${networkBase}

# Add DHCP server
/ip dhcp-server add name=hotspot-dhcp interface=\$lanInterface address-pool=hotspot-pool lease-time=1h disabled=no

# Configure DNS
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4
/ip dns static add name="${dnsName}" address=${networkBase}

# Create hotspot profile
/ip hotspot profile add name=hsprof-moonconnect hotspot-address=${networkBase} dns-name="${dnsName}" html-directory=hotspot login-by=http-chap,http-pap,cookie,mac-cookie http-cookie-lifetime=1d

# Create hotspot server
/ip hotspot add name="${hotspotName}" interface=\$lanInterface address-pool=hotspot-pool profile=hsprof-moonconnect disabled=no

# Add walled garden rules
/ip hotspot walled-garden ip add dst-host="${portalHost}" action=accept
/ip hotspot walled-garden ip add dst-host="${supabaseHost}" action=accept
/ip hotspot walled-garden ip add dst-host="checkout.paystack.com" action=accept
/ip hotspot walled-garden ip add dst-host="api.paystack.co" action=accept
/ip hotspot walled-garden ip add dst-host="payment.intasend.com" action=accept
/ip hotspot walled-garden ip add dst-host="pay.pesapal.com" action=accept
/ip hotspot walled-garden add dst-host="${portalHost}" path=/* action=allow

# Add NAT rule
/ip firewall nat add chain=srcnat src-address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 action=masquerade

# Configure comprehensive firewall rules
# Clear existing filter rules (be careful in production!)
/ip firewall filter remove [find where chain="input" and comment="MoonConnect"]
/ip firewall filter remove [find where chain="forward" and comment="MoonConnect"]

# Input chain rules
/ip firewall filter add chain=input protocol=tcp dst-port=80,443,8728,8729 action=accept comment="MoonConnect - Allow HTTP/HTTPS/API access"
/ip firewall filter add chain=input protocol=icmp action=accept comment="MoonConnect - Allow ICMP"
/ip firewall filter add chain=input connection-state=established,related action=accept comment="MoonConnect - Allow established connections"
/ip firewall filter add chain=input in-interface=\$lanInterface action=accept comment="MoonConnect - Allow LAN access"
/ip firewall filter add chain=input protocol=udp dst-port=53 action=accept comment="MoonConnect - Allow DNS"
/ip firewall filter add chain=input protocol=udp dst-port=123 action=accept comment="MoonConnect - Allow NTP"

# Forward chain rules
/ip firewall filter add chain=forward action=accept connection-state=established,related comment="MoonConnect - Allow established connections"
/ip firewall filter add chain=forward action=accept in-interface=\$lanInterface comment="MoonConnect - Allow LAN forwarding"
/ip firewall filter add chain=forward action=drop connection-state=invalid comment="MoonConnect - Drop invalid connections"
/ip firewall filter add chain=forward action=drop in-interface=\$lanInterface out-interface=\$lanInterface comment="MoonConnect - Prevent LAN to LAN blocking"

# PPPoE specific firewall rules
${(connectionType === 'pppoe' || connectionType === 'both') ? `
# PPPoE firewall rules
/ip firewall filter add chain=input protocol=pppoe action=accept comment="MoonConnect - Allow PPPoE"
/ip firewall filter add chain=forward action=accept in-interface=pppoe-out1 comment="MoonConnect - Allow PPPoE forwarding"
` : ''}

# Security hardening
/ip firewall filter add chain=input action=drop comment="MoonConnect - Drop all other input"
/ip firewall filter add chain=forward action=drop comment="MoonConnect - Drop all other forwarding"

# Optional features
${disableSharing ? '/ip hotspot profile set [find where name="hsprof-moonconnect"] shared-users=1' : ''}
${deviceTracking ? `/ip hotspot set [find where name="${hotspotName}"] addresses-per-mac=1` : ''}
${bandwidthControl ? `/queue simple add name=hotspot-queue target=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 max-limit=10M/10M` : ''}
${sessionLogging ? '/system logging add topics=hotspot action=memory' : ''}

# PPPoE Configuration
${(connectionType === 'pppoe' || connectionType === 'both') ? `
# Configure PPPoE Server
/ppp profile remove [find where name="pppoe-profile-moonconnect"]
/ppp profile add name=pppoe-profile-moonconnect local-address=192.168.100.1 remote-address=pppoe-pool dns-server=8.8.8.8,8.8.4.4

# Create PPPoE server
/interface pppoe-server server remove [find where service-name="moonconnect-pppoe"]
/interface pppoe-server server add service-name=moonconnect-pppoe interface=${pppoeInterfaces.join(',')} default-profile=pppoe-profile-moonconnect disabled=no

# Add PPPoE firewall rules
/ip firewall filter add chain=input protocol=pppoe action=accept
/ip firewall filter add chain=forward action=accept connection-state=established,related
${pppoeInterfaces.map(iface => `/ip firewall filter add chain=forward action=accept in-interface=pppoe-${iface}`).join('\n')}

# RADIUS Configuration for PPPoE
${radiusServerIp && radiusServerSecret ? `
# Configure RADIUS server for PPPoE
/radius remove [find where service=pppoe]
/radius add service=pppoe address=${radiusServerIp} secret="${radiusServerSecret}" auth-port=1812 acct-port=1813 timeout=3s

# Set PPPoE to use RADIUS
/ppp aaa set use-radius=yes interim-update=5m
` : ''}
` : ''}

# Create default user profile
/ip hotspot user profile remove [find where name="default"]
/ip hotspot user profile add name=default shared-users=1 rate-limit=2M/2M

# Enable services based on connection type
${connectionType === 'hotspot' || connectionType === 'both' ? `/ip hotspot set [find where name="${hotspotName}"] disabled=no` : ''}
${connectionType === 'pppoe' || connectionType === 'both' ? '/interface pppoe-server server set [find where service-name="moonconnect-pppoe"] disabled=no' : ''}

:put "Setup complete"
`;
}

// Keep all helper functions - they remain the same
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
    // Fetch RADIUS server details if configured
    let radiusServerIp = router.radius_server_ip;
    let radiusServerSecret = router.radius_server_secret;

    if (router.radius_server_id && !radiusServerIp) {
      const { data: radiusServer } = await supabase
        .from("radius_servers")
        .select("ip_address")
        .eq("id", router.radius_server_id)
        .single();

      if (radiusServer) {
        radiusServerIp = radiusServer.ip_address;
        // Note: Secret should be stored securely, this is a simplified approach
        // In production, you might want to store secrets encrypted or use a secrets management service
      }
    }

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
      connectionType: String(router.connection_type || "hotspot"),
      hotspotInterfaces: Array.isArray(router.hotspot_interfaces) ? router.hotspot_interfaces : ["ether2"],
      pppoeInterfaces: Array.isArray(router.pppoe_interfaces) ? router.pppoe_interfaces : ["ether1"],
      radiusServerIp: radiusServerIp,
      radiusServerSecret: radiusServerSecret,
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