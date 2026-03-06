import { Upload, Search, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload",
    description:
      "Drop your CSV or JSON file. SchemaShift instantly parses it and builds a complete schema profile — column names, types, distributions, and quality metrics.",
  },
  {
    number: "02",
    icon: Search,
    title: "Analyze",
    description:
      "Instant schema profiling with ML-powered type detection. We infer the real types (emails, dates, categories) — not just what the file says they are.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Track",
    description:
      "See how your data evolves with drift timelines. When columns change, types shift, or quality degrades — you see it immediately with actionable alerts.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Three steps to{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              data clarity
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            From raw file to full observability in under a minute.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-emerald-500/30 via-emerald-500/50 to-emerald-500/30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center group">
                {/* Number circle */}
                <div className="relative inline-flex mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors duration-500 relative z-10">
                    <step.icon className="h-7 w-7 text-emerald-400" />
                  </div>
                  {/* Step number */}
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center justify-center z-20">
                    {index + 1}
                  </span>
                  {/* Glow */}
                  <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                  {step.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
