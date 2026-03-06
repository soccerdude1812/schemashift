"use client";

import { useState } from "react";

const SHEET_COLUMNS = [
  { name: "order_id", type: "integer", sample: "10421" },
  { name: "customer_email", type: "email", sample: "jane@acme.co" },
  { name: "total", type: "currency", sample: "$142.50" },
  { name: "created_at", type: "date", sample: "2024-03-05" },
  { name: "status", type: "string", sample: "shipped" },
  { name: "region", type: "string", sample: "US-West" },
];

const SHEET_ROWS = [
  ["10421", "jane@acme.co", "$142.50", "2024-03-05", "shipped", "US-West"],
  ["10422", "bob@corp.io", "$89.00", "2024-03-05", "pending", "EU-Central"],
  ["10423", "alice@startup.dev", "$210.75", "2024-03-06", "shipped", "US-East"],
  ["10424", "dev@example.com", "$55.20", "2024-03-06", "cancelled", "APAC"],
  ["10425", "maria@test.org", "$178.30", "2024-03-07", "shipped", "US-West"],
];

type TypeKey = "integer" | "email" | "currency" | "date" | "string";

const TYPE_COLORS: Record<TypeKey, string> = {
  integer: "bg-purple-500/15 text-purple-400",
  email: "bg-emerald-500/15 text-emerald-400",
  currency: "bg-emerald-500/15 text-emerald-400",
  date: "bg-amber-500/15 text-amber-400",
  string: "bg-blue-500/15 text-blue-400",
};

export function IntegrationShowcase() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <section className="py-24 px-6" id="integration">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium">
            Seamless Integration
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-100 tracking-tight">
            Analyze schemas without{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              leaving your spreadsheet
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            No file uploads. No switching tabs. SchemaShift runs as a sidebar
            right inside Google Sheets — reading your data natively and showing
            results in real time.
          </p>
        </div>

        {/* Google Sheets mockup with sidebar */}
        <div className="relative mx-auto max-w-5xl">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-emerald-500/5">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-zinc-700/50 text-xs text-zinc-400 font-mono flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6M9 7h6l2 2v6l-2 2H9l-2-2V9l2-2z"/>
                  </svg>
                  docs.google.com/spreadsheets/d/orders_q1_2024
                </div>
              </div>
            </div>

            {/* Sheets toolbar mockup */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a2e] border-b border-zinc-700/30 text-[11px] text-zinc-400">
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">File</span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">Edit</span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">View</span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">Insert</span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">Format</span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">Data</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded cursor-pointer border border-emerald-500/20 font-medium" onClick={() => setSidebarOpen(!sidebarOpen)}>
                SchemaShift
              </span>
              <span className="px-2 py-0.5 hover:bg-zinc-700/30 rounded cursor-default">Help</span>
            </div>

            <div className="flex">
              {/* Spreadsheet area */}
              <div className="flex-1 overflow-hidden">
                {/* Column headers */}
                <div className="flex border-b border-zinc-700/30">
                  <div className="w-10 shrink-0 bg-[#1a1a2e] border-r border-zinc-700/30 text-center text-[10px] text-zinc-500 py-1" />
                  {["A", "B", "C", "D", "E", "F"].map((col) => (
                    <div
                      key={col}
                      className="flex-1 min-w-[100px] bg-[#1a1a2e] border-r border-zinc-700/30 text-center text-[10px] text-zinc-500 py-1"
                    >
                      {col}
                    </div>
                  ))}
                </div>
                {/* Header row */}
                <div className="flex border-b border-zinc-700/30">
                  <div className="w-10 shrink-0 bg-[#1a1a2e] border-r border-zinc-700/30 text-center text-[10px] text-zinc-500 py-1.5">
                    1
                  </div>
                  {SHEET_COLUMNS.map((col) => (
                    <div
                      key={col.name}
                      className="flex-1 min-w-[100px] border-r border-zinc-700/30 px-2 py-1.5 text-[11px] font-semibold text-zinc-200 bg-[#1e1e32]"
                    >
                      {col.name}
                    </div>
                  ))}
                </div>
                {/* Data rows */}
                {SHEET_ROWS.map((row, ri) => (
                  <div key={ri} className="flex border-b border-zinc-800/30">
                    <div className="w-10 shrink-0 bg-[#1a1a2e] border-r border-zinc-700/30 text-center text-[10px] text-zinc-500 py-1.5">
                      {ri + 2}
                    </div>
                    {row.map((cell, ci) => (
                      <div
                        key={ci}
                        className="flex-1 min-w-[100px] border-r border-zinc-800/20 px-2 py-1.5 text-[11px] text-zinc-300 bg-[#0f0f1a]"
                      >
                        {cell}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Empty rows */}
                {[7, 8, 9].map((r) => (
                  <div key={r} className="flex border-b border-zinc-800/20">
                    <div className="w-10 shrink-0 bg-[#1a1a2e] border-r border-zinc-700/30 text-center text-[10px] text-zinc-600 py-1.5">
                      {r}
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <div key={c} className="flex-1 min-w-[100px] border-r border-zinc-800/10 py-1.5 bg-[#0a0a14]" />
                    ))}
                  </div>
                ))}
              </div>

              {/* SchemaShift Sidebar */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden border-l border-zinc-700/50 ${
                  sidebarOpen ? "w-[280px]" : "w-0"
                }`}
              >
                <div className="w-[280px] bg-[#09090b] h-full">
                  {/* Sidebar header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
                    <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
                        <path d="M3 12A9 3 0 0 0 21 12"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-zinc-100">SchemaShift</span>
                  </div>

                  {/* Source info */}
                  <div className="px-3 py-2 border-b border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Source</div>
                    <div className="text-[11px] text-zinc-300">
                      <strong className="text-zinc-100">Orders Q1 2024</strong> / Sheet1
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-1 px-3 py-2 border-b border-zinc-800/50">
                    <div className="bg-zinc-900 rounded px-2 py-1.5">
                      <div className="text-sm font-bold text-zinc-100">1,247</div>
                      <div className="text-[10px] text-zinc-500">Rows</div>
                    </div>
                    <div className="bg-zinc-900 rounded px-2 py-1.5">
                      <div className="text-sm font-bold text-zinc-100">6</div>
                      <div className="text-[10px] text-zinc-500">Columns</div>
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="px-3 py-2 border-b border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Quality</div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-9 h-9">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3"
                            strokeDasharray="94.2" strokeDashoffset="5.7" strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-100">94%</span>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-zinc-100">Excellent</div>
                        <div className="text-[10px] text-zinc-500">94% completeness</div>
                      </div>
                    </div>
                  </div>

                  {/* Schema */}
                  <div className="px-3 py-2 border-b border-zinc-800/50">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Schema</div>
                    <div className="space-y-0.5">
                      {SHEET_COLUMNS.map((col) => (
                        <div key={col.name} className="flex items-center justify-between py-0.5">
                          <span className="text-[11px] text-zinc-300 font-medium truncate">{col.name}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[col.type as TypeKey] || TYPE_COLORS.string}`}>
                            {col.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drift */}
                  <div className="px-3 py-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Drift</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      No drift detected
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent blur-2xl" />
        </div>

        {/* Integration badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#34A853">
              <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2"/>
            </svg>
            <span className="text-emerald-400 font-medium">Google Sheets</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">LIVE</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/30 text-sm">
            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.17 3H7.83A1.83 1.83 0 0 0 6 4.83v14.34A1.83 1.83 0 0 0 7.83 21h13.34A1.83 1.83 0 0 0 23 19.17V4.83A1.83 1.83 0 0 0 21.17 3z"/>
            </svg>
            <span className="text-zinc-400 font-medium">Excel Online</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 font-semibold">SOON</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/30 text-sm">
            <span className="text-zinc-400 font-medium">REST API</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 font-semibold">SOON</span>
          </div>
        </div>
      </div>
    </section>
  );
}
