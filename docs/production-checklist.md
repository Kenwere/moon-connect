# Production Checklist

## What is now covered in code

- JWT-protected router control functions
- ISP ownership checks on router restart and router status calls
- Cron-secret protection for background expiry and router-health jobs
- Router API retry handling with timeout and backoff
- Voucher redemption flow through a real edge function
- Audit log storage for payments, voucher redemption, expiry jobs, and router actions
- Tenant checks on payment initiation so routers and packages must belong to the same ISP

## What still needs your real environment

### 1. Supabase secrets

Set these in Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ROOT_DOMAIN` or `PUBLIC_APP_URL`
- `CRON_SECRET`
- `INTASEND_WEBHOOK_CHALLENGE` if you use IntaSend

### 2. Cron jobs

Run [cron_setup.sql](/c:/wifi/access-spark-net/supabase/cron_setup.sql) after replacing:

- `YOUR_PROJECT_REF`
- `YOUR_CRON_SECRET`

### 3. Webhook dashboards

Configure these in the provider dashboards:

- Paystack:
  Use your deployed `payment-webhook` URL as the webhook endpoint.
- IntaSend:
  Set the webhook URL to the same `payment-webhook` function with `?provider=intasend`
- PesaPal:
  Set the callback or IPN flow to your deployed `payment-webhook` function with `?provider=pesapal`

### 4. MikroTik production access

For each router:

- enable RouterOS REST
- use HTTPS where possible
- restrict management access to only the IPs or ranges that need it
- do not expose router management broadly to the public internet
- make sure the router is reachable from Supabase Edge Functions

### 5. Testing you still need to perform

- real Paystack payment success
- real IntaSend payment success
- real PesaPal payment success
- captive portal redirect from a real MikroTik
- hotspot unlock after payment
- PPPoE renewal after payment
- forced disconnection after expiry
- router restart and online or offline status on a real device

## Recommended rollout order

1. Run migrations and deploy functions
2. Set secrets
3. Configure cron
4. Configure provider webhooks
5. Test with one router and one ISP first
6. Only then onboard more ISPs
