import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cable,
  CreditCard,
  Globe,
  Router,
  ShieldCheck,
  Ticket,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Wifi,
    title: "Hotspot billing",
    description:
      "Sell time-limited access, top-up vouchers, and instant payment confirmations for every location.",
  },
  {
    icon: Cable,
    title: "PPPoE operations",
    description:
      "Create PPPoE profiles, set bandwidth tiers, and view active sessions right from the tenant dashboard.",
  },
  {
    icon: CreditCard,
    title: "Payments & reconciliation",
    description:
      "Track collections, export statements, and tie purchases to each tenant’s packages and vouchers.",
  },
  {
    icon: Router,
    title: "Router provisioning",
    description:
      "Generate MikroTik scripts or download .rsc files so field teams can onboard routers without guesswork.",
  },
  {
    icon: Ticket,
    title: "Voucher and package catalog",
    description:
      "Design recurring bundles, flash deals, or one-time vouchers with duration, speed, and data settings.",
  },
  {
    icon: Globe,
    title: "Tenant subdomains",
    description:
      "Each ISP locks in a private subdomain for login, provisioning, and captive-portal traffic isolation.",
  },
];

const steps = [
  "Register your ISP account, choose a subdomain, and set up the admin identity.",
  "Log in through your tenant URL, add routers, packages, and payment destinations.",
  "Deploy your captive portal or PPPoE profile and start collecting payments.",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tight">
                Moon<span className="text-primary">Connect</span>
              </p>
              <p className="text-xs text-slate-400">
                ISP billing + captive portal orchestration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-200 hover:text-white">
              <Link to="/login">ISP Login</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground">
              <Link to="/register">Register ISP</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 space-y-12">
          <section className="grid gap-10 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                SaaS for MikroTik ISPs
              </div>
              <h1 className="text-4xl font-display font-semibold leading-tight text-white sm:text-5xl">
                Launch WiFi billing, PPPoE control, and captive portals from a single admin view.
              </h1>
              <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
                MoonConnect keeps tenant data isolated, provisions routers, generates captive portals, and
                routes payments through the processors you trust. Every ISP gets their own subdomain so
                login links, routers, packages, and reports remain private.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground">
                  <Link to="/register" className="flex items-center gap-2">
                    Register your ISP
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-900/50 text-slate-200"
                >
                  <Link to="/login">Login to tenant</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-white/5 p-6 shadow-2xl shadow-primary/20 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Tenant access
                  </p>
                  <p className="font-mono text-sm text-primary">
                    starlink-fiber.moonconnect.app
                  </p>
                </div>
                <div className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Live
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Challenge
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Provision routers, captive portals, and packages without exposing your central platform.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Resolution
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Each ISP receives a dedicated subdomain, provisioning tokens, and router scripts right away.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Capabilities</p>
                <h2 className="text-2xl font-semibold text-white">Everything an ISP needs</h2>
              </div>
              <p className="text-sm text-slate-400">
                Tenant onboarding, billing, provisioning, and reporting in one place.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition hover:border-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner"
              >
                <p className="text-xs font-display font-semibold text-primary">0{index + 1}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{step}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
              <div>
                <h2 className="text-2xl font-semibold text-white">Go live with confidence</h2>
                <p className="mt-3 text-sm text-slate-300">
                  Use the provisioning dialog or .rsc export to configure MikroTik routers, then push your
                  captive portal URL, router token, and package catalog to every site. MoonConnect keeps the
                  portal experience consistent while giving each ISP complete control of their data.
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Tenant subdomains</span>
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Keep router tokens and captive portal sessions scoped to each ISP.</p>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Router health</span>
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Monitor status polls and restart commands from the admin dashboard.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
