from __future__ import annotations

import re
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import all models so autogenerate can detect them
from app.models import Base  # noqa: F401
from app.core.config import get_settings

config = context.config
settings = get_settings()

# Rewrite DATABASE_URL to use pg8000 driver (same logic as db/session.py)
db_url = settings.database_url
db_url = re.sub(r"^postgres(?:ql)?(?:\+\w+)?://", "postgresql+pg8000://", db_url)

# Strip unsupported pg8000 params
for param in ("sslmode", "channel_binding"):
    db_url = re.sub(rf"\?{param}=[^&]*&", "?", db_url)
    db_url = re.sub(rf"\?{param}=[^&]*$", "", db_url)
    db_url = re.sub(rf"&{param}=[^&]*", "", db_url)

config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Only migrate public schema tables (neon_auth schema is managed by Neon Auth)
target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    """Skip neon_auth schema objects — those are managed by Neon Auth."""
    if hasattr(object, "schema") and object.schema == "neon_auth":
        return False
    if hasattr(object, "table") and hasattr(object.table, "schema") and object.table.schema == "neon_auth":
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    import ssl

    connect_args = {}
    if "localhost" not in db_url and "127.0.0.1" not in db_url and not db_url.startswith("sqlite"):
        connect_args["ssl_context"] = ssl.create_default_context()

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
