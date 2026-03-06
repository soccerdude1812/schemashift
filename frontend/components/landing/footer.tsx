import Link from "next/link";
import { Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <Database className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-lg font-semibold text-zinc-100">
                SchemaShift
              </span>
            </Link>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs leading-relaxed">
              Intelligent data source memory. Remember your schemas, detect
              drift, and auto-apply cleaning recipes.
            </p>
            <p className="mt-6 text-xs text-zinc-600">
              Made with care for data professionals everywhere.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <span className="text-sm text-zinc-600 cursor-default">
                  Documentation (coming soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/soccerdude1812"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <span className="text-sm text-zinc-600 cursor-default">
                  Privacy Policy (coming soon)
                </span>
              </li>
              <li>
                <span className="text-sm text-zinc-600 cursor-default">
                  Terms of Service (coming soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} SchemaShift. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <span>Built with</span>
            <span className="text-emerald-500 mx-0.5">data love</span>
            <span>and too much coffee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
