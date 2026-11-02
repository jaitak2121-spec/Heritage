import logging
import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.routers import assistant, audit, auth, documents, map, search, sites
from app.services.seed import seed_database
from app.services.storage import get_document_storage
from app.services.document_processing import processing_mode, recover_pending_documents, shutdown_processing_executor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("heritagelens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema creation and upgrades are deliberately handled by Alembic, never at web startup.
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        logger.error(f"Error during database initialization/seeding: {e}")
    finally:
        db.close()

    try:
        recovered = recover_pending_documents()
        if recovered:
            logger.info("Recovered %s pending document processing job(s).", recovered)
    except Exception as exc:
        logger.error("Could not recover pending document jobs: %s", type(exc).__name__)

    yield
    shutdown_processing_executor()
    logger.info("Shutting down HeritageLens API.")


app = FastAPI(
    title="HeritageLens API",
    description="Digital Cultural Heritage Archive API — Indian Architectural & Archival Records",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://heritage-pearl.vercel.app",
)


def get_allowed_origins(configured_origins: str | None = None) -> list[str]:
    if configured_origins is None:
        configured_origins = os.getenv("ALLOWED_ORIGINS", "")
    extra_origins = [origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()]
    return list(dict.fromkeys((*DEFAULT_ALLOWED_ORIGINS, *extra_origins)))


origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(sites.router)
app.include_router(map.router)
app.include_router(documents.router)
app.include_router(assistant.router)
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(audit.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "HeritageLens Archive API",
        "version": "1.0.0"
    }


@app.get("/api/ready", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    """Verify required dependencies without mutating data or contacting optional AI providers."""
    try:
        db.execute(text("SELECT 1"))
        storage = get_document_storage()
    except Exception as exc:
        logger.warning("Readiness check failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A required backend dependency is unavailable or misconfigured.",
        ) from exc
    return {
        "status": "ready",
        "database": "available",
        "storage": storage.provider_name,
        "document_processing": processing_mode(),
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to HeritageLens Cultural Archive API",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
