'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { PLAN_LIMITS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Copy,
  Check,
  Shield,
  HardDrive,
  AlertTriangle,
  Download,
  Crown,
} from 'lucide-react';

export default function SettingsPage() {
  const { session, loading } = useSession();
  const [copied, setCopied] = useState(false);

  const handleCopySessionId = () => {
    if (!session?.sessionId) return;
    navigator.clipboard.writeText(session.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const plan = session?.plan || 'free';
  const limits = PLAN_LIMITS[plan];

  const planLabels = {
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
  };

  const planColors = {
    free: 'border-zinc-700 text-zinc-400',
    pro: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    team: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your session and view plan details
        </p>
      </div>

      {/* Browser warning */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-400">
            Your data is saved to this browser
          </p>
          <p className="mt-0.5 text-xs text-amber-500/70">
            SchemaShift uses a browser-local session. Clearing your browser data or
            switching devices will require a new session. Export your sources to back up
            your work.
          </p>
        </div>
      </div>

      {/* Session Info */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
            <Shield className="h-4 w-4 text-zinc-500" />
            Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500">Session ID</label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-300">
                {session?.sessionId || 'Not available'}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySessionId}
                className="h-9 w-9 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {session?.createdAt && (
            <div>
              <label className="text-xs text-zinc-500">Created</label>
              <p className="mt-0.5 text-sm text-zinc-300">
                {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Info */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
            <Crown className="h-4 w-4 text-zinc-500" />
            Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={planColors[plan]}>
              {planLabels[plan]}
            </Badge>
            {plan === 'free' && (
              <span className="text-xs text-zinc-500">
                Upgrade for more sources and faster scans
              </span>
            )}
          </div>

          {/* Usage bars */}
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Sources</span>
                <span className="text-xs text-zinc-400">
                  {session?.sourcesCount || 0} / {limits.maxSources}
                </span>
              </div>
              <Progress
                value={((session?.sourcesCount || 0) / limits.maxSources) * 100}
                className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Scans this hour</span>
                <span className="text-xs text-zinc-400">
                  {session?.scanCount || 0} / {limits.maxScansPerHour}
                </span>
              </div>
              <Progress
                value={((session?.scanCount || 0) / limits.maxScansPerHour) * 100}
                className="h-1.5 bg-zinc-800 [&>div]:bg-blue-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Max file size</span>
                <span className="text-xs text-zinc-400">
                  {limits.maxFileSizeMb} MB
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-zinc-200">
            <HardDrive className="h-4 w-4 text-zinc-500" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => {
              // Export sources stub
              alert(
                'Export functionality coming soon. Your sources and scan history will be exportable as JSON.'
              );
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Sources
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
