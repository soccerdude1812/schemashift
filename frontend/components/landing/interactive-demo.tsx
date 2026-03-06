'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Search, TrendingUp, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const schemaRows = [
  { name: 'payout_id', type: 'integer', badge: 'bg-blue-500/15 border-blue-500/25 text-blue-400' },
  { name: 'email', type: 'email', badge: 'bg-violet-500/15 border-violet-500/25 text-violet-400' },
  { name: 'amount', type: 'currency', badge: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' },
  { name: 'created_at', type: 'date', badge: 'bg-amber-500/15 border-amber-500/25 text-amber-400' },
  { name: 'status', type: 'categorical', badge: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' },
];

const marchColumns = [
  { name: 'payout_id', type: 'integer', status: 'stable' as const },
  { name: 'email', type: 'email', status: 'stable' as const },
  { name: 'amount', type: 'currency', status: 'stable' as const },
  { name: 'created_at', type: 'date', status: 'stable' as const },
  { name: 'status', type: 'categorical', status: 'stable' as const },
];

const aprilColumns = [
  { name: 'payout_id', type: 'integer', status: 'stable' as const },
  { name: 'contact_email', type: 'email', status: 'renamed' as const },
  { name: 'amount', type: 'currency', status: 'stable' as const },
  { name: 'created_at', type: 'date', status: 'stable' as const },
  { name: 'region', type: 'string', status: 'added' as const },
];

const statusColors = {
  stable: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
  added: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400',
  removed: 'bg-red-500/15 border-red-500/25 text-red-400',
  renamed: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
};

/* ------------------------------------------------------------------ */
/*  Step nav                                                           */
/* ------------------------------------------------------------------ */

const stepsMeta = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'analyze', label: 'Analyze', icon: Search },
  { key: 'track', label: 'Track', icon: TrendingUp },
] as const;

type StepKey = (typeof stepsMeta)[number]['key'];

/* ------------------------------------------------------------------ */
/*  Quality ring                                                       */
/* ------------------------------------------------------------------ */

function QualityRing({ score, animate }: { score: number; animate: boolean }) {
  const circumference = 2 * Math.PI * 38;
  const offset = animate ? circumference - (circumference * score) / 100 : circumference;

  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-800" />
        <circle
          cx="40"
          cy="40"
          r="38"
          fill="none"
          stroke="url(#qualGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }}
        />
        <defs>
          <linearGradient id="qualGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-xl font-bold text-zinc-100 tabular-nums transition-opacity duration-500"
          style={{ opacity: animate ? 1 : 0 }}
        >
          {animate ? `${score}%` : '0%'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step panels                                                        */
/* ------------------------------------------------------------------ */

function UploadPanel({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'dropping' | 'landed'>('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }
    const t1 = setTimeout(() => setPhase('dropping'), 300);
    const t2 = setTimeout(() => setPhase('landed'), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* dropzone */}
      <div
        className={`
          relative w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4
          transition-all duration-500
          ${phase === 'dropping' ? 'border-emerald-500/60 bg-emerald-500/5 scale-[1.02]' : 'border-zinc-700/60 bg-zinc-900/30'}
          ${phase === 'landed' ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : ''}
        `}
      >
        {/* pulsing ring on drop */}
        {phase === 'dropping' && (
          <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/30 demo-dropzone-ping" />
        )}

        <Upload
          className={`h-8 w-8 transition-all duration-500 ${
            phase !== 'idle' ? 'text-emerald-400 scale-110' : 'text-zinc-600'
          }`}
        />
        <span className="text-sm text-zinc-500">Drop your CSV here</span>

        {/* file card */}
        <div
          className={`
            absolute bottom-6 left-1/2 -translate-x-1/2
            flex items-center gap-3 px-4 py-3 rounded-xl
            border bg-zinc-900/90 backdrop-blur-sm shadow-xl shadow-black/30
            transition-all duration-700 ease-out
            ${phase === 'idle' ? 'opacity-0 translate-y-8 scale-95 border-zinc-800/0' : ''}
            ${phase === 'dropping' ? 'opacity-100 translate-y-0 scale-100 border-emerald-500/30' : ''}
            ${phase === 'landed' ? 'opacity-100 translate-y-0 scale-100 border-emerald-500/30' : ''}
          `}
        >
          <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">stripe_payouts_march.csv</span>
            <span className="text-xs text-zinc-500">2.4 MB &middot; 12,847 rows</span>
          </div>
          <div
            className={`
              ml-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center
              transition-all duration-500
              ${phase === 'landed' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
            `}
          >
            <Check className="h-3 w-3 text-zinc-950" strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzePanel({ active }: { active: boolean }) {
  const [visibleRows, setVisibleRows] = useState(0);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisibleRows(0);
      setShowScore(false);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    schemaRows.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleRows(i + 1), 400 + i * 350));
    });
    timers.push(setTimeout(() => setShowScore(true), 400 + schemaRows.length * 350 + 200));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 h-full">
      {/* schema table */}
      <div className="w-full max-w-md rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
        {/* table header */}
        <div className="grid grid-cols-[1fr_100px] gap-2 px-4 py-2.5 border-b border-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span>Column</span>
          <span className="text-right">Type</span>
        </div>
        {/* rows */}
        <div className="divide-y divide-zinc-800/30">
          {schemaRows.map((row, i) => (
            <div
              key={row.name}
              className="grid grid-cols-[1fr_100px] gap-2 items-center px-4 py-3 transition-all duration-500"
              style={{
                opacity: i < visibleRows ? 1 : 0,
                transform: i < visibleRows ? 'translateX(0)' : 'translateX(-16px)',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <span className="text-sm font-mono text-zinc-200">{row.name}</span>
              <div className="flex justify-end">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${row.badge}`}
                  style={{
                    opacity: i < visibleRows ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                    transitionDelay: `${i * 60 + 200}ms`,
                  }}
                >
                  {row.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* quality ring */}
      <div className="flex flex-col items-center gap-2">
        <QualityRing score={94} animate={showScore} />
        <span className="text-xs text-zinc-500 font-medium">Quality Score</span>
      </div>
    </div>
  );
}

function TrackPanel({ active }: { active: boolean }) {
  const [showApril, setShowApril] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowApril(false);
      setShowAlert(false);
      return;
    }
    const t1 = setTimeout(() => setShowApril(true), 600);
    const t2 = setTimeout(() => setShowAlert(true), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const renderVersion = (
    label: string,
    date: string,
    columns: readonly { name: string; type: string; status: 'stable' | 'renamed' | 'added' | 'removed' }[],
    show: boolean,
    removedName?: string
  ) => (
    <div
      className={`flex-1 min-w-0 rounded-xl border bg-zinc-900/50 overflow-hidden transition-all duration-700 ${
        show ? 'opacity-100 translate-y-0 border-zinc-800/80' : 'opacity-0 translate-y-4 border-zinc-800/0'
      }`}
    >
      <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <span className="text-xs font-mono text-zinc-500">{date}</span>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {columns.map((col) => (
          <div
            key={col.name}
            className={`h-7 rounded border flex items-center px-2 text-xs font-mono transition-all duration-500 ${statusColors[col.status]}`}
          >
            {col.name}
          </div>
        ))}
        {removedName && (
          <div className="h-7 rounded border flex items-center px-2 text-xs font-mono bg-red-500/15 border-red-500/25 text-red-400 line-through">
            {removedName}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="w-full flex flex-col sm:flex-row gap-4">
        {renderVersion('March Upload', 'Mar 05', marchColumns, true)}
        {renderVersion('April Upload', 'Apr 02', aprilColumns, showApril, 'status')}
      </div>

      {/* drift alert */}
      <div
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl
          border border-amber-500/25 bg-amber-500/[0.06]
          transition-all duration-700 ease-out
          ${showAlert ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
        `}
      >
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-sm font-medium text-amber-300">3 changes detected</span>
        <div className="flex gap-1.5 ml-2">
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">1 renamed</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">1 removed</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">1 added</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function InteractiveDemo() {
  const [activeStep, setActiveStep] = useState<StepKey>('upload');
  const sectionRef = useRef<HTMLElement>(null);
  const hasAutoPlayed = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* auto-advance through steps */
  const startAutoPlay = useCallback(() => {
    if (hasAutoPlayed.current) return;
    hasAutoPlayed.current = true;
    setActiveStep('upload');
    autoTimer.current = setTimeout(() => {
      setActiveStep('analyze');
      autoTimer.current = setTimeout(() => {
        setActiveStep('track');
      }, 4500);
    }, 3500);
  }, []);

  /* intersection observer — trigger on scroll into view */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAutoPlay();
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startAutoPlay]);

  /* manual step click resets auto-play */
  const handleStepClick = (key: StepKey) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = null;
    setActiveStep(key);
  };

  return (
    <section id="demo" ref={sectionRef} className="py-24 md:py-32 relative">
      {/* background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.015] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        {/* section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            See it{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              in action
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            From raw CSV to full schema observability — watch the three-step flow come alive.
          </p>
        </div>

        {/* demo card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-2xl shadow-emerald-500/[0.03]">
          {/* window chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800/50 bg-zinc-900/60">
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

          {/* step tabs */}
          <div className="flex border-b border-zinc-800/50">
            {stepsMeta.map((s, i) => {
              const isActive = activeStep === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => handleStepClick(s.key)}
                  className={`
                    relative flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium
                    transition-colors duration-300 cursor-pointer
                    ${isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  <span
                    className={`
                      w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center
                      transition-all duration-300
                      ${isActive ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}
                    `}
                  >
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 hidden sm:block" />
                  <span>{s.label}</span>

                  {/* active indicator bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 demo-tab-underline" />
                  )}
                </button>
              );
            })}
          </div>

          {/* step content */}
          <div className="relative min-h-[340px] sm:min-h-[320px] p-6 sm:p-8">
            {/* We render all panels but only show the active one, to preserve animation state on switch */}
            <div className={`absolute inset-0 p-6 sm:p-8 transition-opacity duration-500 ${activeStep === 'upload' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <UploadPanel active={activeStep === 'upload'} />
            </div>
            <div className={`absolute inset-0 p-6 sm:p-8 transition-opacity duration-500 ${activeStep === 'analyze' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <AnalyzePanel active={activeStep === 'analyze'} />
            </div>
            <div className={`absolute inset-0 p-6 sm:p-8 transition-opacity duration-500 ${activeStep === 'track' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <TrackPanel active={activeStep === 'track'} />
            </div>
          </div>
        </div>

        {/* glow behind card */}
        <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-emerald-500/[0.04] to-transparent blur-2xl pointer-events-none" />
      </div>
    </section>
  );
}
