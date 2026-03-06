"""Supabase client initialization with service role key."""

from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client: Client | None = None


def get_client() -> Client:
    """Get or create Supabase client singleton.

    Uses the service role key which bypasses RLS.
    All data isolation is enforced at the application level via session_id filtering.
    """
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Check your .env file."
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client
