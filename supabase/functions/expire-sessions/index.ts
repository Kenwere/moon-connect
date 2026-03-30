import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  revokeHotspotAccess,
  revokePppoeAccess,
  type RouterRecord,
} from "../_shared/mikrotik.ts";
import {
  auditLog,
  requireCronSecret,
} from "../_shared/backend.ts";

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
    requireCronSecret(req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();

    const { data: expired, error: fetchErr } = await supabase
      .from("sessions")
      .select("id, phone, mac_address, device_ip, router_id")
      .eq("status", "Active")
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (fetchErr) {
      throw fetchErr;
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ expired_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const session of expired) {
      if (!session.router_id) continue;

      const { data: router } = await supabase
        .from("routers")
        .select("*")
        .eq("id", session.router_id)
        .single();

      if (!router) continue;

      if ((router.connection_type || "hotspot") === "pppoe") {
        await revokePppoeAccess(router as RouterRecord, session.phone);
      } else {
        await revokeHotspotAccess(
          router as RouterRecord,
          session.phone,
          session.mac_address,
          session.device_ip,
        );
      }

      await auditLog(supabase, {
        user_id: router.user_id,
        org_id: router.org_id,
        router_id: router.id,
        action: "session.expired",
        status: "success",
        message: `Expired access for ${session.phone}`,
      });
    }

    const ids = expired.map((session) => session.id);
    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ status: "Expired", logout_time: now })
      .in("id", ids);

    if (updateErr) {
      throw updateErr;
    }

    const { data: expiredPppoe, error: pppoeFetchErr } = await supabase
      .from("pppoe_accounts")
      .select("id, username, router_id")
      .eq("service_status", "active")
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (pppoeFetchErr) {
      throw pppoeFetchErr;
    }

    for (const account of expiredPppoe || []) {
      if (!account.router_id) continue;

      const { data: router } = await supabase
        .from("routers")
        .select("*")
        .eq("id", account.router_id)
        .single();

      if (!router) continue;

      await revokePppoeAccess(router as RouterRecord, account.username);

      await auditLog(supabase, {
        user_id: router.user_id,
        org_id: router.org_id,
        router_id: router.id,
        action: "pppoe.expired",
        status: "success",
        message: `Suspended PPPoE user ${account.username}`,
      });
    }

    if ((expiredPppoe || []).length > 0) {
      const { error: suspendErr } = await supabase
        .from("pppoe_accounts")
        .update({
          service_status: "suspended",
          updated_at: now,
        })
        .in(
          "id",
          (expiredPppoe || []).map((account) => account.id),
        );

      if (suspendErr) {
        throw suspendErr;
      }
    }

    return new Response(JSON.stringify({
      expired_count: ids.length,
      expired_pppoe_count: (expiredPppoe || []).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown expire-sessions error";
    console.error("Expire sessions error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
