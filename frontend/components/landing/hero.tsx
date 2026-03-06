import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-400/5 blur-[80px] animate-float"
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-medium animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Open Source & Privacy-First
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-balance animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          Your data has a{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent animate-gradient-shift">
              memory problem
            </span>
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="mt-6 text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed text-balance animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          SchemaShift remembers every CSV you&apos;ve ever uploaded. Detect schema drift,
          auto-apply cleaning recipes, and catch data quality issues before they
          break your pipeline.
        </p>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Button
            asChild
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300"
          >
            <Link href="/dashboard">
              Try SchemaShift Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white px-8 py-6 text-base rounded-xl transition-all duration-300"
          >
            <a href="#how-it-works">
              See how it works
              <ChevronDown className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>

        {/* Drift timeline mockup */}
        <div
          className="mt-20 relative animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="relative mx-auto max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm p-6 shadow-2xl shadow-emerald-500/5">
            {/* Window chrome */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-zinc-800/50 text-xs text-zinc-500 font-mono">
                  schemashift.dev/dashboard
                </div>
              </div>
            </div>

            {/* Mock drift timeline */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-500 font-mono text-xs w-20">Mar 01</span>
                <div className="flex-1 flex gap-1.5">
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">user_id</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">email</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">name</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">created_at</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-500 font-mono text-xs w-20">Mar 03</span>
                <div className="flex-1 flex gap-1.5">
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">user_id</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">email</div>
                  <div className="h-8 rounded bg-amber-500/20 border border-amber-500/30 flex items-center px-2 text-xs text-amber-400 font-mono">full_name</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">created_at</div>
                  <div className="h-8 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center px-2 text-xs text-cyan-400 font-mono">+role</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-500 font-mono text-xs w-20">Mar 05</span>
                <div className="flex-1 flex gap-1.5">
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">user_id</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">email</div>
                  <div className="h-8 rounded bg-amber-500/20 border border-amber-500/30 flex items-center px-2 text-xs text-amber-400 font-mono">full_name</div>
                  <div className="h-8 rounded bg-red-500/20 border border-red-500/30 flex items-center px-2 text-xs text-red-400 font-mono line-through">-created_at</div>
                  <div className="h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2 text-xs text-emerald-400 font-mono">role</div>
                  <div className="h-8 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center px-2 text-xs text-cyan-400 font-mono">+updated_at</div>
                </div>
              </div>
            </div>

            {/* Drift alert badge */}
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                2 drift events detected
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                1 recipe auto-applied
              </div>
            </div>
          </div>

          {/* Glow effect behind the mockup */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent blur-2xl" />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <ChevronDown className="h-6 w-6 text-zinc-600" />
      </div>
    </section>
  );
}
