import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function qualityLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-500' };
  if (score >= 70) return { label: 'Good', color: 'text-blue-500' };
  if (score >= 50) return { label: 'Needs Attention', color: 'text-amber-500' };
  return { label: 'Poor', color: 'text-red-500' };
}

export function severityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high': return 'text-red-500 bg-red-500/10';
    case 'medium': return 'text-amber-500 bg-amber-500/10';
    case 'low': return 'text-blue-500 bg-blue-500/10';
  }
}
