"""Add durable storage metadata and document workflow state."""

from alembic import op
import sqlalchemy as sa


revision = "0002_document_storage_workflow"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("archival_documents") as batch_op:
        batch_op.add_column(sa.Column("storage_provider", sa.String(32), server_default="local", nullable=False))
        batch_op.add_column(sa.Column("storage_key", sa.String(1024), nullable=True))
        batch_op.add_column(sa.Column("processing_status", sa.String(32), server_default="uploaded", nullable=False))
        batch_op.add_column(sa.Column("review_status", sa.String(32), server_default="unreviewed", nullable=False))
        batch_op.add_column(sa.Column("ocr_method", sa.String(64), nullable=True))
        batch_op.add_column(sa.Column("extraction_language", sa.String(32), nullable=True))
        batch_op.add_column(sa.Column("page_count", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("ocr_confidence", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("processing_error", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("processing_started_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("processing_completed_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))
        batch_op.create_unique_constraint("uq_archival_documents_storage_key", ["storage_key"])
        batch_op.create_index("ix_archival_documents_storage_provider", ["storage_provider"])
        batch_op.create_index("ix_archival_documents_processing_status", ["processing_status"])
        batch_op.create_index("ix_archival_documents_review_status", ["review_status"])


def downgrade() -> None:
    with op.batch_alter_table("archival_documents") as batch_op:
        batch_op.drop_index("ix_archival_documents_review_status")
        batch_op.drop_index("ix_archival_documents_processing_status")
        batch_op.drop_index("ix_archival_documents_storage_provider")
        batch_op.drop_constraint("uq_archival_documents_storage_key", type_="unique")
        for column in (
            "updated_at", "reviewed_at", "processing_completed_at", "processing_started_at",
            "processing_error", "ocr_confidence", "page_count", "extraction_language",
            "ocr_method", "review_status", "processing_status", "storage_key", "storage_provider",
        ):
            batch_op.drop_column(column)
