MoonConnect WiFi billing system - design system and hosting preferences

## Hosting
- Frontend: Vercel (wildcard subdomain for multi-tenant)
- Backend: Lovable Cloud (Supabase)

## Design
- Font display: JetBrains Mono
- Font body: Inter
- Primary: HSL 199 89% 48% (professional blue)
- Theme: dark default, light mode supported
- NO gradients - solid colors only, professional look
- glass-card utility (solid bg-card, border, shadow-sm)
- Branding: MoonConnect (not HotSpot Pro)

## Auth
- Auto-confirm email enabled
- Roles: super_admin, admin, operator, support (stored in user_roles table)
- Auto-create profile + org + admin role on signup via trigger
- org_id added to profiles for team membership

## Multi-tenant
- Organizations table with subdomain field
- ISP registers → auto-creates org with subdomain
- Settings per org (payment credentials, branding, portal theme)

## Payment Gateways
- Paystack, IntaSend, PesaPal supported
- Credentials stored in settings table per org
- Edge functions: initiate-payment, payment-webhook, expire-sessions

## MikroTik
- provision-router edge function serves .rsc scripts via token URL
- Download moonconnect.rsc or auto-fetch via /tool fetch
