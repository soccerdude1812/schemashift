'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = ['.csv', '.tsv', '.json', '.jsonl'];
// MIME validation is handled by the browser's file input accept attribute
// const ACCEPTED_MIMES = ['text/csv', 'text/tab-separated-values', 'application/json', 'application/x-ndjson', 'text/plain'];

export function FileDropzone({
  onFileSelect,
  maxSizeMb = 10,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        return `Unsupported format: ${ext}. Accepted: CSV, TSV, JSON, JSONL`;
      }
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        return `File too large: ${formatBytes(file.size)}. Maximum: ${maxSizeMb}MB`;
      }
      if (file.size === 0) {
        return 'File is empty';
      }
      return null;
    },
    [maxSizeMb]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !selectedFile && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all',
          disabled
            ? 'cursor-not-allowed border-zinc-800 bg-zinc-950/30 opacity-50'
            : selectedFile
              ? 'cursor-default border-emerald-500/30 bg-emerald-500/5'
              : isDragOver
                ? 'cursor-pointer border-emerald-500 bg-emerald-500/10'
                : 'cursor-pointer border-zinc-700 bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <FileText className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {selectedFile.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              <X className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                isDragOver ? 'bg-emerald-500/20' : 'bg-zinc-800'
              )}
            >
              <Upload
                className={cn(
                  'h-7 w-7 transition-colors',
                  isDragOver ? 'text-emerald-500' : 'text-zinc-500'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Drag & drop your file here, or{' '}
                <span className="text-emerald-500">click to browse</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Supports CSV, TSV, JSON, JSONL -- max {maxSizeMb}MB free
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
