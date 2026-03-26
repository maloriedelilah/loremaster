"""Initial schema - create all tables

Revision ID: 0001
Revises: 
Create Date: 2026-03-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    op.create_table(
        'universes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_workspace', sa.String(), nullable=True),
        sa.Column('default_prompt', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_universes_tenant_id', 'universes', ['tenant_id'])

    op.create_table(
        'workspaces',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('universe_id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=True),
        sa.Column('context_snippets', sa.Integer(), nullable=True, default=10),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspaces_universe_id', 'workspaces', ['universe_id'])
    op.create_index('ix_workspaces_tenant_id', 'workspaces', ['tenant_id'])

    op.create_table(
        'books',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('universe_id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('series', sa.String(), nullable=False),
        sa.Column('series_order', sa.String(), nullable=True),
        sa.Column('format', sa.String(), nullable=True),
        sa.Column('era', sa.String(), nullable=False),
        sa.Column('uses_parts', sa.Boolean(), nullable=True, default=False),
        sa.Column('pov_markers', sa.Boolean(), nullable=True, default=False),
        sa.Column('has_drop_caps', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_extended_content', sa.Boolean(), nullable=True, default=False),
        sa.Column('date_identifier', sa.String(), nullable=True),
        sa.Column('source_books', sa.Text(), nullable=True),
        sa.Column('chapter_header_styles', sa.Text(), nullable=True),
        sa.Column('skip_headings_extra', sa.Text(), nullable=True),
        sa.Column('recap_headings_extra', sa.Text(), nullable=True),
        sa.Column('appendix_headings_extra', sa.Text(), nullable=True),
        sa.Column('filename', sa.String(), nullable=True),
        sa.Column('file_stored_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('file_pushed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), nullable=False, default='pending'),
        sa.Column('dry_run_result', sa.Text(), nullable=True),
        sa.Column('chunk_count', sa.Integer(), nullable=True),
        sa.Column('chunks_embedded', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('chunkinator_job_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_books_tenant_id', 'books', ['tenant_id'])
    op.create_index('ix_books_universe_id', 'books', ['universe_id'])
    op.create_index('ix_books_workspace_id', 'books', ['workspace_id'])

    op.create_table(
        'workspace_signatures',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('universe_id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('workspace_slug', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_name', sa.String(), nullable=False),
        sa.Column('aliases', sa.Text(), nullable=True),
        sa.Column('source_books', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspace_signatures_tenant_id', 'workspace_signatures', ['tenant_id'])
    op.create_index('ix_workspace_signatures_universe_id', 'workspace_signatures', ['universe_id'])


def downgrade() -> None:
    op.drop_table('workspace_signatures')
    op.drop_table('books')
    op.drop_table('workspaces')
    op.drop_table('universes')
    op.drop_table('users')
    op.drop_table('tenants')
