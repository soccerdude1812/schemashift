import { ApiError, PaginatedResponse, Scan, Session, Source, Recipe, DriftEvent } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860';
const CLIENT_TIMEOUT = 45000;

// snake_case to camelCase recursive transform
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('schemashift_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('schemashift_session_id', sid);
  }
  return sid;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT);

  const headers: Record<string, string> = {
    'X-Session-ID': getSessionId(),
    ...(options.headers as Record<string, string> || {}),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      let parsed: ApiError;
      try { parsed = JSON.parse(errBody); } catch { parsed = { error: errBody, code: 'UNKNOWN' }; }
      throw parsed;
    }

    const text = await res.text();
    if (!text) return {} as T;
    const json = JSON.parse(text);
    return toCamelCase(json) as T;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.code) throw err; // Already an ApiError
    if (retries > 0 && (err.name === 'AbortError' || err.message?.includes('fetch'))) {
      const delay = (4 - retries) * 1000;
      await new Promise(r => setTimeout(r, delay));
      return apiFetch<T>(path, options, retries - 1);
    }
    throw { error: err.message || 'Network error', code: 'NETWORK_ERROR' } as ApiError;
  }
}

// API methods
export const api = {
  // Session
  createSession: () => apiFetch<Session>('/api/v1/session'),

  // Sources
  getSources: (page = 1, limit = 20) =>
    apiFetch<PaginatedResponse<Source>>(`/api/v1/sources?page=${page}&limit=${limit}`),
  getSource: (id: string) => apiFetch<Source>(`/api/v1/sources/${id}`),
  updateSource: (id: string, data: { name?: string; description?: string; tags?: string[] }) =>
    apiFetch<Source>(`/api/v1/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (id: string) =>
    apiFetch<void>(`/api/v1/sources/${id}`, { method: 'DELETE' }),
  getDriftTimeline: (id: string, page = 1, limit = 50) =>
    apiFetch<PaginatedResponse<DriftEvent>>(`/api/v1/sources/${id}/drift-timeline?page=${page}&limit=${limit}`),

  // Scans
  scan: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<Scan>('/api/v1/scan', { method: 'POST', body: form });
  },
  getScan: (id: string) => apiFetch<Scan>(`/api/v1/scans/${id}`),
  deleteScan: (id: string) =>
    apiFetch<void>(`/api/v1/scans/${id}`, { method: 'DELETE' }),

  // Recipes
  getRecipes: (sourceId: string) =>
    apiFetch<Recipe[]>(`/api/v1/sources/${sourceId}/recipes`),
  createRecipe: (sourceId: string, data: Omit<Recipe, 'id' | 'sourceId' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<Recipe>(`/api/v1/sources/${sourceId}/recipes`, { method: 'POST', body: JSON.stringify(data) }),
  updateRecipe: (sourceId: string, recipeId: string, data: Partial<Recipe>) =>
    apiFetch<Recipe>(`/api/v1/sources/${sourceId}/recipes/${recipeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipe: (sourceId: string, recipeId: string) =>
    apiFetch<void>(`/api/v1/sources/${sourceId}/recipes/${recipeId}`, { method: 'DELETE' }),

  // Demo
  seedDemo: () => apiFetch<{ seeded: boolean }>('/api/v1/demo/seed', { method: 'POST' }),

  // Health
  health: () => apiFetch<{ status: string; version: string }>('/api/v1/health'),
};
