'use client';

import { ColumnSchema } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SchemaTableProps {
  columns: ColumnSchema[];
  className?: string;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  integer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  float: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  date: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  datetime: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  boolean: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  email: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  url: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  phone: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  zip_code: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  uuid: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  categorical: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  free_text: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  currency: 'bg-green-500/10 text-green-400 border-green-500/20',
  percentage: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

function formatType(type: string): string {
  return type.replace(/_/g, ' ');
}

export function SchemaTable({ columns, className, compact = false }: SchemaTableProps) {
  return (
    <div className={cn('rounded-lg border border-zinc-800 bg-zinc-950/50', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-400">Name</TableHead>
            <TableHead className="text-zinc-400">Type</TableHead>
            <TableHead className="text-zinc-400">Confidence</TableHead>
            <TableHead className="text-zinc-400">Null Rate</TableHead>
            {!compact && (
              <>
                <TableHead className="text-zinc-400 hidden md:table-cell">
                  Cardinality
                </TableHead>
                <TableHead className="text-zinc-400 hidden lg:table-cell">
                  Sample Values
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => (
            <TableRow key={col.name} className="border-zinc-800/50 hover:bg-zinc-900/50">
              <TableCell className="font-mono text-sm text-zinc-200">
                {col.name}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-medium capitalize',
                    typeColors[col.inferredType] || 'bg-zinc-500/10 text-zinc-400'
                  )}
                >
                  {formatType(col.inferredType)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        col.confidence >= 0.9
                          ? 'bg-emerald-500'
                          : col.confidence >= 0.7
                            ? 'bg-blue-500'
                            : col.confidence >= 0.5
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                      )}
                      style={{ width: `${col.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {Math.round(col.confidence * 100)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'text-sm',
                    col.nullRate > 0.1
                      ? 'font-medium text-amber-500'
                      : 'text-zinc-400'
                  )}
                >
                  {(col.nullRate * 100).toFixed(1)}%
                </span>
              </TableCell>
              {!compact && (
                <>
                  <TableCell className="hidden text-sm text-zinc-400 md:table-cell">
                    {col.cardinality.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {col.sampleValues.slice(0, 3).map((val, i) => (
                        <span
                          key={i}
                          className="inline-block max-w-[120px] truncate rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
