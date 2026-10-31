import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Load environment variables cleanly from .env if present (without overriding existing environment)
BASE_DIR = Path(__file__).resolve().parent.parent
env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def normalize_database_url(database_url: str) -> str:
    """Select the installed psycopg2 driver for every supported PostgreSQL URI."""
    driver_prefixes = (
        "postgres://",
        "postgresql://",
        "postgresql+psycopg://",
    )
    for prefix in driver_prefixes:
        if database_url.startswith(prefix):
            return database_url.replace(prefix, "postgresql+psycopg2://", 1)
    return database_url


def postgres_connect_args(database_url: str) -> dict[str, str]:
    """Require TLS for remote PostgreSQL unless the URI already sets sslmode."""
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        return {}

    if any(key.lower() == "sslmode" for key in url.query):
        return {}

    if (url.host or "").lower() in {"localhost", "127.0.0.1", "db", "postgres"}:
        return {}

    return {"sslmode": "require"}


# 1. Resolve DATABASE_URL from environment with SQLite local-development fallback
raw_database_url = os.getenv("DATABASE_URL", "").strip()
if not raw_database_url:
    DATABASE_URL = f"sqlite:///{BASE_DIR}/heritagelens.db"
    logger.info(f"DATABASE_URL not set; using local SQLite fallback: {DATABASE_URL}")
else:
    DATABASE_URL = normalize_database_url(raw_database_url)

# 2. Normalize database URL scheme to explicitly use psycopg2
# A URL beginning with postgresql+psycopg:// explicitly selects psycopg 3 and
# imports the `psycopg` package. The image installs psycopg2-binary instead, so
# every common PostgreSQL form is normalized above to postgresql+psycopg2://.

# 3. Configure connection parameters and pool settings
database_url = make_url(DATABASE_URL)
is_sqlite = database_url.get_backend_name() == "sqlite"

if is_sqlite:
    # SQLite connection configuration (local development)
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )
else:
    # PostgreSQL / Supabase Session Pooler configuration (Render deployment)
    # Supabase Session Pooler (port 5432/6543) requires pre-ping verification and connection recycling
    connect_args = postgres_connect_args(DATABASE_URL)

    engine = create_engine(
        database_url,
        connect_args=connect_args,
        pool_pre_ping=True,   # Validates connections before checkout, preventing dropped pooler connection errors
        pool_recycle=300,     # Recycles connections every 5 minutes to stay ahead of pooler idle timeouts
        pool_size=5,          # Standard connection pool size suitable for Render web services
        max_overflow=10,      # Allows burst capacity under concurrent traffic
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
