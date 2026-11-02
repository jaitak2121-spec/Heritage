"""Baseline schema that predates managed migrations."""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "heritage_sites",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("historical_period", sa.String(100), nullable=False),
        sa.Column("architectural_style", sa.String(100), nullable=False),
        sa.Column("region", sa.String(50), nullable=False),
        sa.Column("location_name", sa.String(255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("image_url", sa.String(1024), nullable=False),
        sa.Column("significance", sa.Text(), nullable=True),
        sa.Column("sources", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_heritage_sites_id", "heritage_sites", ["id"])
    op.create_index("ix_heritage_sites_name", "heritage_sites", ["name"])
    op.create_index("ix_heritage_sites_historical_period", "heritage_sites", ["historical_period"])
    op.create_index("ix_heritage_sites_architectural_style", "heritage_sites", ["architectural_style"])
    op.create_index("ix_heritage_sites_region", "heritage_sites", ["region"])
    op.create_index("idx_site_search", "heritage_sites", ["name", "region", "historical_period"])

    op.create_table(
        "archival_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=True),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("corrected_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["heritage_sites.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_archival_documents_id", "archival_documents", ["id"])
    op.create_index("ix_archival_documents_site_id", "archival_documents", ["site_id"])
    op.create_index("ix_archival_documents_title", "archival_documents", ["title"])

    op.create_table(
        "site_images",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(1024), nullable=False),
        sa.Column("caption", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["heritage_sites.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_site_images_id", "site_images", ["id"])
    op.create_index("ix_site_images_site_id", "site_images", ["site_id"])


def downgrade() -> None:
    op.drop_table("site_images")
    op.drop_table("archival_documents")
    op.drop_table("heritage_sites")
