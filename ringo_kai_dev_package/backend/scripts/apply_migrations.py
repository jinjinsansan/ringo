#!/usr/bin/env python3
"""Apply SQL migrations in order to the Supabase Postgres database."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import psycopg

DEFAULT_MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "supabase" / "migrations"


def run_migrations(conn: psycopg.Connection, migrations_dir: Path, *, dry_run: bool = False) -> None:
    files = sorted(migrations_dir.glob("*.sql"))
    if not files:
        print(f"No SQL files found in {migrations_dir}")
        return

    for path in files:
        statement = path.read_text(encoding="utf-8").strip()
        if not statement:
            continue
        print(f"Applying {path.name}...")
        if dry_run:
            continue
        with conn.cursor() as cur:
            cur.execute(statement)
        conn.commit()
    print("Migrations complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply Supabase SQL migrations (requires SUPABASE_DB_URL)")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=os.environ.get("SUPABASE_DB_URL"),
        help="Postgres connection string for Supabase (defaults to SUPABASE_DB_URL)",
    )
    parser.add_argument(
        "--dir",
        dest="directory",
        type=Path,
        default=DEFAULT_MIGRATIONS_DIR,
        help="Directory containing .sql files",
    )
    parser.add_argument("--dry-run", action="store_true", help="List migrations without executing")
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("SUPABASE_DB_URL is required (or pass --database-url)")

    if not args.directory.exists():
        raise SystemExit(f"Migrations directory not found: {args.directory}")

    if args.dry_run:
        for path in sorted(args.directory.glob("*.sql")):
            print(path)
        return

    with psycopg.connect(args.database_url, autocommit=False) as conn:
        run_migrations(conn, args.directory)


if __name__ == "__main__":
    main()
