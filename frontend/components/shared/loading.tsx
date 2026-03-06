'use client';

import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Loading({ className, size = 'md', label }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-zinc-700 border-t-emerald-500',
          sizeClasses[size]
        )}
      />
      {label && (
        <p className="text-sm text-zinc-400">{label}</p>
      )}
    </div>
  );
}
