import Link from "next/link";
import { Check, X, Database, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying SchemaShift on personal projects.",
    cta: "Get Started Free",
    ctaHref: "/dashboard",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    description: "For data professionals who need full pipeline coverage.",
    cta: "Start Pro Trial",
    ctaHref: "/dashboard",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For data teams that need shared schemas and collaboration.",
    cta: "Contact Sales",
    ctaHref: "/dashboard",
    highlight: false,
  },
];

const featureCategories = [
  {
    category: "Core Features",
    features: [
      {
        name: "Data sources",
        free: "5",
        pro: "Unlimited",
        team: "Unlimited",
      },
      {
        name: "Schema profiling",
        free: true,
        pro: true,
        team: true,
      },
      {
        name: "Column type detection",
        free: "Basic",
        pro: "ML-powered",
        team: "ML-powered",
      },
      {
        name: "Upload size limit",
        free: "10 MB",
        pro: "100 MB",
        team: "500 MB",
      },
    ],
  },
  {
    category: "Drift Detection",
    features: [
      {
        name: "Basic drift detection",
        free: true,
        pro: true,
        team: true,
      },
      {
        name: "Real-time drift alerts",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Drift timeline visualization",
        free: true,
        pro: true,
        team: true,
      },
      {
        name: "Cross-source drift comparison",
        free: false,
        pro: true,
        team: true,
      },
    ],
  },
  {
    category: "Cleaning Recipes",
    features: [
      {
        name: "Pre-built recipes",
        free: "3",
        pro: "Unlimited",
        team: "Unlimited",
      },
      {
        name: "Custom recipe builder",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Auto-apply on upload",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Shared recipe library",
        free: false,
        pro: false,
        team: true,
      },
    ],
  },
  {
    category: "Quality & Analytics",
    features: [
      {
        name: "Quality scoring",
        free: "Basic",
        pro: "Advanced",
        team: "Advanced",
      },
      {
        name: "ML anomaly detection",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Version history",
        free: "7 days",
        pro: "90 days",
        team: "Unlimited",
      },
      {
        name: "Export reports",
        free: false,
        pro: true,
        team: true,
      },
    ],
  },
  {
    category: "Collaboration & Integration",
    features: [
      {
        name: "Team members",
        free: "1",
        pro: "1",
        team: "Up to 20",
      },
      {
        name: "REST API access",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Webhook integrations",
        free: false,
        pro: false,
        team: true,
      },
      {
        name: "SSO / SAML",
        free: false,
        pro: false,
        team: true,
      },
      {
        name: "Role-based access",
        free: false,
        pro: false,
        team: true,
      },
    ],
  },
  {
    category: "Support",
    features: [
      {
        name: "Community support",
        free: true,
        pro: true,
        team: true,
      },
      {
        name: "Priority email support",
        free: false,
        pro: true,
        team: true,
      },
      {
        name: "Dedicated support",
        free: false,
        pro: false,
        team: true,
      },
    ],
  },
];

const faqs = [
  {
    question: "What file formats does SchemaShift support?",
    answer:
      "SchemaShift currently supports CSV and JSON files. We're working on adding Parquet, Excel (.xlsx), and TSV support in upcoming releases.",
  },
  {
    question: "Is my data stored on your servers?",
    answer:
      "SchemaShift is privacy-first. Your data is processed client-side whenever possible. Schema profiles and metadata are stored securely, but raw data is never persisted on our servers beyond the processing window.",
  },
  {
    question: "Can I use SchemaShift without creating an account?",
    answer:
      "Yes! The free tier works without any account. Your data source profiles are stored in your browser's local storage. Creating an account lets you sync across devices and access version history.",
  },
  {
    question: "What happens when I hit the free tier limit?",
    answer:
      "On the free tier, you can track up to 5 data sources. When you reach the limit, you'll need to remove an existing source before adding a new one, or upgrade to Pro for unlimited sources.",
  },
  {
    question: "How does drift detection work?",
    answer:
      "When you upload a new version of a file, SchemaShift compares it against the stored schema profile. It detects renamed columns (using fuzzy matching), added/removed columns, type changes, and statistical distribution shifts. Changes are visualized on a timeline.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Absolutely. All paid plans are month-to-month with no long-term commitment. Cancel anytime and you'll retain access until the end of your billing period. Your data and profiles are always exportable.",
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-zinc-700 mx-auto" />
    );
  }
  return (
    <span className="text-sm text-zinc-300 font-medium">{value}</span>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-base font-semibold text-zinc-100">
              SchemaShift
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Choose your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              plan
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Start free, upgrade when you need more power. All plans include core
            schema profiling and drift detection.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-500 ${
                  plan.highlight
                    ? "border-emerald-500/50 bg-zinc-900/80 shadow-lg shadow-emerald-500/10 md:scale-105"
                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-zinc-950 hover:bg-emerald-500 font-semibold px-4 py-1 text-xs">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-zinc-100">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-100">
                    {plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400 flex-1">
                  {plan.description}
                </p>
                <Button
                  asChild
                  className={`w-full mt-6 rounded-xl py-5 font-semibold transition-all duration-300 ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                  }`}
                >
                  <Link href={plan.ctaHref}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed comparison table */}
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-zinc-100 mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/60">
              <div className="text-sm font-medium text-zinc-400">Feature</div>
              <div className="text-sm font-medium text-zinc-300 text-center">
                Free
              </div>
              <div className="text-sm font-medium text-emerald-400 text-center">
                Pro
              </div>
              <div className="text-sm font-medium text-zinc-300 text-center">
                Team
              </div>
            </div>

            {/* Feature categories */}
            {featureCategories.map((category) => (
              <div key={category.category}>
                {/* Category header */}
                <div className="px-6 py-3 bg-zinc-800/20 border-b border-zinc-800/30">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {category.category}
                  </span>
                </div>

                {/* Feature rows */}
                {category.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-zinc-800/20 hover:bg-zinc-800/10 transition-colors"
                  >
                    <div className="text-sm text-zinc-300">{feature.name}</div>
                    <div className="text-center">
                      <FeatureValue value={feature.free} />
                    </div>
                    <div className="text-center">
                      <FeatureValue value={feature.pro} />
                    </div>
                    <div className="text-center">
                      <FeatureValue value={feature.team} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-zinc-100 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6"
              >
                <h3 className="text-base font-semibold text-zinc-100 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10">
            <h2 className="text-2xl font-bold text-zinc-100 mb-3">
              Ready to give your data a memory?
            </h2>
            <p className="text-zinc-400 mb-6">
              Start free, no credit card required. Upgrade anytime.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Link href="/dashboard">
                Try SchemaShift Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} SchemaShift. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
