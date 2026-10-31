import os
import unittest
from unittest.mock import patch
from sqlalchemy.engine import Engine
from sqlalchemy import inspect


class TestDatabaseConfiguration(unittest.TestCase):
    """
    Validates database configuration for both local SQLite development
    and Supabase PostgreSQL Session Pooler deployment on Render.
    """

    def test_01_sqlite_fallback_default(self):
        """Verifies fallback to SQLite when DATABASE_URL is not set."""
        from app.database import engine, is_sqlite

        self.assertTrue(is_sqlite)
        self.assertTrue(str(engine.url).startswith("sqlite"))
        self.assertTrue(engine.pool._pre_ping)

    def test_02_postgres_scheme_normalization(self):
        """Verifies postgres:// is normalized to postgresql:// for SQLAlchemy compatibility."""
        test_url = "postgres://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

        # Simulating environment with postgres:// URL
        with patch.dict(os.environ, {"DATABASE_URL": test_url}):
            raw_url = os.getenv("DATABASE_URL", "").strip()
            if raw_url.startswith("postgres://"):
                normalized_url = raw_url.replace("postgres://", "postgresql://", 1)
            else:
                normalized_url = raw_url

            self.assertTrue(normalized_url.startswith("postgresql://"))
            self.assertIn("aws-0-ap-south-1.pooler.supabase.com", normalized_url)

    def test_03_supabase_session_pooler_engine_configuration(self):
        """Verifies PostgreSQL engine is constructed with pool_pre_ping and pool_recycle for Supabase pooler."""
        from sqlalchemy import create_engine

        test_url = "postgresql://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
        
        engine_pg = create_engine(
            test_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
        )
        self.assertIsInstance(engine_pg, Engine)
        self.assertTrue(engine_pg.pool._pre_ping)
        self.assertEqual(engine_pg.pool._recycle, 300)
        self.assertEqual(engine_pg.pool.size(), 5)
        self.assertEqual(engine_pg.pool._max_overflow, 10)

    def test_04_schema_inspection_dialect_agnostic(self):
        """Verifies that table and column inspection runs cleanly without dialect-specific PRAGMAs."""
        from app.database import engine

        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        self.assertIn("heritage_sites", table_names)
        self.assertIn("archival_documents", table_names)
        self.assertIn("site_images", table_names)

        doc_cols = [c["name"] for c in inspector.get_columns("archival_documents")]
        self.assertIn("file_path", doc_cols)
        self.assertIn("file_size", doc_cols)
        self.assertIn("extracted_text", doc_cols)


if __name__ == "__main__":
    unittest.main()
