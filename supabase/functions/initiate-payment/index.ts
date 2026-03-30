import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const {
      org_id,
      phone,
      amount,
      package_name,
      package_id,
      pppoe_account_id,
      duration_minutes,
      billing_cycle,
      payment_method,
      router_id,
      router_token,
      device_ip,
      mac_address,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings, error: settingsErr } = await supabase
      .from("settings")
      .select("*")
      .eq("org_id", org_id)
      .single();

    if (settingsErr || !settings) {
      return new Response(JSON.stringify({ error: "Organization settings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let routerRecord: Record<string, unknown> | null = null;
    if (router_token) {
      const { data } = await supabase
        .from("routers")
        .select("*")
        .eq("provision_token", router_token)
        .single();
      routerRecord = data;
    } else if (router_id) {
      const { data } = await supabase
        .from("routers")
        .select("*")
        .eq("id", router_id)
        .single();
      routerRecord = data;
    }

    if (routerRecord?.org_id && routerRecord.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Router does not belong to this ISP" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedPackage: Record<string, unknown> | null = null;
    if (package_id) {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("id", package_id)
        .eq("org_id", org_id)
        .eq("active", true)
        .single();
      resolvedPackage = data;
    }

    if (!resolvedPackage) {
      return new Response(JSON.stringify({ error: "Package not found for this ISP" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = payment_method || settings.default_payment_method || "intasend";
    const paymentId = crypto.randomUUID();
    const resolvedAmount = Number(resolvedPackage.price || amount || 0);
    const resolvedPackageName = String(resolvedPackage.name || package_name || "Package");
    const resolvedDurationMinutes = Number(
      resolvedPackage.duration_minutes || duration_minutes || 120,
    );
    const expiresAt = new Date();
    if (billing_cycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (billing_cycle === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (billing_cycle === "weekly") {
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else if (billing_cycle === "daily") {
      expiresAt.setDate(expiresAt.getDate() + 1);
    } else {
      expiresAt.setTime(
        Date.now() + resolvedDurationMinutes * 60 * 1000,
      );
    }

    const { error: paymentInsertError } = await supabase.from("payments").insert({
      id: paymentId,
      user_id: settings.user_id,
      org_id,
      package_id: package_id || null,
      pppoe_account_id: pppoe_account_id || null,
      router_id: (routerRecord?.id as string | undefined) || null,
      phone,
      package_name: resolvedPackageName,
      amount: resolvedAmount,
      method,
      router_name: (routerRecord?.name as string | undefined) || null,
      device_ip: device_ip || null,
      mac_address: mac_address || null,
      session_expiry: expiresAt.toISOString(),
      billing_cycle: billing_cycle || null,
      status: "Pending",
      payment_context: {
        duration_minutes: duration_minutes || 120,
        resolved_duration_minutes: resolvedDurationMinutes,
        router_token: router_token || null,
        billing_cycle: billing_cycle || null,
        pppoe_account_id: pppoe_account_id || null,
      },
    });

    if (paymentInsertError) {
      throw paymentInsertError;
    }

    await auditLog(supabase, {
      user_id: settings.user_id,
      org_id,
      router_id: (routerRecord?.id as string | undefined) || null,
      payment_id: paymentId,
      action: "payment.initiated",
      status: "info",
      message: `Initialized ${method} payment for ${resolvedPackageName}`,
      meta: {
        phone,
        amount: resolvedAmount,
        package_id,
        router_token: router_token || null,
      },
    });

    let paymentResult: Record<string, unknown> = {};

    if (method === "paystack" && settings.paystack_secret_key) {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.paystack_secret_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(resolvedAmount * 100),
          email: `${phone.replace(/[^0-9]/g, "")}@hotspot.local`,
          currency: "KES",
          callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=paystack`,
          reference: paymentId,
          metadata: {
            payment_id: paymentId,
            phone,
            package_name: resolvedPackageName,
            package_id,
            pppoe_account_id,
            org_id,
            duration_minutes: resolvedDurationMinutes,
            billing_cycle,
            router_id: (routerRecord?.id as string | undefined) || null,
            mac_address: mac_address || null,
            device_ip: device_ip || null,
          },
        }),
      });
      const data = await res.json();
      if (!data.status) {
        throw new Error(data.message || "Paystack initialization failed");
      }

      paymentResult = {
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        provider: "paystack",
      };
    } else if (method === "intasend" && settings.intasend_secret_key) {
      const res = await fetch(
        "https://payment.intasend.com/api/v1/payment/mpesa-stk-push/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.intasend_secret_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: resolvedAmount,
            phone_number: phone,
            api_ref: paymentId,
            narrative: `WiFi - ${resolvedPackageName}`,
          }),
        },
      );
      const data = await res.json();

      paymentResult = {
        invoice_id: data.invoice?.invoice_id || null,
        reference: paymentId,
        provider: "intasend",
        status: "stk_sent",
      };
    } else if (method === "pesapal" && settings.pesapal_consumer_key) {
      const tokenRes = await fetch(
        "https://pay.pesapal.com/v3/api/Auth/RequestToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            consumer_key: settings.pesapal_consumer_key,
            consumer_secret: settings.pesapal_consumer_secret,
          }),
        },
      );
      const tokenData = await tokenRes.json();
      if (!tokenData.token) {
        throw new Error("PesaPal auth failed");
      }

      const orderRes = await fetch(
        "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            id: paymentId,
            currency: "KES",
            amount: resolvedAmount,
            description: `WiFi - ${resolvedPackageName}`,
            callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=pesapal`,
            billing_address: { phone_number: phone },
          }),
        },
      );
      const orderData = await orderRes.json();

      paymentResult = {
        redirect_url: orderData.redirect_url,
        reference: paymentId,
        order_tracking_id: orderData.order_tracking_id,
        provider: "pesapal",
      };
    } else {
      throw new Error("No valid payment method configured");
    }

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        transaction_id: String(paymentResult.reference || paymentId),
        provider_reference:
          String(
            paymentResult.reference ||
              paymentResult.invoice_id ||
              paymentResult.order_tracking_id ||
              paymentId,
          ) || null,
      })
      .eq("id", paymentId);

    if (paymentUpdateError) {
      throw paymentUpdateError;
    }

    await auditLog(supabase, {
      user_id: settings.user_id,
      org_id,
      router_id: (routerRecord?.id as string | undefined) || null,
      payment_id: paymentId,
      action: "payment.provider_initialized",
      status: "success",
      message: `Provider initialized for ${method}`,
      meta: {
        provider_reference:
          paymentResult.reference ||
          paymentResult.invoice_id ||
          paymentResult.order_tracking_id ||
          null,
      },
    });

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown initiate-payment error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
