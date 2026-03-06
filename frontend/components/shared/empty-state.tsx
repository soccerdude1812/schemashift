'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900">
        <Icon className="h-7 w-7 text-zinc-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-zinc-400">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
