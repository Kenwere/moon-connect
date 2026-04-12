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

interface RadiusAuthRequest {
  username: string;
  password: string;
  nas_ip_address?: string;
  nas_port_id?: string;
  calling_station_id?: string;
  called_station_id?: string;
}

interface RadiusAcctRequest {
  username: string;
  nas_ip_address?: string;
  nas_port_id?: string;
  acct_session_id?: string;
  acct_status_type: 'Start' | 'Stop' | 'Interim-Update' | 'Accounting-On' | 'Accounting-Off';
  acct_input_octets?: number;
  acct_output_octets?: number;
  acct_session_time?: number;
  acct_terminate_cause?: string;
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
    const url = new URL(req.url);

    // Extract server ID from URL path or query parameter
    const serverId = url.pathname.split('/').pop() || url.searchParams.get('server_id');

    if (!serverId) {
      return new Response(
        JSON.stringify({ error: "Missing server_id" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Verify the RADIUS server exists and is active
    const { data: radiusServer, error: serverError } = await supabase
      .from("radius_servers")
      .select("*")
      .eq("id", serverId)
      .eq("is_active", true)
      .single();

    if (serverError || !radiusServer) {
      return new Response(
        JSON.stringify({ error: "RADIUS server not found or inactive" }),
        { status: 404, headers: jsonHeaders }
      );
    }

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = await req.json();

        if (url.pathname.includes('/auth')) {
          // Handle RADIUS Authentication
          return await handleRadiusAuth(supabase, radiusServer, body as RadiusAuthRequest);
        } else if (url.pathname.includes('/acct')) {
          // Handle RADIUS Accounting
          return await handleRadiusAccounting(supabase, radiusServer, body as RadiusAcctRequest);
        }
      }
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders }
    );

  } catch (error) {
    console.error("RADIUS API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});

async function handleRadiusAuth(
  supabase: any,
  radiusServer: any,
  authRequest: RadiusAuthRequest
): Promise<Response> {
  const { username, password, nas_ip_address, calling_station_id } = authRequest;

  try {
    // Find user by username (could be email, phone, or custom username)
    let userQuery = supabase.from("users").select("*");

    // Try different username formats
    if (username.includes('@')) {
      userQuery = userQuery.eq("email", username);
    } else if (username.match(/^\+?\d+$/)) {
      userQuery = userQuery.eq("phone", username);
    } else {
      // Custom username field - you might need to add this to your users table
      userQuery = userQuery.eq("username", username);
    }

    const { data: user, error: userError } = await userQuery.single();

    if (userError || !user) {
      // Log failed authentication
      await supabase.from("radius_logs").insert({
        radius_server_id: radiusServer.id,
        event_type: 'auth',
        username: username,
        success: false,
        nas_ip_address,
        calling_station_id,
        error_message: 'User not found'
      });

      return new Response(
        JSON.stringify({
          "Reply-Message": "Authentication failed",
          "Auth-Type": "Reject"
        }),
        { headers: jsonHeaders }
      );
    }

    // Check if user has active package/subscription
    const { data: activePackage } = await supabase
      .from("user_packages")
      .select("*, packages(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!activePackage) {
      await supabase.from("radius_logs").insert({
        radius_server_id: radiusServer.id,
        event_type: 'auth',
        username: username,
        user_id: user.id,
        success: false,
        nas_ip_address,
        calling_station_id,
        error_message: 'No active package'
      });

      return new Response(
        JSON.stringify({
          "Reply-Message": "No active subscription",
          "Auth-Type": "Reject"
        }),
        { headers: jsonHeaders }
      );
    }

    // Verify password (you might want to use proper password hashing)
    // For now, this is a simplified check - in production use proper auth
    const isValidPassword = password === user.password ||
                           await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      await supabase.from("radius_logs").insert({
        radius_server_id: radiusServer.id,
        event_type: 'auth',
        username: username,
        user_id: user.id,
        success: false,
        nas_ip_address,
        calling_station_id,
        error_message: 'Invalid password'
      });

      return new Response(
        JSON.stringify({
          "Reply-Message": "Invalid credentials",
          "Auth-Type": "Reject"
        }),
        { headers: jsonHeaders }
      );
    }

    // Authentication successful
    await supabase.from("radius_logs").insert({
      radius_server_id: radiusServer.id,
      event_type: 'auth',
      username: username,
      user_id: user.id,
      success: true,
      nas_ip_address,
      calling_station_id,
      package_id: activePackage.package_id
    });

    // Return RADIUS attributes
    const response = {
      "Auth-Type": "Accept",
      "User-Name": username,
      "Framed-IP-Address": "255.255.255.254", // Dynamic IP assignment
      "Framed-IP-Netmask": "255.255.255.255",
      "Service-Type": "Framed-User",
      "Framed-Protocol": "PPP"
    };

    // Add bandwidth limits if configured
    if (activePackage.packages?.download_speed) {
      response["Mikrotik-Rate-Limit"] = `${activePackage.packages.download_speed}M/${activePackage.packages.upload_speed || activePackage.packages.download_speed}M`;
    }

    return new Response(JSON.stringify(response), { headers: jsonHeaders });

  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Authentication processing failed" }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

async function handleRadiusAccounting(
  supabase: any,
  radiusServer: any,
  acctRequest: RadiusAcctRequest
): Promise<Response> {
  const {
    username,
    nas_ip_address,
    acct_session_id,
    acct_status_type,
    acct_input_octets,
    acct_output_octets,
    acct_session_time
  } = acctRequest;

  try {
    // Find user
    let userQuery = supabase.from("users").select("id");

    if (username.includes('@')) {
      userQuery = userQuery.eq("email", username);
    } else if (username.match(/^\+?\d+$/)) {
      userQuery = userQuery.eq("phone", username);
    } else {
      userQuery = userQuery.eq("username", username);
    }

    const { data: user } = await userQuery.single();

    // Log accounting event
    await supabase.from("radius_logs").insert({
      radius_server_id: radiusServer.id,
      event_type: 'accounting',
      username: username,
      user_id: user?.id,
      success: true,
      nas_ip_address,
      acct_session_id,
      acct_status_type,
      acct_input_octets,
      acct_output_octets,
      acct_session_time
    });

    // Update user session data if needed
    if (acct_status_type === 'Start' && user?.id) {
      await supabase.from("user_sessions").insert({
        user_id: user.id,
        radius_server_id: radiusServer.id,
        session_id: acct_session_id,
        nas_ip_address,
        started_at: new Date().toISOString(),
        status: 'active'
      });
    } else if (acct_status_type === 'Stop' && acct_session_id) {
      await supabase
        .from("user_sessions")
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
          total_bytes: (acct_input_octets || 0) + (acct_output_octets || 0),
          session_duration: acct_session_time
        })
        .eq("session_id", acct_session_id);
    }

    return new Response(JSON.stringify({}), { headers: jsonHeaders });

  } catch (error) {
    console.error("Accounting error:", error);
    return new Response(
      JSON.stringify({ error: "Accounting processing failed" }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

// Helper function for password verification
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // Implement proper password verification
  // This is a placeholder - use a proper crypto library
  return plainPassword === hashedPassword;
}