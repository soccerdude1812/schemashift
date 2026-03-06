"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")).strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# Rate limiting
MAX_SESSIONS_PER_IP_PER_HOUR = int(os.getenv("MAX_SESSIONS_PER_IP_PER_HOUR", "5"))
MAX_SCANS_PER_SESSION_PER_HOUR = int(os.getenv("MAX_SCANS_PER_SESSION_PER_HOUR", "20"))
GLOBAL_SCANS_PER_HOUR = int(os.getenv("GLOBAL_SCANS_PER_HOUR", "200"))

# File upload limits (bytes)
FREE_MAX_FILE_SIZE = int(os.getenv("FREE_MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
PRO_MAX_FILE_SIZE = int(os.getenv("PRO_MAX_FILE_SIZE", str(50 * 1024 * 1024)))  # 50MB

# Pipeline timeout
PIPELINE_TIMEOUT_SECONDS = int(os.getenv("PIPELINE_TIMEOUT_SECONDS", "60"))

# Pagination defaults
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 20
MAX_LIMIT = 100
