"""Add PostgreSQL GIN indexes for archive full-text search."""

from alembic import op


revision = "0004_postgresql_search_indexes"
down_revision = "0003_curator_audit_events"
branch_labels = None
depends_on = None


DOCUMENT_INDEX = "ix_archival_documents_full_text"
SITE_INDEX = "ix_heritage_sites_full_text"


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        f"""
        CREATE INDEX {DOCUMENT_INDEX} ON archival_documents USING gin (
            to_tsvector('simple',
                coalesce(title, '') || ' ' ||
                coalesce(extracted_text, '') || ' ' ||
                coalesce(corrected_text, '')
            )
        )
        """
    )
    op.execute(
        f"""
        CREATE INDEX {SITE_INDEX} ON heritage_sites USING gin (
            to_tsvector('simple',
                coalesce(name, '') || ' ' ||
                coalesce(description, '') || ' ' ||
                coalesce(location_name, '') || ' ' ||
                coalesce(historical_period, '') || ' ' ||
                coalesce(architectural_style, '') || ' ' ||
                coalesce(significance, '')
            )
        )
        """
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(f"DROP INDEX IF EXISTS {SITE_INDEX}")
    op.execute(f"DROP INDEX IF EXISTS {DOCUMENT_INDEX}")
