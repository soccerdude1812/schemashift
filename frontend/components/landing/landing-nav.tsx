'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function LandingNav() {
  const { user, loading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-base font-semibold text-zinc-100">
            SchemaShift
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Pricing
          </a>
          {!loading && (
            user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
