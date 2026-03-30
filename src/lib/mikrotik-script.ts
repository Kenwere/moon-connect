// Generates a MikroTik RouterOS script for hotspot auto-setup
export function generateMikroTikScript(options: {
  routerName: string;
  routerToken: string;
  portalUrl: string;
  supabaseUrl: string;
  hotspotAddress?: string;
  dnsName?: string;
  disableSharing?: boolean;
  deviceTracking?: boolean;
  bandwidthControl?: boolean;
  sessionLogging?: boolean;
}) {
  const {
    routerName,
    routerToken,
    portalUrl,
    supabaseUrl,
    hotspotAddress = "10.5.50.1/24",
    dnsName = "hotspot.local",
    disableSharing = false,
    deviceTracking = true,
    bandwidthControl = true,
    sessionLogging = true,
  } = options;

  const networkBase = hotspotAddress.split("/")[0];
  const networkParts = networkBase.split(".");
  const poolStart = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.2`;
  const poolEnd = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.254`;
  const hotspotName = `hotspot-${routerName.toLowerCase().replace(/\s+/g, "-")}`;
  const portalHost = new URL(portalUrl).hostname;
  const supabaseHost = new URL(supabaseUrl).hostname;
  const loginHtml = `<html><head><meta http-equiv='refresh' content='0;url=${portalUrl}?router_token=${routerToken}&mac=$(mac)&ip=$(ip)&link-login=$(link-login-only)&link-orig=$(link-orig-esc)'></head><body>Redirecting...</body></html>`;

  return `# ============================================
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
add name=${hotspotName} interface=ether2 address-pool=hotspot-pool \\
  profile=hsprof-moonconnect disabled=no

/file set [find where name="hotspot/login.html"] contents="${loginHtml}"

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
${disableSharing ? `
/ip hotspot profile set hsprof-moonconnect shared-users=1` : ""}
${deviceTracking ? `
/ip hotspot profile set hsprof-moonconnect login-by=http-chap,http-pap,cookie,mac-cookie
/ip hotspot set ${hotspotName} addresses-per-mac=1` : ""}
${bandwidthControl ? `
/queue type
add name=hotspot-default kind=pcq pcq-rate=0 pcq-limit=50 pcq-classifier=dst-address
/queue simple
add name=hotspot-queue target=${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.0/24 queue=hotspot-default/hotspot-default comment="MoonConnect BW Control"` : ""}
${sessionLogging ? `
/system logging
add topics=hotspot action=memory
add topics=hotspot action=echo` : ""}

/ip hotspot user profile
add name=default shared-users=1 rate-limit=2M/2M

# Captive portal redirect:
# ${portalUrl}?router_token=${routerToken}&mac=<mac>&ip=<ip>
# ============================================
`;
}
