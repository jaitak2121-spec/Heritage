import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
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

# 1. Resolve DATABASE_URL from environment with SQLite local-development fallback
raw_database_url = os.getenv("DATABASE_URL", "").strip()
if not raw_database_url:
    DATABASE_URL = f"sqlite:///{BASE_DIR}/heritagelens.db"
    logger.info(f"DATABASE_URL not set; using local SQLite fallback: {DATABASE_URL}")
else:
    DATABASE_URL = raw_database_url

# 2. Normalize database URL scheme for SQLAlchemy 2.0 compatibility
# Cloud platforms like Render and Supabase frequently provide 'postgres://' which SQLAlchemy requires as 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Configure connection parameters and pool settings
is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # SQLite connection configuration (local development)
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
    )
else:
    # PostgreSQL / Supabase Session Pooler configuration (Render deployment)
    # Supabase Session Pooler (port 5432/6543) requires pre-ping verification and connection recycling
    connect_args = {}
    
    # Ensure SSL mode is enabled for remote PostgreSQL connections unless explicitly configured
    if "sslmode" not in DATABASE_URL.lower() and not any(
        host in DATABASE_URL.lower() for host in ("localhost", "127.0.0.1", "@db:", "@postgres:")
    ):
        connect_args["sslmode"] = "require"

    engine = create_engine(
        DATABASE_URL,
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
