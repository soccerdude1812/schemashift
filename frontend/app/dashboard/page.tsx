'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Source } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SourceCard } from '@/components/dashboard/source-card';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Database,
  ScanLine,
  BarChart3,
  AlertTriangle,
  Upload,
  ArrowRight,
} from 'lucide-react';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
}

function StatsCard({ icon, label, value, sublabel, color }: StatsCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-xl font-bold text-zinc-100">{value}</p>
            {sublabel && (
              <p className="text-[10px] text-zinc-500">{sublabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  // Recent scans are fetched but currently only used internally for dashboard stats
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const sourcesRes = await api.getSources(1, 20);
        setSources(sourcesRes.data || []);

        // Get recent scans from sources that have scans
        const scanPromises = (sourcesRes.data || [])
          .filter((s) => s.scanCount > 0)
          .slice(0, 3)
          .map(async (s) => {
            try {
              const history = await api.getDriftTimeline(s.id, 1, 2);
              return history.data || [];
            } catch {
              return [];
            }
          });

        // We don't have a global scans endpoint, so we just show sources
        // The recent scans would come from scan history
        await Promise.allSettled(scanPromises);
      } catch (err: unknown) {
        const e = err as { error?: string };
        setError(e.error || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalSources = sources.length;
  const totalScans = sources.reduce((sum, s) => sum + s.scanCount, 0);
  const avgQuality =
    sources.length > 0
      ? Math.round(
          (sources.reduce((sum, s) => sum + s.qualityScore, 0) / sources.length) * 100
        )
      : 0;
  const driftAlerts = sources.filter((s) => s.driftScore > 0).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <StatsSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Welcome to SchemaShift. Get started by uploading a file.
          </p>
        </div>
        <EmptyState
          icon={Upload}
          title="No sources yet"
          description="Upload your first CSV, TSV, JSON, or JSONL file to start tracking schema changes and data quality."
          actionLabel="Upload a file"
          onAction={() => router.push('/dashboard/scan')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Overview of your data sources and quality metrics
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/scan')}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Upload className="mr-2 h-4 w-4" />
          Scan File
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          icon={<Database className="h-5 w-5 text-emerald-400" />}
          label="Total Sources"
          value={totalSources}
          color="bg-emerald-500/10"
        />
        <StatsCard
          icon={<ScanLine className="h-5 w-5 text-blue-400" />}
          label="Total Scans"
          value={totalScans}
          color="bg-blue-500/10"
        />
        <StatsCard
          icon={<BarChart3 className="h-5 w-5 text-cyan-400" />}
          label="Avg Quality"
          value={`${avgQuality}%`}
          sublabel={avgQuality >= 70 ? 'Good' : 'Needs Attention'}
          color="bg-cyan-500/10"
        />
        <StatsCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          label="Drift Alerts"
          value={driftAlerts}
          color="bg-amber-500/10"
        />
      </div>

      {/* Sources Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200">Recent Sources</h2>
          {sources.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/sources')}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.slice(0, 6).map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
}
