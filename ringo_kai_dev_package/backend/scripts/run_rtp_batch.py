#!/usr/bin/env python3
"""Trigger the FastAPI RTP batch endpoint."""

from __future__ import annotations

import argparse
import os

import httpx

DEFAULT_TIMEOUT = 15.0


def run_batch(base_url: str, timeout: float, token: str | None = None) -> None:
    endpoint = base_url.rstrip("/") + "/api/batch/update-rtp"
    headers = {}
    if token:
        headers["X-Cron-Token"] = token
    response = httpx.post(endpoint, headers=headers, timeout=timeout)
    response.raise_for_status()
    print(response.json())


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger the RTP batch endpoint")
    parser.add_argument("--base-url", default=os.environ.get("BACKEND_BASE_URL"), help="Backend base URL")
    parser.add_argument("--token", default=os.environ.get("BACKEND_CRON_TOKEN"), help="Optional header value for X-Cron-Token")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="Request timeout in seconds")
    args = parser.parse_args()

    if not args.base_url:
        raise SystemExit("Provide --base-url or set BACKEND_BASE_URL")

    run_batch(args.base_url, timeout=args.timeout, token=args.token)


if __name__ == "__main__":
    main()
