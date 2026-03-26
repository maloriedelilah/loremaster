"""Add default_prompt to universes, prompt and context_snippets to workspaces

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :column"
    ), {"table": table, "column": column})
    return result.fetchone() is not None


def upgrade() -> None:
    if not column_exists('universes', 'default_prompt'):
        op.add_column('universes', sa.Column('default_prompt', sa.Text(), nullable=True))

    if not column_exists('workspaces', 'prompt'):
        op.add_column('workspaces', sa.Column('prompt', sa.Text(), nullable=True))

    if not column_exists('workspaces', 'context_snippets'):
        op.add_column('workspaces', sa.Column('context_snippets', sa.Integer(), nullable=True, server_default='10'))


def downgrade() -> None:
    if column_exists('workspaces', 'context_snippets'):
        op.drop_column('workspaces', 'context_snippets')
    if column_exists('workspaces', 'prompt'):
        op.drop_column('workspaces', 'prompt')
    if column_exists('universes', 'default_prompt'):
        op.drop_column('universes', 'default_prompt')