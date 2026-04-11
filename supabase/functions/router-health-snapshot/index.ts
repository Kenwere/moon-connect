import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRouterHealth,
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

    const sampleIntervalSeconds = Number(
      Deno.env.get("ROUTER_HEALTH_SAMPLE_INTERVAL_SECONDS") || "300",
    );
    const recordedAt = new Date().toISOString();

    const { data: routers, error } = await supabase.from("routers").select("*");
    if (error) throw error;

    let onlineCount = 0;
    let offlineCount = 0;

    for (const router of routers || []) {
      const snapshot = await getRouterHealth(router as RouterRecord);

      if (snapshot.isOnline) {
        onlineCount += 1;
      } else {
        offlineCount += 1;
      }

      await supabase.from("router_health_samples").insert({
        user_id: router.user_id,
        org_id: router.org_id,
        router_id: router.id,
        router_name: router.name,
        is_online: snapshot.isOnline,
        uptime_seconds: snapshot.isOnline ? sampleIntervalSeconds : 0,
        downtime_seconds: snapshot.isOnline ? 0 : sampleIntervalSeconds,
        sample_interval_seconds: sampleIntervalSeconds,
        recorded_at: recordedAt,
      });

      await supabase
        .from("routers")
        .update({
          status: snapshot.isOnline ? "Online" : "Offline",
          active_users: snapshot.activeUsers,
          model: snapshot.model || router.name,
        })
        .eq("id", router.id);

      await auditLog(supabase, {
        user_id: router.user_id,
        org_id: router.org_id,
        router_id: router.id,
        action: "router.health_sampled",
        status: snapshot.isOnline ? "success" : "warning",
        message: `Router sampled as ${snapshot.isOnline ? "online" : "offline"}`,
        meta: {
          sample_interval_seconds: sampleIntervalSeconds,
          uptime_seconds: snapshot.uptimeSeconds,
          cpu_load: snapshot.cpuLoad,
          active_users: snapshot.activeUsers,
        },
      });
    }

    return new Response(
      JSON.stringify({
        sampled_count: (routers || []).length,
        online_count: onlineCount,
        offline_count: offlineCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown router-health-snapshot error";
    console.error("Router health snapshot error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
