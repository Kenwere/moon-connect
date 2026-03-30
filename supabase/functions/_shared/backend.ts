import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function requireOwnedRouter(
  req: Request,
  routerId: string,
) {
  const service = getServiceClient();
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await service.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error("Invalid user session");
  }

  const { data: router, error: routerError } = await service
    .from("routers")
    .select("*")
    .eq("id", routerId)
    .single();

  if (routerError || !router) {
    throw new Error("Router not found");
  }

  const isOwner = router.user_id === userData.user.id;
  const { data: ownedOrg } = await service
    .from("organizations")
    .select("id")
    .eq("id", router.org_id)
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (!isOwner && !ownedOrg) {
    throw new Error("You do not have access to this router");
  }

  return {
    service,
    user: userData.user,
    router,
  };
}

export function requireCronSecret(req: Request) {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return;

  const actual = req.headers.get("x-cron-secret");
  if (actual !== expected) {
    throw new Error("Invalid cron secret");
  }
}

export async function auditLog(
  service: ReturnType<typeof getServiceClient>,
  payload: {
    user_id?: string | null;
    org_id?: string | null;
    router_id?: string | null;
    payment_id?: string | null;
    action: string;
    status?: string;
    message?: string | null;
    meta?: Record<string, unknown>;
  },
) {
  await service.from("audit_logs").insert({
    user_id: payload.user_id || null,
    org_id: payload.org_id || null,
    router_id: payload.router_id || null,
    payment_id: payload.payment_id || null,
    action: payload.action,
    status: payload.status || "info",
    message: payload.message || null,
    meta: payload.meta || {},
  });
}
