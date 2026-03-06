'use client';

import { useState } from 'react';
import { Scan, Source } from '@/lib/types';
import { cn, qualityLabel, severityColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SchemaTable } from '@/components/dashboard/schema-table';
import { QualityScoreCard } from '@/components/dashboard/quality-score-card';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  ArrowRight,
  RefreshCw,
  Type,
  BarChart3,
  Download,
  Sparkles,
} from 'lucide-react';

interface ScanReportProps {
  scan: Scan;
  source?: Source | null;
  onNameSource?: (name: string) => void;
  className?: string;
}

export function ScanReport({ scan, source, onNameSource, className }: ScanReportProps) {
  const [sourceName, setSourceName] = useState('');
  const drift = scan.driftReport;
  const hasChanges = drift?.hasChanges ?? false;

  const totalChanges =
    (drift?.addedColumns.length ?? 0) +
    (drift?.removedColumns.length ?? 0) +
    (drift?.renamedColumns.length ?? 0) +
    (drift?.typeChanges.length ?? 0) +
    (drift?.distributionShifts.length ?? 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Verdict Card */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  scan.isNewSource
                    ? 'bg-emerald-500/10'
                    : hasChanges
                      ? 'bg-amber-500/10'
                      : 'bg-emerald-500/10'
                )}
              >
                {scan.isNewSource ? (
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                ) : hasChanges ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                )}
              </div>
              <div>
                {scan.isNewSource ? (
                  <>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      New source detected
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Give it a name to start tracking schema changes
                    </p>
                  </>
                ) : source ? (
                  <>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      Matched to{' '}
                      <span className="text-emerald-400">{source.name}</span>
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {hasChanges
                        ? `${totalChanges} schema change${totalChanges !== 1 ? 's' : ''} detected`
                        : 'No schema changes detected'}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      Scan complete
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {hasChanges ? `${totalChanges} changes detected` : 'No changes'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <QualityScoreCard score={scan.qualityScore} size="md" />
          </div>

          {/* Name input for new source */}
          {scan.isNewSource && onNameSource && (
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Source name (e.g., Stripe Payouts)"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
              <Button
                onClick={() => {
                  if (sourceName.trim()) onNameSource(sourceName.trim());
                }}
                disabled={!sourceName.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drift Changes */}
      {hasChanges && drift && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-zinc-200">Schema Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Added columns */}
            {drift.addedColumns.map((col) => (
              <div
                key={`add-${col}`}
                className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5"
              >
                <Plus className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-zinc-200">
                  Column <span className="font-mono font-semibold">{col}</span> added
                </span>
                <Badge className="ml-auto bg-emerald-500/10 text-[10px] text-emerald-400">
                  Added
                </Badge>
              </div>
            ))}

            {/* Removed columns */}
            {drift.removedColumns.map((col) => (
              <div
                key={`rm-${col}`}
                className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5"
              >
                <Minus className="h-4 w-4 text-red-500" />
                <span className="text-sm text-zinc-200">
                  Column <span className="font-mono font-semibold">{col}</span> removed
                </span>
                <Badge className="ml-auto bg-red-500/10 text-[10px] text-red-400">
                  Removed
                </Badge>
              </div>
            ))}

            {/* Renamed columns */}
            {drift.renamedColumns.map((rc) => (
              <div
                key={`ren-${rc.oldName}`}
                className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5"
              >
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-zinc-200">
                  <span className="font-mono font-semibold">{rc.oldName}</span>
                  <ArrowRight className="mx-1.5 inline h-3 w-3 text-zinc-500" />
                  <span className="font-mono font-semibold">{rc.newName}</span>
                </span>
                <Badge className="ml-auto bg-blue-500/10 text-[10px] text-blue-400">
                  Renamed
                </Badge>
              </div>
            ))}

            {/* Type changes */}
            {drift.typeChanges.map((tc) => (
              <div
                key={`tc-${tc.column}`}
                className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
              >
                <Type className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-zinc-200">
                  <span className="font-mono font-semibold">{tc.column}</span> type:{' '}
                  <span className="text-zinc-500">{tc.oldType}</span>
                  <ArrowRight className="mx-1.5 inline h-3 w-3 text-zinc-500" />
                  <span className="text-zinc-200">{tc.newType}</span>
                </span>
                <Badge className="ml-auto bg-amber-500/10 text-[10px] text-amber-400">
                  Type Change
                </Badge>
              </div>
            ))}

            {/* Distribution shifts */}
            {drift.distributionShifts.map((ds, i) => (
              <div
                key={`ds-${i}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                  ds.severity === 'high'
                    ? 'border-red-500/20 bg-red-500/5'
                    : ds.severity === 'medium'
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-blue-500/20 bg-blue-500/5'
                )}
              >
                <BarChart3
                  className={cn(
                    'h-4 w-4',
                    ds.severity === 'high'
                      ? 'text-red-500'
                      : ds.severity === 'medium'
                        ? 'text-amber-500'
                        : 'text-blue-500'
                  )}
                />
                <span className="text-sm text-zinc-200">
                  <span className="font-mono font-semibold">{ds.column}</span>{' '}
                  {ds.metric}: {ds.oldValue.toFixed(2)} to {ds.newValue.toFixed(2)}
                </span>
                <Badge className={cn('ml-auto text-[10px]', severityColor(ds.severity))}>
                  {ds.severity}
                </Badge>
              </div>
            ))}

            {drift.summary && (
              <p className="mt-2 text-xs text-zinc-500">{drift.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-zinc-200">
              Schema ({scan.schemaSnapshot.length} columns)
            </CardTitle>
            <Badge variant="outline" className="border-zinc-700 text-xs text-zinc-400">
              {scan.rowCount.toLocaleString()} rows
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <SchemaTable columns={scan.schemaSnapshot} />
        </CardContent>
      </Card>

      {/* Download button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          onClick={() => {
            // Download cleaned file
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860'}/api/v1/scans/${scan.id}/download`;
            window.open(url, '_blank');
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Cleaned File
        </Button>
      </div>
    </div>
  );
}
