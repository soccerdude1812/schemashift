'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DriftEvent } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DriftTimelineProps {
  events: DriftEvent[];
  className?: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

interface ChartPoint {
  date: string;
  rawDate: Date;
  driftScore: number;
  eventCount: number;
  events: DriftEvent[];
}

function aggregateEvents(events: DriftEvent[]): ChartPoint[] {
  const byDate = new Map<string, DriftEvent[]>();

  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const event of sorted) {
    const dateKey = new Date(event.createdAt).toISOString().split('T')[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(event);
  }

  return Array.from(byDate.entries()).map(([dateKey, dateEvents]) => {
    const severityScores: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const totalScore = dateEvents.reduce(
      (sum, e) => sum + (severityScores[e.severity] || 1),
      0
    );

    return {
      date: formatDate(dateKey),
      rawDate: new Date(dateKey),
      driftScore: totalScore,
      eventCount: dateEvents.length,
      events: dateEvents,
    };
  });
}

function filterByRange(points: ChartPoint[], range: DateRange): ChartPoint[] {
  if (range === 'all') return points;

  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return points.filter((p) => p.rawDate >= cutoff);
}

const eventTypeLabels: Record<string, string> = {
  column_added: 'Column Added',
  column_removed: 'Column Removed',
  column_renamed: 'Column Renamed',
  type_changed: 'Type Changed',
  distribution_shift: 'Distribution Shift',
  anomaly_detected: 'Anomaly Detected',
};

const eventTypeColors: Record<string, string> = {
  column_added: 'bg-emerald-500/10 text-emerald-400',
  column_removed: 'bg-red-500/10 text-red-400',
  column_renamed: 'bg-blue-500/10 text-blue-400',
  type_changed: 'bg-amber-500/10 text-amber-400',
  distribution_shift: 'bg-purple-500/10 text-purple-400',
  anomaly_detected: 'bg-orange-500/10 text-orange-400',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload as ChartPoint;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-zinc-300">{point.date}</p>
      <div className="mb-2 flex items-center gap-3 text-sm">
        <span className="text-zinc-400">Drift Score:</span>
        <span className="font-semibold text-emerald-400">{point.driftScore}</span>
      </div>
      <div className="space-y-1">
        {point.events.slice(0, 5).map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <Badge
              className={cn(
                'text-[10px]',
                eventTypeColors[e.eventType] || 'bg-zinc-500/10 text-zinc-400'
              )}
            >
              {eventTypeLabels[e.eventType] || e.eventType}
            </Badge>
          </div>
        ))}
        {point.events.length > 5 && (
          <p className="text-[10px] text-zinc-500">
            +{point.events.length - 5} more
          </p>
        )}
      </div>
    </div>
  );
}

export function DriftTimeline({ events, className }: DriftTimelineProps) {
  const [range, setRange] = useState<DateRange>('30d');

  const allPoints = useMemo(() => aggregateEvents(events), [events]);
  const points = useMemo(() => filterByRange(allPoints, range), [allPoints, range]);

  if (events.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 py-16',
          className
        )}
      >
        <p className="text-sm text-zinc-500">No drift events yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Upload more files to see how your schema changes over time
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-zinc-800 bg-zinc-900 p-4', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Drift Timeline</h3>
        <div className="flex gap-1">
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange(r)}
              className={cn(
                'h-7 px-2.5 text-xs',
                range === r
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {r === 'all' ? 'All' : r}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <defs>
              <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={{ stroke: '#27272a' }}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={{ stroke: '#27272a' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="driftScore"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#driftGradient)"
              dot={{
                fill: '#10b981',
                stroke: '#18181b',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                fill: '#10b981',
                stroke: '#fff',
                strokeWidth: 2,
                r: 6,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-zinc-800 pt-3">
        <span className="text-xs text-zinc-500">
          {points.length} data point{points.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-zinc-500">
          {events.length} total event{events.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
