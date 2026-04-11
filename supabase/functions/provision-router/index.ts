import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateMikroTikScript(
  router: Record<string, unknown>,
  portalUrl: string,
  supabaseUrl: string,
) {
  const hotspotAddress = String(router.hotspot_address || "10.5.50.1/24");
  const dnsName = String(router.dns_name || "hotspot.local");
  const routerName = String(router.name || "MoonConnect");
  const routerToken = String(router.provision_token || "");
  const networkBase = hotspotAddress.split("/")[0];
  const networkParts = networkBase.split(".");
  const poolStart = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.2`;
  const poolEnd = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.254`;
  const slug = routerName.toLowerCase().replace(/\s+/g, "-");
  const portalHost = new URL(portalUrl).hostname;
  const supabaseHost = new URL(supabaseUrl).hostname;
  const loginUrl = `${portalUrl}?router_token=${routerToken}&amp;mac=\\$(mac)&amp;ip=\\$(ip)&amp;link-login=\\$(link-login-only)&amp;link-orig=\\$(link-orig-esc)`;
  const loginHtml = `<html><head><meta http-equiv='refresh' content='0;url=${loginUrl}'></head><body>Redirecting...</body></html>`;

  let script = `# ============================================
# MoonConnect - MikroTik Auto Setup Script
# Router: ${routerName}
# Generated: ${new Date().toISOString()}
# ============================================

/ip pool
add name=hotspot-pool ranges=${poolStart}-${poolEnd}

/ip address
add address=${hotspotAddress} interface=ether2 comment="MoonConnect Interface"

/ip dhcp-server network
add address=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 gateway=${networkBase} dns-server=${networkBase}
/ip dhcp-server
add name=hotspot-dhcp interface=ether2 address-pool=hotspot-pool lease-time=1h disabled=no

/ip dns
set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4
/ip dns static
add name=${dnsName} address=${networkBase}

/ip hotspot profile
add name=hsprof-moonconnect hotspot-address=${networkBase} dns-name=${dnsName} \\
  html-directory=hotspot login-by=http-chap,http-pap,cookie,mac-cookie \\
  http-cookie-lifetime=1d rate-limit=""

/ip hotspot
add name=hotspot-${slug} interface=ether2 address-pool=hotspot-pool \\
  profile=hsprof-moonconnect disabled=no

:local loginHtml "${loginHtml}"
:if ([:len [/file find name="hotspot/login.html"]] > 0) do={
  /file set [find name="hotspot/login.html"] contents=$loginHtml
} else={
  /file add name=hotspot/login.html contents=$loginHtml
}

/ip hotspot walled-garden ip
add dst-host=${portalHost} action=accept comment="MoonConnect Portal"
add dst-host=${supabaseHost} action=accept comment="MoonConnect Supabase"
add dst-host=checkout.paystack.com action=accept comment="Paystack Checkout"
add dst-host=api.paystack.co action=accept comment="Paystack API"
add dst-host=payment.intasend.com action=accept comment="IntaSend"
add dst-host=pay.pesapal.com action=accept comment="PesaPal"

/ip hotspot walled-garden
add dst-host=${portalHost} path=/* action=allow comment="MoonConnect Portal Page"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="MoonConnect NAT"

/ip firewall filter
add chain=input protocol=tcp dst-port=8728,8729,80,443 action=accept comment="Allow Router Management"
add chain=forward action=accept connection-state=established,related comment="Allow established"
add chain=forward action=accept in-interface=ether2 comment="Allow hotspot traffic"
`;

  if (router.disable_sharing) {
    script += `
/ip hotspot profile set [find name="hsprof-moonconnect"] shared-users=1
`;
  }

  if (router.device_tracking) {
    script += `
/ip hotspot profile set [find name="hsprof-moonconnect"] login-by=http-chap,http-pap,cookie,mac-cookie
/ip hotspot set [find name="hotspot-${slug}"] addresses-per-mac=1
`;
  }

  if (router.bandwidth_control) {
    script += `
/queue type
add name=hotspot-default kind=pcq pcq-rate=0 pcq-limit=50 pcq-classifier=dst-address
/queue simple
add name=hotspot-queue target=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 queue=hotspot-default/hotspot-default comment="MoonConnect BW Control"
`;
  }

  if (router.session_logging) {
    script += `
/system logging
add topics=hotspot action=memory
add topics=hotspot action=echo
`;
  }

  script += `
/ip hotspot user profile
add name=default shared-users=1 rate-limit=2M/2M

# Captive portal redirect:
# ${portalUrl}?router_token=${routerToken}&mac=<mac>&ip=<ip>
# ============================================
`;

  return script;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing provision token", {
      status: 400,
      headers: corsHeaders,
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
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const rootDomain = Deno.env.get("APP_ROOT_DOMAIN");
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL");
  const baseAppUrl = (publicAppUrl || "https://moonconnect.app").replace(/\/$/, "");
  let portalUrl = `${baseAppUrl}/portal`;

  const appendOrgParam = (url: string, orgSlug: string) =>
    `${url}${url.includes("?") ? "&" : "?"}org=${orgSlug}`;

  if (router.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("subdomain")
      .eq("id", router.org_id)
      .single();

    if (org?.subdomain) {
      const slug = String(org.subdomain);
      if (rootDomain) {
        portalUrl = `https://${slug}.${rootDomain}/portal`;
      } else {
        portalUrl = appendOrgParam(`${baseAppUrl}/portal`, slug);
      }
    }
  }

  const script = generateMikroTikScript(
    router,
    portalUrl,
    Deno.env.get("SUPABASE_URL")!,
  );

  return new Response(script, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="moonconnect.rsc"',
    },
  });
});
