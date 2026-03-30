import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cable,
  CreditCard,
  Globe,
  LayoutDashboard,
  Router,
  ShieldCheck,
  Ticket,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Wifi,
    title: "Hotspot Billing",
    description:
      "Sell timed WiFi packages, control access, and automate paid captive portal sessions.",
  },
  {
    icon: Cable,
    title: "PPPoE Management",
    description:
      "Create PPPoE usernames, passwords, bandwidth profiles, session limits, and active subscriber tracking.",
  },
  {
    icon: CreditCard,
    title: "Payments",
    description:
      "Track collections, package purchases, and payment history for every ISP tenant.",
  },
  {
    icon: Router,
    title: "Router Provisioning",
    description:
      "Manage MikroTik routers, provisioning links, and connection modes from one dashboard.",
  },
  {
    icon: Ticket,
    title: "Vouchers And Packages",
    description:
      "Offer vouchers, prepaid plans, and custom bandwidth or duration packages in minutes.",
  },
  {
    icon: Globe,
    title: "Tenant Subdomains",
    description:
      "Each ISP gets its own branded subdomain for login, portal access, and tenant isolation.",
  },
];

const steps = [
  "Register your ISP account and choose your tenant subdomain.",
  "Log in on your own subdomain and configure packages, routers, and payments.",
  "Go live with captive portal or PPPoE billing for your customers.",
];

export default function Index() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.20),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_hsl(var(--background)),_hsl(220_24%_8%))] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tight">
                Moon<span className="text-primary">Connect</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Multi-tenant ISP billing platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/login">ISP Login</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link to="/register">Register ISP</Link>
            </Button>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <section>
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              SaaS billing for hotspot and PPPoE ISPs
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-display font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Launch WiFi billing, PPPoE accounts, and tenant portals from one system.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              MoonConnect helps ISPs manage hotspot billing, PPPoE subscribers,
              MikroTik routers, packages, payments, vouchers, and captive portals.
              Every ISP gets its own subdomain to log in and manage its own network.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground">
                <Link to="/register">
                  Register Your ISP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-card/50">
                <Link to="/login">Login To Existing ISP</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
                <p className="text-2xl font-display font-bold text-white">Multi-ISP</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Separate tenant accounts with isolated data and branding.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
                <p className="text-2xl font-display font-bold text-white">PPPoE + Hotspot</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Support both access models in one admin experience.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
                <p className="text-2xl font-display font-bold text-white">Tenant URL</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Example: `yourisp.moonconnect.app`
                </p>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-emerald-400/15 blur-2xl" />
            <div className="rounded-[2rem] border border-border/60 bg-card/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Tenant Access
                  </p>
                  <p className="mt-1 font-mono text-sm text-primary">
                    starlink-fiber.moonconnect.app
                  </p>
                </div>
                <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                  Live
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-border/60 bg-background/45 p-4"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-sm font-semibold text-white">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <section className="mt-10 rounded-[2rem] border border-border/60 bg-card/60 p-6 backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                How ISPs start with MoonConnect
              </h2>
              <p className="text-sm text-muted-foreground">
                A clean onboarding flow from signup to tenant dashboard.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-border/60 bg-background/40 p-5">
                <p className="font-display text-2xl font-bold text-primary">
                  0{index + 1}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
