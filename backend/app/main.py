import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base, SessionLocal
from app.routers import sites, map, documents, assistant
from app.services.seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("heritagelens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize tables and execute non-breaking SQLite schema migrations
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            cursor = conn.connection.cursor()
            cursor.execute("PRAGMA table_info(archival_documents);")
            cols = [row[1] for row in cursor.fetchall()]
            if "file_path" not in cols:
                cursor.execute("ALTER TABLE archival_documents ADD COLUMN file_path VARCHAR(500);")
                logger.info("Migrated archival_documents: added file_path column.")
            if "file_size" not in cols:
                cursor.execute("ALTER TABLE archival_documents ADD COLUMN file_size INTEGER;")
                logger.info("Migrated archival_documents: added file_size column.")
            conn.connection.commit()
    except Exception as e:
        logger.debug(f"Schema check note: {e}")

    # 2. Automatically seed database if empty
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        logger.error(f"Error during database initialization/seeding: {e}")
    finally:
        db.close()

    yield
    logger.info("Shutting down HeritageLens API.")


app = FastAPI(
    title="HeritageLens API",
    description="Digital Cultural Heritage Archive API — Indian Architectural & Archival Records",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for document uploads
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Routers
app.include_router(sites.router)
app.include_router(map.router)
app.include_router(documents.router)
app.include_router(assistant.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "HeritageLens Archive API",
        "version": "1.0.0"
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
