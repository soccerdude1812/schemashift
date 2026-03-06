'use client';

import Link from 'next/link';
import { Scan } from '@/lib/types';
import { cn, formatDate, formatBytes, qualityLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecentScansProps {
  scans: Scan[];
  className?: string;
}

export function RecentScans({ scans, className }: RecentScansProps) {
  if (scans.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {scans.map((scan) => {
        const { color } = qualityLabel(scan.qualityScore);
        const hasDrift = scan.driftReport?.hasChanges;

        return (
          <Link
            key={scan.id}
            href={`/dashboard/scan/${scan.id}`}
            className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 group-hover:bg-zinc-700/80">
              <FileText className="h-4 w-4 text-zinc-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-zinc-200">
                  {scan.filename}
                </p>
                {scan.isNewSource && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-500"
                  >
                    New
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                <span>{formatDate(scan.createdAt)}</span>
                <span>{formatBytes(scan.fileSizeBytes)}</span>
                <span>{scan.rowCount.toLocaleString()} rows</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasDrift ? (
                <div className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">Drift</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Clean</span>
                </div>
              )}
              <span className={cn('text-sm font-semibold', color)}>
                {Math.round(scan.qualityScore)}
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
