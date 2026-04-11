import {
  getRouterHealth,
  type RouterRecord,
} from "../_shared/mikrotik.ts";
import {
  auditLog,
  requireOwnedRouter,
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
    const { router_id } = await req.json();
    if (!router_id) {
      return new Response(JSON.stringify({ error: "router_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { service, user, router } = await requireOwnedRouter(req, router_id);

    const snapshot = await getRouterHealth(router as RouterRecord);
    const status = snapshot.isOnline ? "Online" : "Offline";
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSamples } = await service
      .from("router_health_samples")
      .select("uptime_seconds, downtime_seconds")
      .eq("router_id", router.id)
      .gte("recorded_at", since);

    const uptime24h = (recentSamples || []).reduce(
      (total, sample) => total + Number(sample.uptime_seconds || 0),
      0,
    );
    const downtime24h = (recentSamples || []).reduce(
      (total, sample) => total + Number(sample.downtime_seconds || 0),
      0,
    );
    const availability24h =
      uptime24h + downtime24h > 0
        ? (uptime24h / (uptime24h + downtime24h)) * 100
        : snapshot.isOnline
          ? 100
          : 0;

    await service
      .from("routers")
      .update({
        status,
        active_users: snapshot.activeUsers,
        model: snapshot.model || router.name,
      })
      .eq("id", router.id);

    await auditLog(service, {
      user_id: user.id,
      org_id: router.org_id,
      router_id: router.id,
      action: "router.status_checked",
      status: "success",
      message: `Router status resolved as ${status}`,
      meta: {
        uptime_seconds: snapshot.uptimeSeconds,
        cpu_load: snapshot.cpuLoad,
        active_users: snapshot.activeUsers,
        availability_24h: availability24h,
      },
    });

    return new Response(
      JSON.stringify({
        id: router.id,
        name: router.name,
        status,
        uptime_seconds: snapshot.uptimeSeconds,
        cpu_load: snapshot.cpuLoad,
        free_memory: snapshot.freeMemory,
        total_memory: snapshot.totalMemory,
        active_users: snapshot.activeUsers,
        hotspot_active_users: snapshot.activeHotspotUsers,
        pppoe_active_users: snapshot.activePppoeUsers,
        model: snapshot.model || router.name,
        board_name: snapshot.boardName,
        version: snapshot.version,
        last_seen_at: snapshot.lastSeenAt,
        uptime_24h: uptime24h,
        downtime_24h: downtime24h,
        availability_24h: availability24h,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown router-status error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
