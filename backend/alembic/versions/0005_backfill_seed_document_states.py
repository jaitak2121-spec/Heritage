"""Mark pre-existing text-only seed records as curated extracted documents."""

from alembic import op
import sqlalchemy as sa


revision = "0005_backfill_seed_document_states"
down_revision = "0004_postgresql_search_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    documents = sa.table(
        "archival_documents",
        sa.column("extracted_text", sa.Text()),
        sa.column("storage_key", sa.String()),
        sa.column("file_path", sa.String()),
        sa.column("processing_status", sa.String()),
        sa.column("review_status", sa.String()),
        sa.column("processing_completed_at", sa.DateTime()),
        sa.column("reviewed_at", sa.DateTime()),
        sa.column("created_at", sa.DateTime()),
    )
    op.execute(
        documents.update().where(
            documents.c.extracted_text.is_not(None),
            sa.func.length(sa.func.trim(documents.c.extracted_text)) > 0,
            documents.c.storage_key.is_(None),
            documents.c.file_path.is_(None),
        ).values(
            processing_status="extracted",
            review_status="approved",
            processing_completed_at=sa.func.coalesce(
                documents.c.processing_completed_at, documents.c.created_at
            ),
            reviewed_at=sa.func.coalesce(documents.c.reviewed_at, documents.c.created_at),
        )
    )


def downgrade() -> None:
    # This data classification is safe to retain; downgrading the preceding
    # schema migration removes the workflow columns when explicitly requested.
    pass
