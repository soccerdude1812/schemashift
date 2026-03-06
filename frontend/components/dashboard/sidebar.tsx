'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Upload,
  Settings,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/sources', label: 'Sources', icon: Database },
  { href: '/dashboard/scan', label: 'Scan', icon: Upload },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
          <Layers className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-zinc-100">SchemaShift</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-emerald-600/10 text-emerald-500'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs font-medium text-zinc-400">Free Plan</p>
          <p className="mt-0.5 text-xs text-zinc-500">5 sources, 10 scans/hr</p>
        </div>
      </div>
    </div>
  );
}
