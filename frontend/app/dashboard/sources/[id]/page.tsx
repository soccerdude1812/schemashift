'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Source, DriftEvent, Recipe } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SchemaTable } from '@/components/dashboard/schema-table';
import { DriftTimeline } from '@/components/dashboard/drift-timeline';
import { QualityScoreCard } from '@/components/dashboard/quality-score-card';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Pencil,
  Check,
  X,
  Trash2,
  Clock,
  Columns3,
  ScanLine,
  BookOpen,
  Tag,
  AlertTriangle,
} from 'lucide-react';

export default function SourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = params.id as string;

  const [source, setSource] = useState<Source | null>(null);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadSource = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sourceData, driftData, recipeData] = await Promise.all([
        api.getSource(sourceId),
        api.getDriftTimeline(sourceId, 1, 200),
        api.getRecipes(sourceId).catch(() => [] as Recipe[]),
      ]);
      setSource(sourceData);
      setDriftEvents(driftData.data || []);
      setRecipes(Array.isArray(recipeData) ? recipeData : []);
      setEditName(sourceData.name);
      setEditDesc(sourceData.description || '');
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e.error || 'Failed to load source');
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  const handleSaveName = async () => {
    if (!editName.trim() || !source) return;
    setSaving(true);
    try {
      const updated = await api.updateSource(sourceId, { name: editName.trim() });
      setSource(updated);
      setEditingName(false);
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e.error || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesc = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const updated = await api.updateSource(sourceId, {
        description: editDesc.trim() || undefined,
      });
      setSource(updated);
      setEditingDesc(false);
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e.error || 'Failed to update description');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteSource(sourceId);
      router.push('/dashboard/sources');
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e.error || 'Failed to delete source');
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await api.deleteRecipe(sourceId, recipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e.error || 'Failed to delete recipe');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error && !source) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Source not found"
        description={error || 'The source you are looking for does not exist.'}
        actionLabel="Back to Sources"
        onAction={() => router.push('/dashboard/sources')}
      />
    );
  }

  if (!source) return null;

  return (
    <div className="space-y-6">
      {/* Source Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <QualityScoreCard score={source.qualityScore} size="lg" />
          <div className="min-w-0 flex-1">
            {/* Editable name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 border-zinc-700 bg-zinc-800 text-lg font-bold text-zinc-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setEditName(source.name);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="h-8 w-8 text-emerald-500"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingName(false);
                    setEditName(source.name);
                  }}
                  className="h-8 w-8 text-zinc-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-100">{source.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-zinc-400 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Editable description */}
            {editingDesc ? (
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  className="h-8 border-zinc-700 bg-zinc-800 text-sm text-zinc-300"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDesc();
                    if (e.key === 'Escape') {
                      setEditingDesc(false);
                      setEditDesc(source.description || '');
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveDesc}
                  disabled={saving}
                  className="h-7 w-7 text-emerald-500"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingDesc(false);
                    setEditDesc(source.description || '');
                  }}
                  className="h-7 w-7 text-zinc-500"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p
                className="group mt-1 cursor-pointer text-sm text-zinc-400 hover:text-zinc-300"
                onClick={() => setEditingDesc(true)}
              >
                {source.description || (
                  <span className="italic text-zinc-600">
                    Click to add description...
                  </span>
                )}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Columns3 className="h-3 w-3" />
                {source.columnCount} columns
              </span>
              <span className="flex items-center gap-1">
                <ScanLine className="h-3 w-3" />
                {source.scanCount} scans
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last seen {formatDate(source.lastSeenAt)}
              </span>
            </div>

            {/* Tags */}
            {source.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {source.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-zinc-700 text-[10px] text-zinc-400"
                  >
                    <Tag className="mr-1 h-2.5 w-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete Source
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="drift" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="drift"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Drift Timeline
          </TabsTrigger>
          <TabsTrigger
            value="schema"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Schema
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Recipes ({recipes.length})
          </TabsTrigger>
        </TabsList>

        {/* Drift Timeline Tab */}
        <TabsContent value="drift">
          <DriftTimeline events={driftEvents} />
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema">
          {source.baselineSchema && source.baselineSchema.length > 0 ? (
            <SchemaTable columns={source.baselineSchema} />
          ) : (
            <EmptyState
              icon={Columns3}
              title="No schema data"
              description="Upload a file matched to this source to see its schema."
            />
          )}
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes">
          {recipes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No recipes yet"
              description="Recipes are auto-suggested when drift is detected. You can also create them manually."
            />
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-zinc-200">
                          {recipe.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            recipe.isActive
                              ? 'border-emerald-500/20 text-emerald-400'
                              : 'border-zinc-700 text-zinc-500'
                          )}
                        >
                          {recipe.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {recipe.description && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {recipe.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {recipe.operations.map((op, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="border-zinc-700 bg-zinc-800 text-[10px] text-zinc-400"
                          >
                            {op.type.replace(/_/g, ' ')}
                            {op.column && ` (${op.column})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="h-8 w-8 shrink-0 text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Delete Source</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete{' '}
              <span className="font-semibold text-zinc-200">{source.name}</span> and
              all associated scans, recipes, and drift history. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
