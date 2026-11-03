"""Apply Alembic migrations safely for fresh and legacy deployments."""

import logging

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine


logger = logging.getLogger("heritagelens.migrations")
BASELINE_REVISION = "0001_initial_schema"
BASELINE_TABLES = {"heritage_sites", "archival_documents", "site_images"}


def migrate() -> None:
    config = Config("alembic.ini")
    tables = set(inspect(engine).get_table_names())

    # Production databases created before Alembic already contain the initial
    # tables. Record that baseline without recreating or deleting any data.
    if "alembic_version" not in tables and BASELINE_TABLES.issubset(tables):
        logger.info("Stamping the existing database at the initial Alembic baseline.")
        command.stamp(config, BASELINE_REVISION)

    command.upgrade(config, "head")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate()
