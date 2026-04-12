import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

interface RouterCommand {
  router_id: string;
  command: string;
  parameters?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const supabaseServiceKey = Deno.env.get("SERVICE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const url = new URL(req.url);
    const routerId = url.searchParams.get("router_id");

    if (!routerId) {
      return new Response(
        JSON.stringify({ error: "Missing router_id parameter" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Verify user has access to this router
    const { data: router, error: routerError } = await supabase
      .from("routers")
      .select("id, user_id, org_id")
      .eq("id", routerId)
      .single();

    if (routerError || !router) {
      return new Response(
        JSON.stringify({ error: "Router not found" }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Check if user owns the router or is in the same org
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id);

    const userOrgIds = orgs?.map(org => org.id) || [];
    const hasAccess = router.user_id === user.id ||
                     (router.org_id && userOrgIds.includes(router.org_id));

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    if (req.method === "POST") {
      const body: RouterCommand = await req.json();

      if (!body.command) {
        return new Response(
          JSON.stringify({ error: "Missing command" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // Insert command into queue
      const { data: command, error: insertError } = await supabase
        .from("router_commands")
        .insert({
          router_id: routerId,
          command: body.command,
          parameters: body.parameters || {},
          priority: body.priority || 'normal',
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to queue command", details: insertError }),
          { status: 500, headers: jsonHeaders }
        );
      }

      // Log the command
      await supabase.from("router_logs").insert({
        router_id: routerId,
        level: 'info',
        message: `Command queued: ${body.command}`,
        metadata: { command_id: command.id, user_id: user.id }
      });

      return new Response(
        JSON.stringify({
          success: true,
          command: command,
          message: "Command queued successfully"
        }),
        { headers: jsonHeaders }
      );

    } else if (req.method === "GET") {
      // Get command status/history
      const { data: commands, error: fetchError } = await supabase
        .from("router_commands")
        .select("*")
        .eq("router_id", routerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch commands" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ commands }),
        { headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders }
    );

  } catch (error) {
    console.error("Router command error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});