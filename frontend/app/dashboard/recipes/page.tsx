'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Source, Recipe } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function RecipesPage() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getSources(1, 100);
        setSources(res.data);
        const recipeMap: Record<string, Recipe[]> = {};
        for (const source of res.data) {
          try {
            const r = await api.getRecipes(source.id);
            if (r.length > 0) recipeMap[source.id] = r;
          } catch {}
        }
        setRecipes(recipeMap);
      } catch (err) {
        console.error('Failed to load recipes:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allRecipes = Object.entries(recipes).flatMap(([sourceId, recs]) => {
    const source = sources.find(s => s.id === sourceId);
    return recs.map(r => ({ ...r, sourceName: source?.name || 'Unknown' }));
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100">Recipes</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (allRecipes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100">Recipes</h1>
        <EmptyState
          icon={BookOpen}
          title="No recipes yet"
          description="Recipes are cleaning rules that automatically apply when you scan a known data source. Upload a file and create your first recipe."
          actionLabel="Upload a file"
          onAction={() => router.push('/dashboard/scan')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Recipes</h1>
        <p className="text-zinc-400 mt-1">
          Cleaning rules that auto-apply when you scan a known source
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(recipes).map(([sourceId, recs]) => {
          const source = sources.find(s => s.id === sourceId);
          return (
            <Card key={sourceId} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-zinc-100">
                    {source?.name || 'Unknown Source'}
                  </CardTitle>
                  <Link href={`/dashboard/sources/${sourceId}`}>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                      View Source <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recs.map(recipe => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={recipe.isActive ? 'border-emerald-500/50 text-emerald-400' : 'border-zinc-600 text-zinc-500'}
                        >
                          {recipe.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{recipe.name}</p>
                          <p className="text-xs text-zinc-500">
                            {recipe.operations.length} operation{recipe.operations.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {recipe.operations.map((op, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
                            {op.type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
