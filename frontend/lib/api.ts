import { ApiError, PaginatedResponse, Scan, Session, Source, Recipe, DriftEvent } from './types';
import { mockApi } from './mock-api';
import { createBrowserClient } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const CLIENT_TIMEOUT = 45000;
const MOCK_FAILURE_THRESHOLD = 2; // Switch to mock after this many consecutive failures

// ---------------------------------------------------------------------------
// Mock-mode state (client-side only)
// ---------------------------------------------------------------------------
let consecutiveFailures = 0;
let useMockApi = !API_URL; // No backend URL configured → use mock immediately

/** Check if we're currently in demo/mock mode */
export function isUsingMockApi(): boolean {
  return useMockApi;
}

/** Force mock mode on (useful for demo/preview deployments) */
export function enableMockApi(): void {
  useMockApi = true;
  if (typeof window !== 'undefined') {
    console.log('[SchemaShift] Mock API enabled — showing demo data');
  }
}

/** Reset to try the real backend again */
export function resetMockApi(): void {
  useMockApi = false;
  consecutiveFailures = 0;
  if (typeof window !== 'undefined') {
    console.log('[SchemaShift] Mock API reset — will try real backend');
  }
}

// ---------------------------------------------------------------------------
// snake_case to camelCase recursive transform
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any);
  }
  return obj;
}

// Cache the backend-registered session ID
let _registeredSessionId: string | null = null;
let _sessionInitPromise: Promise<string> | null = null;

async function getSessionId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  if (useMockApi) {
    // Mock mode: just use a local UUID, no backend call needed
    let sid = localStorage.getItem('schemashift_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('schemashift_session_id', sid);
    }
    return sid;
  }

  // Return cached session if available
  if (_registeredSessionId) return _registeredSessionId;

  // Deduplicate concurrent initialization calls
  if (_sessionInitPromise) return _sessionInitPromise;

  _sessionInitPromise = _initBackendSession();
  try {
    const sid = await _sessionInitPromise;
    return sid;
  } finally {
    _sessionInitPromise = null;
  }
}

async function _initBackendSession(): Promise<string> {
  // Check if we have a locally stored session ID
  let localSid = localStorage.getItem('schemashift_session_id') || '';

  // Try to get the Supabase user ID to use as the session ID
  try {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) localSid = user.id;
  } catch {
    // Fall through
  }

  // Register with the backend (GET /api/v1/session creates if not found)
  try {
    const headers: Record<string, string> = {};
    if (localSid) headers['X-Session-ID'] = localSid;

    const res = await fetch(`${API_URL}/api/v1/session`, { headers });
    if (res.ok) {
      const data = await res.json();
      const sid = data.id || data.session_id;
      if (sid) {
        _registeredSessionId = sid;
        localStorage.setItem('schemashift_session_id', sid);
        return sid;
      }
    }
  } catch {
    // Backend unreachable — fall through to local-only mode
  }

  // Fallback: generate local UUID if backend is unreachable
  if (!localSid) {
    localSid = crypto.randomUUID();
    localStorage.setItem('schemashift_session_id', localSid);
  }
  return localSid;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT);

  const sessionId = await getSessionId();
  const headers: Record<string, string> = {
    'X-Session-ID': sessionId,
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

    // Real backend responded — reset failure counter
    consecutiveFailures = 0;

    return toCamelCase(json) as T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.code && err.code !== 'NETWORK_ERROR') throw err; // Already a real ApiError from the backend
    if (retries > 0 && (err.name === 'AbortError' || err.message?.includes('fetch'))) {
      const delayMs = (4 - retries) * 1000;
      await new Promise(r => setTimeout(r, delayMs));
      return apiFetch<T>(path, options, retries - 1);
    }

    // Track consecutive network failures
    consecutiveFailures++;
    if (consecutiveFailures >= MOCK_FAILURE_THRESHOLD && !useMockApi) {
      useMockApi = true;
      if (typeof window !== 'undefined') {
        console.log(
          `[SchemaShift] Backend unreachable after ${consecutiveFailures} attempts — falling back to demo data`
        );
      }
    }

    throw { error: err.message || 'Network error', code: 'NETWORK_ERROR' } as ApiError;
  }
}

// ---------------------------------------------------------------------------
// Proxy: tries real backend first, falls back to mock if useMockApi is set
// ---------------------------------------------------------------------------

type ApiType = typeof realApi;

const realApi = {
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

/**
 * Creates a proxy that intercepts every API call:
 * - If `useMockApi` is true, route directly to mockApi
 * - Otherwise try realApi; on NETWORK_ERROR, fall back to mockApi
 */
function createFallbackProxy(): ApiType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = {
    get(_target, prop: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (...args: any[]) => {
        // Already in mock mode — skip the real backend entirely
        if (useMockApi) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (mockApi as any)[prop](...args);
        }

        // Try real backend first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (realApi as any)[prop](...args).catch((err: ApiError) => {
          if (err.code === 'NETWORK_ERROR') {
            if (typeof window !== 'undefined') {
              console.log(`[SchemaShift] ${prop}() failed — using demo data`);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (mockApi as any)[prop](...args);
          }
          throw err;
        });
      };
    },
  };

  return new Proxy(realApi, handler);
}

// API methods — automatically falls back to mock data when backend is down
export const api: ApiType = createFallbackProxy();
