'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Scan, Source } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScanReport } from '@/components/scan/scan-report';
import { EmptyState } from '@/components/shared/empty-state';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function ScanResultPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScan() {
      setLoading(true);
      setError(null);
      try {
        const scanData = await api.getScan(scanId);
        setScan(scanData);

        // Try to load the matched source
        if (scanData.sourceId && !scanData.isNewSource) {
          try {
            const sourceData = await api.getSource(scanData.sourceId);
            setSource(sourceData);
          } catch {
            // Source might not exist anymore
          }
        }
      } catch (err: unknown) {
        const e = err as { error?: string };
        setError(e.error || 'Failed to load scan result');
      } finally {
        setLoading(false);
      }
    }

    loadScan();
  }, [scanId]);

  const handleNameSource = useCallback(
    async (name: string) => {
      if (!scan?.sourceId) return;
      try {
        const updated = await api.updateSource(scan.sourceId, { name });
        setSource(updated);
        setScan((prev) => (prev ? { ...prev, isNewSource: false } : prev));
      } catch (err: unknown) {
        const e = err as { error?: string };
        setError(e.error || 'Failed to name source');
      }
    },
    [scan]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error && !scan) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Scan not found"
        description={error || 'The scan result could not be loaded.'}
        actionLabel="Back to Scan"
        onAction={() => router.push('/dashboard/scan')}
      />
    );
  }

  if (!scan) return null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <span className="text-sm text-zinc-500">Scan Result</span>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          {error}
        </div>
      )}

      <ScanReport
        scan={scan}
        source={source}
        onNameSource={handleNameSource}
      />
    </div>
  );
}
