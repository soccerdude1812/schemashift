import { Database, GitCompare, Sparkles, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Schema Memory",
    description:
      "Upload once, remember forever. SchemaShift builds a profile of every data source — column names, types, distributions, and patterns.",
    gradient: "from-emerald-500 to-emerald-600",
    glow: "bg-emerald-500/10",
  },
  {
    icon: GitCompare,
    title: "Drift Detection",
    description:
      "Renamed columns, changed types, new fields, dropped columns — caught automatically with a visual timeline of every change.",
    gradient: "from-amber-500 to-orange-500",
    glow: "bg-amber-500/10",
  },
  {
    icon: Sparkles,
    title: "Auto-Recipes",
    description:
      "Define cleaning rules once — trim whitespace, fix dates, normalize categories — and they auto-apply every time your data arrives.",
    gradient: "from-cyan-500 to-blue-500",
    glow: "bg-cyan-500/10",
  },
  {
    icon: BarChart3,
    title: "Quality Scoring",
    description:
      "Track data quality over time with completeness, consistency, and anomaly scores. Know when your data degrades before it breaks things.",
    gradient: "from-violet-500 to-purple-500",
    glow: "bg-violet-500/10",
  },
];

export function Features() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Everything your data pipeline{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              is missing
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Most data tools forget your files the moment you close the tab.
            SchemaShift remembers — and learns from every upload.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 hover:border-zinc-700/80 transition-all duration-500 hover:bg-zinc-900/60"
            >
              {/* Hover glow */}
              <div
                className={`absolute -inset-px rounded-2xl ${feature.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`}
              />

              {/* Icon */}
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-5`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                {feature.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
