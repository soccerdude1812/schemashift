'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Source } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceCard } from '@/components/dashboard/source-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Search, Database, Upload } from 'lucide-react';

export default function SourcesPage() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadSources() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSources(1, 100);
        setSources(res.data || []);
      } catch (err: any) {
        setError(err.error || 'Failed to load sources');
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [sources, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sources</h1>
        <p className="mt-1 text-sm text-zinc-400">
          All your tracked data sources and their quality metrics
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No sources yet"
          description="Upload your first file to create a source. SchemaShift will remember its schema and track changes over time."
          actionLabel="Upload a file"
          onAction={() => router.push('/dashboard/scan')}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search sources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-zinc-800 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching sources"
              description={`No sources found matching "${search}". Try a different search term.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-600">
            {filtered.length} of {sources.length} source
            {sources.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
