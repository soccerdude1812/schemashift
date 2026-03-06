"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/shared/upgrade-button";

const STRIPE_PRICE_PRO = "price_1T7OEdC4ZKN578LyDvD7vWnU";
const STRIPE_PRICE_TEAM = "price_1T7OGDC4ZKN578LyqXjnhldM";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying SchemaShift on personal projects.",
    cta: "Get Started Free",
    ctaHref: "/dashboard",
    highlight: false,
    stripePrice: null as string | null,
    features: [
      { text: "5 data sources", included: true },
      { text: "Schema profiling", included: true },
      { text: "Basic drift detection", included: true },
      { text: "3 cleaning recipes", included: true },
      { text: "7-day version history", included: true },
      { text: "Community support", included: true },
      { text: "Anomaly detection", included: false },
      { text: "Custom recipes", included: false },
      { text: "API access", included: false },
      { text: "Team collaboration", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    description: "For data professionals who need full pipeline coverage.",
    cta: "Start Pro Trial",
    ctaHref: null as string | null,
    highlight: true,
    stripePrice: STRIPE_PRICE_PRO as string | null,
    features: [
      { text: "Unlimited data sources", included: true },
      { text: "Advanced schema profiling", included: true },
      { text: "Real-time drift alerts", included: true },
      { text: "Unlimited cleaning recipes", included: true },
      { text: "90-day version history", included: true },
      { text: "Priority support", included: true },
      { text: "ML anomaly detection", included: true },
      { text: "Custom recipe builder", included: true },
      { text: "REST API access", included: true },
      { text: "Team collaboration", included: false },
    ],
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For data teams that need shared schemas and collaboration.",
    cta: "Contact Sales",
    ctaHref: null as string | null,
    highlight: false,
    stripePrice: STRIPE_PRICE_TEAM as string | null,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Up to 20 team members", included: true },
      { text: "Shared data sources", included: true },
      { text: "Role-based access", included: true },
      { text: "Unlimited version history", included: true },
      { text: "Dedicated support", included: true },
      { text: "Advanced anomaly models", included: true },
      { text: "Shared recipe library", included: true },
      { text: "Webhook integrations", included: true },
      { text: "SSO / SAML", included: true },
    ],
  },
];

export function PricingTable() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              pricing
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Start free. Upgrade when your data pipeline demands it.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-500 ${
                plan.highlight
                  ? "border-emerald-500/50 bg-zinc-900/80 shadow-lg shadow-emerald-500/10 scale-[1.02] md:scale-105"
                  : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80"
              }`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-zinc-950 hover:bg-emerald-500 font-semibold px-4 py-1 text-xs">
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-100">
                    {plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
              </div>

              {/* CTA */}
              {plan.stripePrice ? (
                <div className="mb-8">
                  <UpgradeButton
                    priceId={plan.stripePrice}
                    label={plan.cta}
                    variant={plan.highlight ? "highlight" : "default"}
                  />
                </div>
              ) : (
                <Button
                  asChild
                  className={`w-full mb-8 rounded-xl py-5 font-semibold transition-all duration-300 ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                  }`}
                >
                  <Link href={plan.ctaHref!}>{plan.cta}</Link>
                </Button>
              )}

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-600 mt-0.5 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
