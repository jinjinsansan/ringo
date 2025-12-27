#!/usr/bin/env python3
"""Backfill wishlist_items from existing users.wishlist_url values."""

from __future__ import annotations

import argparse
import asyncio
from typing import Iterable

from dotenv import load_dotenv

from app.main import (
    fetch_wishlist_snapshot,
    normalize_wishlist_url,
    supabase,
    upsert_wishlist_item,
)


load_dotenv()

BATCH_SIZE = 50


def fetch_users(offset: int, limit: int) -> list[dict[str, object]]:
    response = (
        supabase.table("users")
        .select("id,wishlist_url")
        .filter("wishlist_url", "not.is", "null")
        .order("created_at")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return response.data or []


def filter_missing(users: Iterable[dict[str, object]]) -> list[dict[str, object]]:
    user_ids = [user["id"] for user in users if user.get("id")]
    if not user_ids:
        return []
    existing = (
        supabase.table("wishlist_items")
        .select("user_id")
        .in_("user_id", user_ids)
        .execute()
    )
    existing_ids = {row["user_id"] for row in (existing.data or [])}
    return [user for user in users if user.get("id") not in existing_ids]


async def process_user(user: dict[str, object], *, dry_run: bool = False) -> bool:
    user_id = user["id"]
    raw_url = user.get("wishlist_url")
    if not isinstance(raw_url, str):
        return False
    try:
        normalized = normalize_wishlist_url(raw_url)
        metadata = await fetch_wishlist_snapshot(normalized)
    except Exception as exc:  # pragma: no cover - network/validation errors
        print(f"Skipping {user_id}: {exc}")
        return False

    price = metadata.get("price")
    if not isinstance(price, int):
        print(f"Skipping {user_id}: price not detected")
        return False
    if price < 3000 or price > 4000:
        print(f"Skipping {user_id}: price {price} out of range")
        return False

    if dry_run:
        print(f"Would upsert wishlist for {user_id}: {metadata.get('title')} (¥{price})")
        return True

    upsert_wishlist_item(user_id, metadata.get("title"), price, normalized)
    print(f"Upserted wishlist for {user_id}")
    return True


async def backfill_all(*, batch_size: int, dry_run: bool) -> None:
    offset = 0
    total_processed = 0
    total_upserted = 0

    while True:
        users = fetch_users(offset, batch_size)
        if not users:
            break
        missing = filter_missing(users)
        for user in missing:
            if await process_user(user, dry_run=dry_run):
                total_upserted += 1
            total_processed += 1
        offset += batch_size

    print(f"Processed {total_processed} users, upserted {total_upserted} entries.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill wishlist_items from users table")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="Number of users to fetch per batch")
    parser.add_argument("--dry-run", action="store_true", help="Only log actions without writing to Supabase")
    args = parser.parse_args()

    asyncio.run(backfill_all(batch_size=args.batch_size, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
