'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Session } from '@/lib/types';

const SESSION_KEY = 'schemashift_session_id';
const SESSION_DATA_KEY = 'schemashift_session_data';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSessionId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_KEY);
  }, []);

  const initSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await api.createSession();
      if (sessionData.sessionId) {
        localStorage.setItem(SESSION_KEY, sessionData.sessionId);
        localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
        setSession(sessionData);
      }
    } catch (err: any) {
      setError(err.error || 'Failed to initialize session');
      // Try to use cached session data
      const cached = localStorage.getItem(SESSION_DATA_KEY);
      if (cached) {
        try {
          setSession(JSON.parse(cached));
        } catch {
          // Ignore parse errors
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const sessionData = await api.createSession();
      if (sessionData.sessionId) {
        localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
        setSession(sessionData);
      }
    } catch {
      // Silently fail on refresh
    }
  }, []);

  useEffect(() => {
    const existingId = getSessionId();
    if (existingId) {
      // Session ID exists, try to validate/refresh
      initSession();
    } else {
      // No session, create one
      initSession();
    }
  }, [getSessionId, initSession]);

  return {
    session,
    sessionId: getSessionId(),
    loading,
    error,
    refreshSession,
  };
}
