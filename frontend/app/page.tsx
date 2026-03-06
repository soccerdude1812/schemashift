import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DriftPreview } from "@/components/landing/drift-preview";
import { PricingTable } from "@/components/landing/pricing-table";
import { Footer } from "@/components/landing/footer";
import { Database, Shield, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-base font-semibold text-zinc-100">
              SchemaShift
            </span>
          </a>
          <div className="hidden sm:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Pricing
            </a>
            <a
              href="/dashboard"
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <Hero />

      {/* Social proof bar */}
      <section className="py-12 border-y border-zinc-800/30 bg-zinc-900/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Database className="h-4 w-4 text-emerald-500" />
              <span>Open Source</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Privacy-First</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Globe className="h-4 w-4 text-emerald-500" />
              <span>No Account Required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* How It Works */}
      <HowItWorks />

      {/* Drift Timeline Preview */}
      <DriftPreview />

      {/* Pricing */}
      <PricingTable />

      {/* Footer */}
      <Footer />
    </main>
  );
}
