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
  return `# ============================================
# MoonConnect - MikroTik Bootstrap Script
# ============================================

:global version [/system package update get installed-version];
:local majorVersion 0;
:local minorVersion 0;
:local dotPos [:find \$version "."];

:if ([:len \$dotPos] > 0) do={
    :set majorVersion [:tonum [:pick \$version 0 \$dotPos]];
    :local remaining [:pick \$version (\$dotPos + 1) [:len \$version]];
    :set dotPos [:find \$remaining "."];
    :if ([:len \$dotPos] > 0) do={
        :set minorVersion [:tonum [:pick \$remaining 0 \$dotPos]];
    }
}

:if (\$majorVersion < 6 || (\$majorVersion = 6 && \$minorVersion < 49)) do={
    :put "RouterOS version 6.49 or higher is required.";
    :error "RouterOS version 6.49 or higher is required.";
}

:if ([/ping 8.8.8.8 count=3] = 0) do={
    :error "No internet connection. Please check your router WAN and DNS.";
}

:do {
    :put "Downloading MoonConnect configuration...";
    :local configUrl "${functionUrl}&mode=config";
    /tool fetch url=\$configUrl mode=https dst-path=moonconnect-config.rsc;
    :delay 3s;

    :if ([:len [/file find name="moonconnect-config.rsc"]] = 0) do={
        :put "Config file not found. Checking fetch status...";
        /file print;
        :error "MoonConnect configuration download failed - file not found after fetch.";
    };

    :put "Config file size:" [:len [/file get moonconnect-config.rsc contents]];
    :put "Applying MoonConnect configuration...";
    /import moonconnect-config.rsc;
    /file remove [find name="moonconnect-config.rsc"];
    :put "MoonConnect configuration completed successfully.";
} on-error={
    :put "MoonConnect provisioning failed with error:";
    :put \$error;
    :put "Current directory contents:";
    /file print;
}
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

  const assetSetupScript = `# Asset download script for ${routerName}
${assetPaths
  .map((assetPath) => {
    const destination = `hotspot/${assetPath}`;
    const assetUrl = `${functionUrl}&mode=asset&asset=${encodeURIComponent(assetPath)}`;
    return `:put "Downloading ${assetPath}..."
/tool fetch url='${assetUrl}' mode=https dst-path='${destination}'`;
  })
  .join("\n")}
:put "All assets downloaded successfully"
`;

  return `# ============================================
# MoonConnect - MikroTik Configuration
# Router: ${routerName}
# Generated: ${new Date().toISOString()}
# ============================================

:put "Preparing MoonConnect hotspot setup..."

:if ([:len [/file find name="hotspot"]] = 0) do={ /file make-dir hotspot }
:if ([:len [/file find name="hotspot/css"]] = 0) do={ /file make-dir hotspot/css }
:if ([:len [/file find name="hotspot/img"]] = 0) do={ /file make-dir hotspot/img }
:if ([:len [/file find name="hotspot/xml"]] = 0) do={ /file make-dir hotspot/xml }

# Download and run asset setup script
:local assetScript "${assetSetupScript}"
/file print file=moonconnect-assets.rsc
/file set [find name="moonconnect-assets.rsc"] contents=\$assetScript
/import moonconnect-assets.rsc
/file remove [find name="moonconnect-assets.rsc"]

# Continue with hotspot configuration
:do { /queue simple remove [find name="hotspot-queue"] } on-error={}
:do { /queue type remove [find name="hotspot-default"] } on-error={}
:do { /ip hotspot remove [find name="${hotspotName}"] } on-error={}
:do { /ip hotspot profile remove [find name="hsprof-moonconnect"] } on-error={}
:do { /ip dhcp-server remove [find name="hotspot-dhcp"] } on-error={}
:do { /ip pool remove [find name="hotspot-pool"] } on-error={}
:do { /ip dns static remove [find name="${dnsName}"] } on-error={}

:put "Creating IP pool..."
/ip pool add name=hotspot-pool ranges=${poolStart}-${poolEnd}

:put "Assigning hotspot address..."
/ip address add address=${hotspotAddress} interface=ether2 comment="MoonConnect Interface"

:put "Configuring DHCP..."
/ip dhcp-server network add address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 gateway=${networkBase} dns-server=${networkBase}
/ip dhcp-server add name=hotspot-dhcp interface=ether2 address-pool=hotspot-pool lease-time=1h disabled=no

:put "Configuring DNS..."
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4
/ip dns static add name=${dnsName} address=${networkBase}

:put "Creating hotspot profile..."
/ip hotspot profile add name=hsprof-moonconnect hotspot-address=${networkBase} dns-name=${dnsName} html-directory=hotspot login-by=http-chap,http-pap,cookie,mac-cookie http-cookie-lifetime=1d

:put "Creating hotspot server..."
/ip hotspot add name=${hotspotName} interface=ether2 address-pool=hotspot-pool profile=hsprof-moonconnect disabled=no

:put "Configuring walled garden..."
/ip hotspot walled-garden ip add dst-host=${portalHost} action=accept comment="MoonConnect Portal"
/ip hotspot walled-garden ip add dst-host=${supabaseHost} action=accept comment="MoonConnect Supabase"
/ip hotspot walled-garden ip add dst-host=checkout.paystack.com action=accept comment="Paystack Checkout"
/ip hotspot walled-garden ip add dst-host=api.paystack.co action=accept comment="Paystack API"
/ip hotspot walled-garden ip add dst-host=payment.intasend.com action=accept comment="IntaSend"
/ip hotspot walled-garden ip add dst-host=pay.pesapal.com action=accept comment="PesaPal"
/ip hotspot walled-garden add dst-host=${portalHost} path=/* action=allow comment="MoonConnect Portal Page"

:put "Configuring NAT and filters..."
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="MoonConnect NAT"
/ip firewall filter add chain=input protocol=tcp dst-port=8728,8729,80,443 action=accept comment="Allow Router Management"
/ip firewall filter add chain=forward action=accept connection-state=established,related comment="Allow established"
/ip firewall filter add chain=forward action=accept in-interface=ether2 comment="Allow hotspot traffic"
${disableSharing ? `/ip hotspot profile set [find name="hsprof-moonconnect"] shared-users=1` : ""}
${deviceTracking ? `/ip hotspot profile set [find name="hsprof-moonconnect"] login-by=http-chap,http-pap,cookie,mac-cookie
/ip hotspot set [find name="${hotspotName}"] addresses-per-mac=1` : ""}
${bandwidthControl ? `/queue type add name=hotspot-default kind=pcq pcq-rate=0 pcq-limit=50 pcq-classifier=dst-address
/queue simple add name=hotspot-queue target=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 queue=hotspot-default/hotspot-default comment="MoonConnect BW Control"` : ""}
${sessionLogging ? `/system logging add topics=hotspot action=memory
/system logging add topics=hotspot action=echo` : ""}

/ip hotspot user profile add name=default shared-users=1 rate-limit=2M/2M
:put "MoonConnect hotspot setup complete with hosted portal access to ${portalHost}"
`;
}

function redirectHtml(options: {
  title: string;
  message: string;
  targetUrl: string;
}) {
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
    <a class="button" href="${redirectUrl}">Open Portal</a>
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
  const portalHome = `${portalUrl}?router_token=${routerToken}`;

  if (asset === "login.html") {
    return new Response(
      loginHtml({ businessName, routerName, portalUrl, routerToken }),
      { headers: htmlHeaders },
    );
  }

  if (asset === "api.json") {
    return new Response(apiJson({ businessName, routerName, portalUrl }), {
      headers: jsonHeaders,
    });
  }

  if (asset === "css/style.css") {
    return new Response(hotspotStyleCss(), { headers: textHeaders });
  }

  if (asset === "md5.js") {
    return new Response(md5Js(), { headers: textHeaders });
  }

  if (asset === "img/user.svg") {
    return new Response(userSvg(), { headers: svgHeaders });
  }

  if (asset === "img/password.svg") {
    return new Response(passwordSvg(), { headers: svgHeaders });
  }

  const xmlRedirect = `<?xml version="1.0" encoding="UTF-8"?><response><redirect>${portalHome}</redirect></response>`;
  if (asset === "xml/alogin.html" || asset === "xml/error.html" || asset === "xml/flogout.html" || asset === "xml/login.html") {
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

  if (pages[asset]) {
    return new Response(
      redirectHtml({
        title: pages[asset].title,
        message: pages[asset].message,
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  const rootDomain = Deno.env.get("APP_ROOT_DOMAIN");
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL");
  const baseAppUrl = (publicAppUrl || "https://moonconnect.app").replace(/\/$/, "");
  const appendOrgParam = (value: string, orgSlug: string) =>
    `${value}${value.includes("?") ? "&" : "?"}org=${orgSlug}`;

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
      const slug = String(org.subdomain);
      if (rootDomain) {
        portalUrl = `https://${slug}.${rootDomain}/portal`;
      } else {
        portalUrl = appendOrgParam(`${baseAppUrl}/portal`, slug);
      }
    }
  }

  const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-router?token=${token}`;

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
      supabaseUrl: Deno.env.get("SUPABASE_URL")!,
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
