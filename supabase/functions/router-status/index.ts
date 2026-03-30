import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRouterHealth,
  type RouterRecord,
} from "../_shared/mikrotik.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: router, error } = await supabase
      .from("routers")
      .select("*")
      .eq("id", router_id)
      .single();

    if (error || !router) {
      return new Response(JSON.stringify({ error: "Router not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapshot = await getRouterHealth(router as RouterRecord);
    const status = snapshot.isOnline ? "Online" : "Offline";

    await supabase
      .from("routers")
      .update({ status })
      .eq("id", router.id);

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
