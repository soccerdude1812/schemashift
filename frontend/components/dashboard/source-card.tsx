'use client';

import Link from 'next/link';
import { Source } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Clock, ScanLine, AlertTriangle } from 'lucide-react';

interface SourceCardProps {
  source: Source;
  className?: string;
}

export function SourceCard({ source, className }: SourceCardProps) {
  const scoreColor =
    source.qualityScore >= 90
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      : source.qualityScore >= 70
        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        : source.qualityScore >= 50
          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          : 'bg-red-500/10 text-red-500 border-red-500/20';

  return (
    <Link href={`/dashboard/sources/${source.id}`}>
      <Card
        className={cn(
          'group cursor-pointer border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:bg-zinc-900/80',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 group-hover:bg-zinc-700/80">
                <Database className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-zinc-100">
                  {source.name}
                </h3>
                {source.description && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {source.description}
                  </p>
                )}
              </div>
            </div>
            <Badge className={cn('shrink-0 text-[10px]', scoreColor)} variant="outline">
              {Math.round(source.qualityScore)}
            </Badge>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <ScanLine className="h-3 w-3" />
              {source.scanCount} scan{source.scanCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(source.lastSeenAt)}
            </span>
          </div>

          {source.driftScore > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              Drift detected
            </div>
          )}

          {source.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {source.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="border-zinc-700 bg-zinc-800 text-[10px] text-zinc-400"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {source.isDemo && (
            <Badge
              variant="outline"
              className="mt-2 border-zinc-700 text-[10px] text-zinc-500"
            >
              Demo
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
