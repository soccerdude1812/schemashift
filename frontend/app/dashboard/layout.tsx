'use client';

import { useState } from 'react';
import { SidebarNav } from '@/components/dashboard/sidebar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Layers } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-900/50 lg:block">
        <SidebarNav />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/30 px-4">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-zinc-400 hover:text-zinc-100"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-60 border-zinc-800 bg-zinc-900 p-0"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
              <Layers className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-100">SchemaShift</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
