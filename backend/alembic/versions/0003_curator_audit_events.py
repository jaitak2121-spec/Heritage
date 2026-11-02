"""Add curator mutation and authentication audit events."""

from alembic import op
import sqlalchemy as sa


revision = "0003_curator_audit_events"
down_revision = "0002_document_storage_workflow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "curator_audit_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_type", sa.String(32), nullable=False),
        sa.Column("actor_identifier", sa.String(64), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("outcome", sa.String(32), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_curator_audit_events_created_at", "curator_audit_events", ["created_at"])
    op.create_index("ix_curator_audit_events_action", "curator_audit_events", ["action"])


def downgrade() -> None:
    op.drop_index("ix_curator_audit_events_action", table_name="curator_audit_events")
    op.drop_index("ix_curator_audit_events_created_at", table_name="curator_audit_events")
    op.drop_table("curator_audit_events")
