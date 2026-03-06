export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('schemashift_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('schemashift_session_id', sid);
  }
  return sid;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('schemashift_session_id');
  }
}
