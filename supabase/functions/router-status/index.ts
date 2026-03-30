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

    await service
      .from("routers")
      .update({ status })
      .eq("id", router.id);

    await auditLog(service, {
      user_id: user.id,
      org_id: router.org_id,
      router_id: router.id,
      action: "router.status_checked",
      status: "success",
      message: `Router status resolved as ${status}`,
      meta: { uptime_seconds: snapshot.uptimeSeconds },
    });

    return new Response(
      JSON.stringify({
        id: router.id,
        name: router.name,
        status,
        uptime_seconds: snapshot.uptimeSeconds,
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
