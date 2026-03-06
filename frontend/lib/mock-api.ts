// SchemaShift — Mock API Layer
// Returns realistic demo data when the Python backend is unavailable.
// Mirrors the real `api` object from api.ts with simulated network delays.

import {
  Session,
  Source,
  Scan,
  Recipe,
  DriftEvent,
  PaginatedResponse,
} from './types';

import {
  DEMO_SESSION,
  DEMO_SOURCES,
  DEMO_SCANS,
  DEMO_DRIFT_EVENTS,
  DEMO_RECIPES,
} from './demo-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate realistic network latency (200-800ms) */
function delay(minMs = 200, maxMs = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Paginate an array */
function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    total: items.length,
    page,
    limit,
    hasMore: start + limit < items.length,
  };
}

// ---------------------------------------------------------------------------
// Mock API — same shape as the real `api` export from api.ts
// ---------------------------------------------------------------------------

export const mockApi = {
  // Session -------------------------------------------------------------------
  createSession: async (): Promise<Session> => {
    await delay(200, 400);
    return { ...DEMO_SESSION };
  },

  // Sources -------------------------------------------------------------------
  getSources: async (page = 1, limit = 20): Promise<PaginatedResponse<Source>> => {
    await delay(300, 600);
    return paginate(DEMO_SOURCES, page, limit);
  },

  getSource: async (id: string): Promise<Source> => {
    await delay(200, 500);
    const source = DEMO_SOURCES.find(s => s.id === id);
    if (!source) throw { error: 'Source not found', code: 'NOT_FOUND' };
    return { ...source };
  },

  updateSource: async (
    id: string,
    data: { name?: string; description?: string; tags?: string[] }
  ): Promise<Source> => {
    await delay(300, 600);
    const source = DEMO_SOURCES.find(s => s.id === id);
    if (!source) throw { error: 'Source not found', code: 'NOT_FOUND' };
    return {
      ...source,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.tags !== undefined && { tags: data.tags }),
      updatedAt: new Date().toISOString(),
    };
  },

  deleteSource: async (id: string): Promise<void> => {
    await delay(200, 400);
    const exists = DEMO_SOURCES.some(s => s.id === id);
    if (!exists) throw { error: 'Source not found', code: 'NOT_FOUND' };
    // In mock mode we don't actually mutate the demo data
  },

  getDriftTimeline: async (
    id: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<DriftEvent>> => {
    await delay(300, 600);
    const events = DEMO_DRIFT_EVENTS[id] || [];
    // Sort newest first
    const sorted = [...events].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return paginate(sorted, page, limit);
  },

  // Scans ---------------------------------------------------------------------
  scan: async (_file: File): Promise<Scan> => {
    // Simulate a 3-second processing delay for scanning
    await delay(2500, 3500);

    // Pick a random source and return its latest scan (with tweaked data)
    const sources = Object.keys(DEMO_SCANS);
    const sourceId = sources[Math.floor(Math.random() * sources.length)];
    const scans = DEMO_SCANS[sourceId];
    const latest = scans[scans.length - 1];

    return {
      ...latest,
      id: `scn_mock_${crypto.randomUUID().slice(0, 8)}`,
      filename: _file.name,
      fileSizeBytes: _file.size || 125_000,
      createdAt: new Date().toISOString(),
      isNewSource: Math.random() > 0.7, // 30% chance it's a new source
    };
  },

  getScan: async (id: string): Promise<Scan> => {
    await delay(200, 500);
    // Search all scans for the id
    for (const scans of Object.values(DEMO_SCANS)) {
      const found = scans.find(s => s.id === id);
      if (found) return { ...found };
    }
    throw { error: 'Scan not found', code: 'NOT_FOUND' };
  },

  deleteScan: async (id: string): Promise<void> => {
    await delay(200, 400);
    let found = false;
    for (const scans of Object.values(DEMO_SCANS)) {
      if (scans.some(s => s.id === id)) { found = true; break; }
    }
    if (!found) throw { error: 'Scan not found', code: 'NOT_FOUND' };
  },

  // Recipes -------------------------------------------------------------------
  getRecipes: async (sourceId: string): Promise<Recipe[]> => {
    await delay(200, 500);
    return [...(DEMO_RECIPES[sourceId] || [])];
  },

  createRecipe: async (
    sourceId: string,
    data: Omit<Recipe, 'id' | 'sourceId' | 'createdAt' | 'updatedAt'>
  ): Promise<Recipe> => {
    await delay(300, 600);
    return {
      id: `rcp_mock_${crypto.randomUUID().slice(0, 8)}`,
      sourceId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  updateRecipe: async (
    sourceId: string,
    recipeId: string,
    data: Partial<Recipe>
  ): Promise<Recipe> => {
    await delay(300, 600);
    const recipes = DEMO_RECIPES[sourceId] || [];
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) throw { error: 'Recipe not found', code: 'NOT_FOUND' };
    return {
      ...recipe,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  },

  deleteRecipe: async (sourceId: string, recipeId: string): Promise<void> => {
    await delay(200, 400);
    const recipes = DEMO_RECIPES[sourceId] || [];
    if (!recipes.some(r => r.id === recipeId)) {
      throw { error: 'Recipe not found', code: 'NOT_FOUND' };
    }
  },

  // Demo / Health -------------------------------------------------------------
  seedDemo: async (): Promise<{ seeded: boolean }> => {
    await delay(500, 1000);
    return { seeded: true };
  },

  health: async (): Promise<{ status: string; version: string }> => {
    await delay(100, 200);
    return { status: 'ok (demo mode)', version: '0.1.0-demo' };
  },
};
