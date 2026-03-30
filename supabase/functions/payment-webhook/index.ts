import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ensureHotspotAccess,
  ensurePppoeAccess,
  type RouterRecord,
} from "../_shared/mikrotik.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-paystack-signature",
};

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPaystackSignature(
  payload: string,
  signature: string | null,
  secret: string | null | undefined,
) {
  if (!secret || !signature) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return hex(digest) === signature.toLowerCase();
}

async function verifyPaystackTransaction(reference: string, secretKey: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );
  const data = await response.json();
  return Boolean(data.status && data.data?.status === "success");
}

async function verifyPesapalTransaction(
  payment: Record<string, unknown>,
  settings: Record<string, unknown>,
) {
  const tokenRes = await fetch("https://pay.pesapal.com/v3/api/Auth/RequestToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: settings.pesapal_consumer_key,
      consumer_secret: settings.pesapal_consumer_secret,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.token) return false;

  const providerReference = String(payment.provider_reference || payment.transaction_id || "");
  if (!providerReference) return false;

  const statusRes = await fetch(
    `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerReference)}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.token}`,
        Accept: "application/json",
      },
    },
  );
  const statusData = await statusRes.json();
  const paymentStatus = String(
    statusData.payment_status_description || statusData.status || "",
  ).toLowerCase();
  return paymentStatus.includes("complete");
}

async function unlockRouterAccess(
  payment: Record<string, unknown>,
  router: RouterRecord,
  packageData: Record<string, unknown> | null,
  pppoeAccount: Record<string, unknown> | null,
) {
  const expiresAt =
    (payment.session_expiry as string | undefined) ||
    new Date(Date.now() + 120 * 60 * 1000).toISOString();
  const speedLimit =
    (packageData?.speed_limit as string | null | undefined) || "2M/2M";

  if ((router.connection_type || "hotspot") === "pppoe") {
    const username =
      String(
        pppoeAccount?.username ||
          payment.phone ||
          payment.transaction_id ||
          "pppoe-user",
      );
    const password = String(
      pppoeAccount?.password || pppoeAccount?.phone || payment.phone || username,
    );
    const profileName = String(
      pppoeAccount?.bandwidth_profile ||
        packageData?.name ||
        payment.package_name ||
        "moonconnect-pppoe",
    )
      .replace(/\s+/g, "-")
      .toLowerCase();

    await ensurePppoeAccess(router, {
      username,
      password,
      profileName: `mc-${profileName}`,
      rateLimit:
        (pppoeAccount?.speed_limit as string | null | undefined) || speedLimit,
      sessionLimit:
        Number(pppoeAccount?.session_limit || packageData?.session_limit || 1) || 1,
      remoteAddress: (pppoeAccount?.static_ip as string | null | undefined) || null,
      comment: `moonconnect-pppoe|${expiresAt}`,
    });
    return;
  }

  await ensureHotspotAccess(router, {
    phone: String(payment.phone),
    macAddress: (payment.mac_address as string | null | undefined) || null,
    deviceIp: (payment.device_ip as string | null | undefined) || null,
    expiresAt,
    speedLimit,
    sharedUsers: 1,
  });
}

function getBillingPeriodEnd(
  payment: Record<string, unknown>,
  packageData: Record<string, unknown> | null,
  pppoeAccount: Record<string, unknown> | null,
) {
  if (payment.session_expiry) {
    return new Date(String(payment.session_expiry)).toISOString();
  }

  const billingCycle = String(
    payment.billing_cycle ||
      pppoeAccount?.billing_cycle ||
      packageData?.duration_label ||
      "monthly",
  ).toLowerCase();
  const durationMinutes = Number(
    payment.payment_context &&
      typeof payment.payment_context === "object" &&
      "duration_minutes" in (payment.payment_context as Record<string, unknown>)
      ? (payment.payment_context as Record<string, unknown>).duration_minutes
      : packageData?.duration_minutes || 0,
  );
  const end = new Date();

  if (durationMinutes > 0 && billingCycle !== "monthly") {
    end.setMinutes(end.getMinutes() + durationMinutes);
    return end.toISOString();
  }

  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else if (billingCycle === "weekly") {
    end.setDate(end.getDate() + 7);
  } else if (billingCycle === "daily") {
    end.setDate(end.getDate() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return end.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const rawBody = req.method === "GET" ? "" : await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let paymentReference = "";
    let verified = false;

    if (provider === "paystack") {
      const signature = req.headers.get("x-paystack-signature");
      paymentReference = String(
        url.searchParams.get("reference") ||
          body?.data?.metadata?.payment_id ||
          body?.data?.reference ||
          "",
      );
      verified = req.method === "GET" ? Boolean(paymentReference) : Boolean(signature);
    } else if (provider === "intasend") {
      const challenge = Deno.env.get("INTASEND_WEBHOOK_CHALLENGE");
      verified = challenge ? body?.challenge === challenge || body?.state === "COMPLETE" : body?.state === "COMPLETE";
      paymentReference = String(body?.api_ref || body?.invoice_id || "");
    } else if (provider === "pesapal") {
      paymentReference = String(
        body?.merchant_reference || body?.OrderTrackingId || body?.order_tracking_id || "",
      );
      verified = Boolean(paymentReference);
    }

    if (!paymentReference) {
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .or(`id.eq.${paymentReference},transaction_id.eq.${paymentReference},provider_reference.eq.${paymentReference}`)
      .maybeSingle();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "Completed") {
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("org_id", payment.org_id)
      .single();

    if (provider === "paystack" && settings?.paystack_secret_key) {
      const transactionVerified = await verifyPaystackTransaction(
        String(payment.transaction_id || payment.id),
        settings.paystack_secret_key,
      );
      verified = req.method === "GET"
        ? transactionVerified
        : (await verifyPaystackSignature(
            rawBody,
            req.headers.get("x-paystack-signature"),
            settings.paystack_secret_key,
          )) && transactionVerified;
    } else if (provider === "pesapal" && settings?.pesapal_consumer_key) {
      verified = await verifyPesapalTransaction(payment, settings);
    }

    if (!verified) {
      return new Response(JSON.stringify({ error: "Webhook verification failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: router } = payment.router_id
      ? await supabase.from("routers").select("*").eq("id", payment.router_id).single()
      : { data: null };
    const { data: packageData } = payment.package_id
      ? await supabase.from("packages").select("*").eq("id", payment.package_id).single()
      : { data: null };
    const pppoeAccount =
      payment.pppoe_account_id
        ? (
            await supabase
              .from("pppoe_accounts")
              .select("*")
              .eq("id", payment.pppoe_account_id)
              .maybeSingle()
          ).data
        : router?.connection_type === "pppoe"
          ? (
              await supabase
                .from("pppoe_accounts")
                .select("*")
                .eq("router_id", payment.router_id)
                .or(
                  `phone.eq.${payment.phone},username.eq.${payment.phone}`,
                )
                .maybeSingle()
            ).data
          : null;

    const periodStart = new Date().toISOString();
    const periodEnd = getBillingPeriodEnd(payment, packageData, pppoeAccount);
    const normalizedProviderReference =
      String(
        body?.data?.reference ||
          body?.invoice_id ||
          body?.OrderTrackingId ||
          payment.provider_reference ||
          paymentReference,
      ) || null;

    await supabase
      .from("payments")
      .update({
        status: "Completed",
        provider_reference: normalizedProviderReference,
        session_expiry: periodEnd,
        billing_cycle:
          String(payment.billing_cycle || pppoeAccount?.billing_cycle || "monthly"),
        period_start: periodStart,
        period_end: periodEnd,
        pppoe_account_id: pppoeAccount?.id || payment.pppoe_account_id || null,
      })
      .eq("id", payment.id);

    if (router) {
      await unlockRouterAccess(payment, router as RouterRecord, packageData, pppoeAccount);
    }

    if (router?.connection_type === "pppoe" && pppoeAccount?.id) {
      await supabase
        .from("pppoe_accounts")
        .update({
          service_status: "active",
          expires_at: periodEnd,
          last_paid_at: periodStart,
          next_billing_date: periodEnd,
          billing_amount:
            Number(payment.amount || pppoeAccount.billing_amount || packageData?.price || 0),
          package_id: payment.package_id || pppoeAccount.package_id || null,
          router_id: payment.router_id || pppoeAccount.router_id || null,
          updated_at: periodStart,
        })
        .eq("id", pppoeAccount.id);

      await supabase.from("pppoe_sessions").insert({
        user_id: payment.user_id,
        org_id: payment.org_id,
        account_id: pppoeAccount.id,
        router_id: payment.router_id,
        username: pppoeAccount.username,
        ip_address: payment.device_ip,
        mac_address: payment.mac_address,
        status: "online",
        connected_at: periodStart,
      });
    }

    await supabase.from("sessions").insert({
      user_id: payment.user_id,
      org_id: payment.org_id,
      router_id: payment.router_id,
      phone: payment.phone,
      package_name: payment.package_name,
      status: "Active",
      login_time: periodStart,
      expires_at: periodEnd,
      mac_address: payment.mac_address,
      device_ip: payment.device_ip,
    });

    return new Response(JSON.stringify({ received: true, unlocked: Boolean(router) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown payment-webhook error";
    console.error("Webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
