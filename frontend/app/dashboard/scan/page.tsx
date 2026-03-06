'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/types';
import { FileDropzone } from '@/components/scan/file-dropzone';
import { ScanProgress } from '@/components/scan/scan-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, FileCode, Table2, Braces, FileSpreadsheet } from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setState('scanning');
      setError(null);

      try {
        const result = await api.scan(file);
        // Navigate to scan result page
        router.push(`/dashboard/scan/${result.id}`);
      } catch (err: unknown) {
        setState('error');
        const apiErr = err as ApiError;
        setError(
          apiErr.error ||
            'Failed to analyze file. Please check the format and try again.'
        );
      }
    },
    [router]
  );

  const handleTimeout = useCallback(() => {
    setState('error');
    setError(
      'Analysis is taking longer than expected. Please try again with a smaller file.'
    );
  }, []);

  const handleRetry = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Scan File</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload a data file to analyze its schema, detect drift, and score quality
        </p>
      </div>

      {/* Main Content */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-6">
          {state === 'idle' && (
            <FileDropzone onFileSelect={handleFileSelect} />
          )}

          {state === 'scanning' && (
            <ScanProgress onTimeout={handleTimeout} />
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format guidance */}
      {state === 'idle' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormatCard
            icon={<FileSpreadsheet className="h-5 w-5 text-emerald-400" />}
            label="CSV"
            description="Comma-separated values"
          />
          <FormatCard
            icon={<Table2 className="h-5 w-5 text-blue-400" />}
            label="TSV"
            description="Tab-separated values"
          />
          <FormatCard
            icon={<Braces className="h-5 w-5 text-amber-400" />}
            label="JSON"
            description="Array of objects"
          />
          <FormatCard
            icon={<FileCode className="h-5 w-5 text-purple-400" />}
            label="JSONL"
            description="Newline-delimited JSON"
          />
        </div>
      )}
    </div>
  );
}

function FormatCard({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          <p className="text-[10px] text-zinc-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
