import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ensureHotspotAccess,
  type RouterRecord,
} from "../_shared/mikrotik.ts";
import { auditLog } from "../_shared/backend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, org_id, router_token, device_ip, mac_address } = await req.json();

    if (!code || !org_id) {
      return new Response(JSON.stringify({ error: "code and org_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: voucher } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", String(code).trim().toUpperCase())
      .eq("org_id", org_id)
      .eq("status", "Unused")
      .maybeSingle();

    if (!voucher) {
      return new Response(JSON.stringify({ error: "Voucher not found or already used" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
      return new Response(JSON.stringify({ error: "Voucher has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: packageData } = voucher.package_id
      ? await supabase
          .from("packages")
          .select("*")
          .eq("id", voucher.package_id)
          .eq("org_id", org_id)
          .single()
      : { data: null };

    if (!packageData) {
      return new Response(JSON.stringify({ error: "Voucher package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: router } = router_token
      ? await supabase
          .from("routers")
          .select("*")
          .eq("provision_token", router_token)
          .eq("org_id", org_id)
          .maybeSingle()
      : { data: null };

    const expiresAt = new Date(
      Date.now() + Number(packageData.duration_minutes || 120) * 60 * 1000,
    ).toISOString();

    if (router && (router.connection_type || "hotspot") === "hotspot") {
      await ensureHotspotAccess(router as RouterRecord, {
        phone: `voucher-${voucher.code}`,
        macAddress: mac_address || null,
        deviceIp: device_ip || null,
        expiresAt,
        speedLimit: packageData.speed_limit,
        sharedUsers: 1,
      });
    }

    await supabase
      .from("vouchers")
      .update({ status: "Used" })
      .eq("id", voucher.id);

    await supabase.from("sessions").insert({
      user_id: voucher.user_id,
      org_id,
      router_id: router?.id || null,
      phone: `voucher-${voucher.code}`,
      package_name: voucher.package_name,
      status: "Active",
      login_time: new Date().toISOString(),
      expires_at: expiresAt,
      mac_address: mac_address || null,
      device_ip: device_ip || null,
    });

    await auditLog(supabase, {
      user_id: voucher.user_id,
      org_id,
      router_id: router?.id || null,
      action: "voucher.redeemed",
      status: "success",
      message: `Voucher ${voucher.code} redeemed`,
      meta: {
        package_id: voucher.package_id,
        expires_at: expiresAt,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        package_name: voucher.package_name,
        expires_at: expiresAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown redeem-voucher error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
