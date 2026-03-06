import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { DriftPreview } from "@/components/landing/drift-preview";
import { PricingTable } from "@/components/landing/pricing-table";
import { Footer } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Database, Shield, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <LandingNav />

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

      {/* Interactive Demo */}
      <InteractiveDemo />

      {/* Drift Timeline Preview */}
      <DriftPreview />

      {/* Pricing */}
      <PricingTable />

      {/* Footer */}
      <Footer />
    </main>
  );
}
