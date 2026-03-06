'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ScanProgressProps {
  className?: string;
  onTimeout?: () => void;
}

const STAGES = [
  { label: 'Detecting format...', minDuration: 2000 },
  { label: 'Analyzing schema...', minDuration: 3000 },
  { label: 'Classifying column types...', minDuration: 4000 },
  { label: 'Checking for drift...', minDuration: 3000 },
  { label: 'Scoring quality...', minDuration: 3000 },
  { label: 'Generating report...', minDuration: 5000 },
];

const TIMEOUT_MS = 60000;

export function ScanProgress({ className, onTimeout }: ScanProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const startTime = useRef(Date.now());

  // Cycle through stages
  useEffect(() => {
    if (timedOut) return;

    const stage = STAGES[stageIndex];
    if (!stage) return;

    const timer = setTimeout(() => {
      if (stageIndex < STAGES.length - 1) {
        setStageIndex((prev) => prev + 1);
      }
    }, stage.minDuration);

    return () => clearTimeout(timer);
  }, [stageIndex, timedOut]);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const ms = now - startTime.current;
      setElapsed(ms);

      if (ms >= TIMEOUT_MS) {
        setTimedOut(true);
        onTimeout?.();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onTimeout]);

  const elapsedSeconds = Math.floor(elapsed / 1000);
  const currentStage = STAGES[stageIndex];

  if (timedOut) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 py-12',
          className
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <svg
            className="h-8 w-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-amber-400">
            Analysis is taking longer than expected
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Please try again with a smaller file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 py-12',
        className
      )}
    >
      {/* Animated spinner ring */}
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500" />
        <div
          className="absolute inset-0 animate-ping rounded-full border border-emerald-500/20"
          style={{ animationDuration: '2s' }}
        />
      </div>

      {/* Stage label */}
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">
          {currentStage?.label || 'Processing...'}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          {elapsedSeconds}s elapsed -- This typically takes 10-20 seconds
        </p>
      </div>

      {/* Stage dots */}
      <div className="flex gap-1.5">
        {STAGES.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-all duration-500',
              i <= stageIndex ? 'bg-emerald-500' : 'bg-zinc-700',
              i === stageIndex && 'scale-125'
            )}
          />
        ))}
      </div>
    </div>
  );
}
