import Link from "next/link";
import { Database, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
            <Database className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="text-xl font-semibold text-zinc-100">
            SchemaShift
          </span>
        </Link>

        {/* 404 number */}
        <div className="mb-8">
          <span className="text-8xl sm:text-9xl font-bold bg-gradient-to-b from-zinc-600 to-zinc-800 bg-clip-text text-transparent select-none">
            404
          </span>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-3">
          Schema not found
        </h1>
        <p className="text-zinc-400 mb-10 max-w-sm mx-auto leading-relaxed">
          Looks like this page drifted away. Even SchemaShift couldn&apos;t track
          where it went.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-zinc-700 hover:border-zinc-600 text-zinc-300 px-6 py-5 rounded-xl transition-all duration-300"
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
