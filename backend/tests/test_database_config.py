import unittest
from sqlalchemy.engine import Engine
from sqlalchemy import create_engine, inspect

from app.database import normalize_database_url, postgres_connect_args


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
        """Verifies postgres://, postgresql://, and postgresql+psycopg:// normalize to postgresql+psycopg2://."""
        sample_urls = [
            "postgres://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
            "postgresql://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
            "postgresql+psycopg://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
            "postgresql+psycopg2://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
        ]

        for test_url in sample_urls:
            url = normalize_database_url(test_url)

            self.assertTrue(url.startswith("postgresql+psycopg2://"), f"Failed for {test_url}")
            self.assertIn("aws-0-ap-south-1.pooler.supabase.com", url)

    def test_03_supabase_session_pooler_engine_configuration(self):
        """Verifies PostgreSQL engine is constructed with pool_pre_ping, pool_recycle, and psycopg2 driver for Supabase pooler."""
        test_url = "postgresql+psycopg2://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
        
        engine_pg = create_engine(
            test_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
        )
        self.assertIsInstance(engine_pg, Engine)
        self.assertEqual(engine_pg.dialect.driver, "psycopg2")
        self.assertTrue(engine_pg.pool._pre_ping)
        self.assertEqual(engine_pg.pool._recycle, 300)
        self.assertEqual(engine_pg.pool.size(), 5)
        self.assertEqual(engine_pg.pool._max_overflow, 10)

    def test_04_remote_postgres_requires_ssl_without_overriding_explicit_mode(self):
        remote_url = "postgresql+psycopg2://user:password@pooler.example.com:5432/postgres"
        explicit_url = f"{remote_url}?sslmode=verify-full"
        local_url = "postgresql+psycopg2://user:password@localhost:5432/postgres"

        self.assertEqual(postgres_connect_args(remote_url), {"sslmode": "require"})
        self.assertEqual(postgres_connect_args(explicit_url), {})
        self.assertEqual(postgres_connect_args(local_url), {})

    def test_05_percent_encoded_password_is_preserved(self):
        encoded_password = "p%40ss%3Aword%2Fwith%23characters"
        url = normalize_database_url(
            f"postgresql://postgres.project:{encoded_password}@pooler.example.com:5432/postgres?sslmode=require"
        )
        engine_pg = create_engine(url)

        self.assertEqual(engine_pg.url.password, "p@ss:word/with#characters")
        self.assertNotIn("p@ss:word", engine_pg.url.render_as_string(hide_password=True))

    def test_06_schema_inspection_dialect_agnostic(self):
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
