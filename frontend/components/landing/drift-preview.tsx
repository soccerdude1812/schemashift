import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const timelineData = [
  {
    date: "Feb 28",
    label: "Baseline",
    columns: [
      { name: "id", status: "stable" as const },
      { name: "email", status: "stable" as const },
      { name: "name", status: "stable" as const },
      { name: "signup_date", status: "stable" as const },
      { name: "plan", status: "stable" as const },
    ],
    qualityScore: 94,
  },
  {
    date: "Mar 01",
    label: "Minor drift",
    columns: [
      { name: "id", status: "stable" as const },
      { name: "email", status: "stable" as const },
      { name: "full_name", status: "renamed" as const },
      { name: "signup_date", status: "stable" as const },
      { name: "plan", status: "stable" as const },
      { name: "role", status: "added" as const },
    ],
    qualityScore: 87,
  },
  {
    date: "Mar 03",
    label: "Breaking drift",
    columns: [
      { name: "id", status: "stable" as const },
      { name: "email", status: "stable" as const },
      { name: "full_name", status: "stable" as const },
      { name: "signup_date", status: "removed" as const },
      { name: "plan_tier", status: "renamed" as const },
      { name: "role", status: "stable" as const },
      { name: "org_id", status: "added" as const },
    ],
    qualityScore: 71,
  },
  {
    date: "Mar 05",
    label: "Recipe applied",
    columns: [
      { name: "id", status: "stable" as const },
      { name: "email", status: "stable" as const },
      { name: "full_name", status: "stable" as const },
      { name: "created_at", status: "added" as const },
      { name: "plan_tier", status: "stable" as const },
      { name: "role", status: "stable" as const },
      { name: "org_id", status: "stable" as const },
    ],
    qualityScore: 89,
  },
];

const statusColors = {
  stable: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
  added: "bg-cyan-500/15 border-cyan-500/25 text-cyan-400",
  removed: "bg-red-500/15 border-red-500/25 text-red-400 line-through",
  renamed: "bg-amber-500/15 border-amber-500/25 text-amber-400",
};

const statusLabel = {
  stable: "",
  added: "+",
  removed: "-",
  renamed: "~",
};

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-emerald-500"
      : score >= 80
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-zinc-500">{score}%</span>
    </div>
  );
}

export function DriftPreview() {
  return (
    <section className="py-24 md:py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.015] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Catch drift{" "}
            <span className="bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
              before it breaks
            </span>{" "}
            your pipeline
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            Watch how SchemaShift tracks every column change across uploads —
            renamed fields, new columns, dropped columns, type changes — all on
            a visual timeline.
          </p>
        </div>

        {/* Timeline card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          {/* Header bar */}
          <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-zinc-300">
                Drift Timeline — users_export.csv
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Stable
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Added
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Renamed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Removed
              </span>
            </div>
          </div>

          {/* Timeline rows */}
          <div className="divide-y divide-zinc-800/30">
            {timelineData.map((row, index) => (
              <div
                key={row.date}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-zinc-800/10 transition-colors"
              >
                {/* Date & label */}
                <div className="flex items-center gap-3 sm:w-36 shrink-0">
                  <span className="text-xs font-mono text-zinc-500 w-12">
                    {row.date}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      index === 0
                        ? "bg-zinc-800 text-zinc-400"
                        : index === 2
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : index === 3
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {row.label}
                  </span>
                </div>

                {/* Columns */}
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {row.columns.map((col) => (
                    <div
                      key={`${row.date}-${col.name}`}
                      className={`h-7 rounded border flex items-center px-2 text-xs font-mono ${statusColors[col.status]}`}
                    >
                      {statusLabel[col.status] && (
                        <span className="mr-0.5 opacity-60">
                          {statusLabel[col.status]}
                        </span>
                      )}
                      {col.name}
                    </div>
                  ))}
                </div>

                {/* Quality score */}
                <div className="sm:w-24 shrink-0">
                  <QualityBar score={row.qualityScore} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/40 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              4 versions tracked &middot; 3 drift events &middot; 1 recipe
              auto-applied
            </p>
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-xs rounded-lg"
            >
              <Link href="/dashboard">
                Try it yourself
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
