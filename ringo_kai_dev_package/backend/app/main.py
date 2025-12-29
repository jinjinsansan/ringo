"""FastAPI entrypoint for Ringo Kai backend."""

from __future__ import annotations

import json
import math
import os
import random
import string
import time
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
import re
from typing import Annotated, Any, Dict, Literal, Tuple
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import httpx
from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Ringo Kai <no-reply@ringo-kai.local>")
BOOTSTRAP_DAYS = int(os.environ.get("BOOTSTRAP_DAYS", "30"))
MIN_DYNAMIC_USERS = int(os.environ.get("MIN_DYNAMIC_USERS", "100"))
RTP_VARIANCE_THRESHOLD = float(os.environ.get("RTP_VARIANCE_THRESHOLD", "0.2"))


def _parse_launch_date(value: str | None) -> datetime:
    if not value:
        return datetime(2025, 1, 1, tzinfo=timezone.utc)
    candidate = value.strip()
    if candidate.endswith("Z"):
        candidate = candidate.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(candidate)
    except ValueError:
        return datetime(2025, 1, 1, tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


LAUNCH_DATE = _parse_launch_date(os.environ.get("LAUNCH_DATE"))

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
SCREENSHOT_BUCKET = os.environ.get("SCREENSHOT_BUCKET", "purchase-screenshots")
MAX_SCREENSHOT_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIMES = {"image/png", "image/jpeg"}
_bucket_ready = False
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY")

ENABLE_MOCK_WISHLIST_SEED = os.environ.get("ENABLE_MOCK_WISHLIST_SEED", "true").lower() in {"1", "true", "yes"}
MOCK_WISHLIST_URL = os.environ.get(
    "MOCK_WISHLIST_URL",
    "https://www.amazon.jp/hz/wishlist/ls/33U0W5W9VAU29?ref_=wl_share",
)
MOCK_WISHLIST_TITLE = os.environ.get("MOCK_WISHLIST_TITLE", "テスト用：欲しいものリスト")
MOCK_WISHLIST_PRICE = int(os.environ.get("MOCK_WISHLIST_PRICE", "3590"))
MOCK_TARGET_USER_ID = os.environ.get("MOCK_TARGET_USER_ID", "00000000-0000-0000-0000-000000000001")

WISHLIST_ALLOWED_HOSTS = {
    "amazon.co.jp",
    "www.amazon.co.jp",
    "amazon.com",
    "www.amazon.com",
    "amazon.jp",
    "www.amazon.jp",
}
WISHLIST_PATH_KEYWORDS = ("wishlist", "registry", "hz/wishlist", "gp/registry")
TITLE_PATTERN = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
PRICE_PATTERN = re.compile(r"[¥￥]\s?([0-9][0-9,]{2,})")
WISHLIST_ASIN_PATTERN = re.compile(r"href=\"/dp/([A-Z0-9]{10})(?:/|\?)", re.IGNORECASE)
WISHLIST_ASIN_TITLE_PATTERN = re.compile(
    r"href=\"/dp/([A-Z0-9]{10})(?:/|\?)[^\"]*\"[^>]*title=\"([^\"]+)\"",
    re.IGNORECASE,
)
WISHLIST_ITEM_PRICE_PATTERN = re.compile(
    r"id=\"itemPrice_[^\"]+\"[\s\S]{0,1200}?<span class=\"a-offscreen\">[¥￥]\s*([0-9][0-9,]{2,})",
    re.IGNORECASE,
)
WISHLIST_MOBILE_PRICE_PATTERN = re.compile(
    r"data-cy=\"price-recipe\"[\s\S]{0,1200}?<span class=\"a-offscreen\">[¥￥]\s*([0-9][0-9,]{2,})",
    re.IGNORECASE,
)
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
AMAZON_DESKTOP_HEADERS = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
}
AMAZON_MOBILE_HEADERS = {
    "User-Agent": MOBILE_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}
REFERRAL_THRESHOLDS = [3, 5, 10, 20, 30]
REFERRAL_CODE_ALPHABET = "".join(ch for ch in string.ascii_uppercase if ch not in {"I", "O"}) + "23456789"
REFERRAL_CODE_LENGTH = 8
ACTIVE_STATUS_FOR_METRICS = ("ready_to_draw", "active")
RTP_CACHE_TTL_SECONDS = 300
_rtp_cache: dict[str, float | datetime] | None = None

api = FastAPI(title="Ringo Kai API", version="0.2.0")
app = api

_frontend_origins_raw = os.environ.get("FRONTEND_ORIGINS")
frontend_origins = [origin.strip() for origin in (_frontend_origins_raw or "").split(",") if origin.strip()]

# Always allow the canonical frontend origins to avoid misconfiguration causing browser-level network failures.
for origin in ("http://localhost:3000", "https://ringokai.app", "https://www.ringokai.app"):
    if origin not in frontend_origins:
        frontend_origins.append(origin)

api.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@api.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Simple readiness probe so we can wire FastAPI quickly."""

    return {"status": "ok"}


@api.post("/api/batch/update-rtp", tags=["system"])
async def batch_update_rtp() -> dict[str, object]:
    invalidate_rtp_cache()
    total_obligation, total_available = fetch_purchase_balances()
    rtp = total_available / total_obligation if total_obligation else 1.0
    global _rtp_cache
    _rtp_cache = {"rtp": rtp, "timestamp": utc_now()}

    total_users = get_total_user_count()
    new_users = get_monthly_new_user_count()
    growth_rate = (new_users / total_users) if total_users else 0.0
    predicted_rtp = calculate_predictive_rtp(rtp, new_users, total_users)

    base = get_referral_probabilities(0)
    probabilities = adjust_probabilities_by_rtp(base, predicted_rtp)

    record_system_metrics(
        total_users=total_users,
        new_users=new_users,
        active_users=get_active_user_count(),
        total_obligation=total_obligation,
        total_available=total_available,
        current_rtp=rtp,
        predicted_rtp=predicted_rtp,
        growth_rate=growth_rate,
        probabilities=probabilities,
    )

    return {
        "rtp": rtp,
        "predicted_rtp": predicted_rtp,
        "growth_rate": growth_rate,
        "totals": {
            "users": total_users,
            "new_users_this_month": new_users,
            "purchase_obligation": total_obligation,
            "purchase_available": total_available,
        },
        "probabilities": probabilities,
    }


# ---------- Dependencies ----------


async def get_user_id(x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None) -> str:
    """Temporary auth placeholder until Supabase Auth is wired to FastAPI."""

    if not x_user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-User-Id header is required for this endpoint.")
    return x_user_id


async def get_optional_user_id(x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None) -> str | None:
    """Allow chatbot and other public endpoints to work without authentication."""

    return x_user_id


async def require_admin(x_admin_token: Annotated[str | None, Header(alias="X-Admin-Token")] = None) -> None:
    if not ADMIN_API_KEY:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "ADMIN_API_KEY is not configured")
    if not x_admin_token or x_admin_token != ADMIN_API_KEY:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid admin token")


# ---------- Models ----------


class StatusUpdateRequest(BaseModel):
    status: str = Field(pattern=r"^[a-z_]+$", description="Next status key")
    metadata: dict[str, str | int | float | None] | None = None


class DrawRequest(BaseModel):
    referral_count: int = 0


class AppleResponse(BaseModel):
    id: int
    apple_type: str
    draw_time: datetime
    reveal_time: datetime
    status: str


class ChatbotRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(min_length=1, max_length=500)
    status: str | None = None
    user_email: str | None = Field(default=None, alias="userEmail")


class ChatbotResponse(BaseModel):
    reply: str


class DashboardResponse(BaseModel):
    user: dict[str, object]
    apples: dict[str, int]
    stats: dict[str, object]


class PurchaseStartResponse(BaseModel):
    purchase_id: int
    alias: str
    item_name: str
    price: int
    wishlist_url: str


class PurchaseVerifyRequest(BaseModel):
    purchase_id: int
    screenshot_url: str | None = None
    note: str | None = None


class WishlistRegisterRequest(BaseModel):
    url: str = Field(min_length=10, max_length=2048, description="Amazon wishlist URL")


class ReferralClaimRequest(BaseModel):
    code: str = Field(min_length=4, max_length=16, description="Friend referral code")


class AdminVerificationUpdate(BaseModel):
    decision: Literal["approved", "rejected", "review_required"]
    note: str | None = None


class AdminUserUpdate(BaseModel):
    status: str | None = Field(default=None, alias="status")
    apple_draw_rights: int | None = Field(default=None, ge=0)
    purchase_obligation: int | None = Field(default=None, ge=0)
    purchase_available: int | None = Field(default=None, ge=0)
    referral_count: int | None = Field(default=None, ge=0)
    silver_gold_completed_count: int | None = Field(default=None, ge=0)


# ---------- Helpers ----------


BOOTSTRAP_PROBABILITY_TABLE = [
    {
        "max": 0,
        "values": {"bronze": 0.55, "silver": 0.20, "gold": 0.12, "red": 0.03, "poison": 0.10},
    },
    {
        "max": 1,
        "values": {"bronze": 0.52, "silver": 0.22, "gold": 0.14, "red": 0.04, "poison": 0.08},
    },
    {
        "max": 2,
        "values": {"bronze": 0.49, "silver": 0.24, "gold": 0.16, "red": 0.05, "poison": 0.06},
    },
    {
        "max": math.inf,
        "values": {"bronze": 0.46, "silver": 0.26, "gold": 0.18, "red": 0.06, "poison": 0.04},
    },
]


STRICT_REFERRAL_PROBABILITY_TABLE = [
    {
        "max": 0,
        "values": {"bronze": 0.60, "silver": 0.18, "gold": 0.10, "red": 0.02, "poison": 0.10},
    },
    {
        "max": 3,
        "values": {"bronze": 0.58, "silver": 0.18, "gold": 0.10, "red": 0.02, "poison": 0.12},
    },
    {
        "max": 5,
        "values": {"bronze": 0.56, "silver": 0.19, "gold": 0.11, "red": 0.03, "poison": 0.11},
    },
    {
        "max": 10,
        "values": {"bronze": 0.50, "silver": 0.22, "gold": 0.14, "red": 0.04, "poison": 0.10},
    },
    {
        "max": 20,
        "values": {"bronze": 0.45, "silver": 0.25, "gold": 0.17, "red": 0.05, "poison": 0.08},
    },
    {
        "max": math.inf,
        "values": {"bronze": 0.40, "silver": 0.28, "gold": 0.20, "red": 0.07, "poison": 0.05},
    },
]


def select_probability_row(referral_count: int, table: list[dict[str, object]]) -> Dict[str, float]:
    rc = max(referral_count, 0)
    for row in table:
        if rc <= row["max"]:
            return {**row["values"]}
    return {**table[-1]["values"]}


def get_bootstrap_probabilities(referral_count: int) -> Dict[str, float]:
    return select_probability_row(referral_count, BOOTSTRAP_PROBABILITY_TABLE)


def get_referral_probabilities(referral_count: int) -> Dict[str, float]:
    return select_probability_row(referral_count, STRICT_REFERRAL_PROBABILITY_TABLE)


def get_next_referral_threshold(referral_count: int) -> int | None:
    for threshold in (3, 5, 10, 20):
        if referral_count < threshold:
            return threshold
    return None


APPLE_REWARDS = {
    "bronze": {"purchase_obligation": 0, "purchase_available": 1},
    "silver": {"purchase_obligation": 0, "purchase_available": 2},
    "gold": {"purchase_obligation": 0, "purchase_available": 3},
    "red": {"purchase_obligation": 0, "purchase_available": 10},
    "poison": {"purchase_obligation": 0, "purchase_available": 0},
}



def utc_now() -> datetime:
    return datetime.now(timezone.utc)


STATUS_HINTS = {
    "guest": "ユーザーは未ログインです。まずは新規登録や利用規約案内をしてください。",
    "registered": "利用規約への同意を促し、terms ページへ進んでもらいます。",
    "terms_agreed": "チュートリアル完了とチェックリストの確認方法を案内してください。",
    "tutorial_completed": "購入対象の割り当てを待っている状態。Amazon購入とスクショ提出の手順を丁寧に説明。",
    "ready_to_purchase": "割り当てられたリストの商品購入とスクショ撮影の注意点を説明。",
    "verifying": "AI+管理者がスクショ確認中であること、待ち時間中にできることをガイド。",
    "first_purchase_completed": "自分の欲しいものリストを登録し、ready_to_draw までの残り作業を伝える。",
    "ready_to_draw": "24時間かけて開くりんごカードや友達紹介による確率アップを案内。",
    "active": "ダッシュボードや紹介機能、チケット消化のベストプラクティスを共有。",
}


CHATBOT_SYSTEM_PROMPT = """
あなたは「りんご会♪」の公式キャラクター「りんごちゃん」です。口調は柔らかく丁寧、語尾は優しく、絵文字を多用せずに 2〜4 文で端的に回答してください。
- ユーザーの現在ステータスに応じて、次のアクションや注意点を優先的に案内する
- スクリーンショットや購入内容などの個人情報を直接尋ねない
- 不明点が多い場合は、@support に連絡するよう案内する
- 動的RTPやりんご抽選のルールは仕様書通りに説明する
"""


STATUS_FALLBACK_RESPONSES = {
    "guest": "こんにちは♪ まずは新規登録して、利用規約へ進んでくださいね。",
    "registered": "利用規約ページで同意ボタンを押すと次に進めます。わからない所はなんでも聞いてください。",
    "terms_agreed": "使い方ページでチェックリストを終えたら、購入ステップへ進みましょう。",
    "tutorial_completed": "誰かの欲しいものリストが割り当たると通知されます。Amazonで購入したらスクショも忘れずに。",
    "ready_to_purchase": "割り当てられた商品を購入して、注文番号が写ったスクショを提出してください。",
    "verifying": "現在スクショを確認中です。通常は数時間で完了するので、少しだけ待っていてくださいね。",
    "first_purchase_completed": "おめでとう！ 次は自分の欲しいものリストURLを登録して、抽選の準備を整えましょう。",
    "ready_to_draw": "りんごを引いて24時間のワクワクを楽しんでください。友達紹介で確率もアップします。",
    "active": "ステータスはアクティブです。ダッシュボードからチケット状況や紹介実績をチェックしてみてください。",
}


def ensure_bucket() -> None:
    global _bucket_ready
    if _bucket_ready:
        return
    try:
        supabase.storage.create_bucket(SCREENSHOT_BUCKET, {"public": "true"})
    except Exception:
        # bucket already exists or insufficient permissions; proceed regardless
        pass
    _bucket_ready = True


async def save_screenshot(file: UploadFile, user_id: str, purchase_id: int) -> str:
    contents = await file.read()
    if len(contents) > MAX_SCREENSHOT_SIZE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ファイルサイズは10MB以下にしてください。")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIMES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "PNG または JPG 形式の画像をアップロードしてください。")

    ext = Path(file.filename or "screenshot.png").suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg"}:
        ext = ".png" if content_type == "image/png" else ".jpg"

    ensure_bucket()
    object_path = f"{user_id}/{purchase_id}-{int(time.time())}{ext}"
    supabase.storage.from_(SCREENSHOT_BUCKET).upload(
        object_path,
        contents,
        {
            "content-type": content_type,
            "upsert": "true",
        },
    )
    public_url = supabase.storage.from_(SCREENSHOT_BUCKET).get_public_url(object_path)
    return public_url.get("publicUrl") if isinstance(public_url, dict) else public_url


def generate_referral_code() -> str:
    return "".join(random.choices(REFERRAL_CODE_ALPHABET, k=REFERRAL_CODE_LENGTH))


def ensure_referral_code(user_id: str, existing_code: str | None) -> str:
    if existing_code:
        return existing_code

    for _ in range(10):
        candidate = generate_referral_code()
        existing = supabase.table("users").select("id").eq("referral_code", candidate).limit(1).execute()
        if existing.data:
            continue
        supabase.table("users").update({"referral_code": candidate, "updated_at": utc_now().isoformat()}).eq("id", user_id).execute()
        return candidate

    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "紹介コードの生成に失敗しました")


def build_anonymous_alias(user_id: str | None) -> str:
    if not user_id:
        return "りんごネーム #0000"
    suffix = re.sub(r"[^a-fA-F0-9]", "", user_id).upper() or "0000"
    return f"りんごネーム #{suffix[-4:]}"


def upsert_wishlist_item(user_id: str, title: str | None, price: int, url: str) -> None:
    payload = {
        "title": title or "Amazon欲しいもの",
        "price": price,
        "url": url,
        "updated_at": utc_now().isoformat(),
    }
    existing = (
        supabase.table("wishlist_items")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        supabase.table("wishlist_items").update(payload).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("wishlist_items").insert({**payload, "user_id": user_id, "created_at": utc_now().isoformat()}).execute()


def release_wishlist_assignment(purchase_id: int) -> None:
    supabase.table("wishlist_items").update({"assigned_purchase_id": None}).eq("assigned_purchase_id", purchase_id).execute()


def ensure_mock_target_user(exclude_user_id: str | None = None) -> None:
    if not ENABLE_MOCK_WISHLIST_SEED:
        return
    if exclude_user_id and exclude_user_id == MOCK_TARGET_USER_ID:
        return

    now = utc_now().isoformat()
    existing_user = supabase.table("users").select("id").eq("id", MOCK_TARGET_USER_ID).limit(1).execute()
    if existing_user.data:
        return

    supabase.table("users").insert(
        {
            "id": MOCK_TARGET_USER_ID,
            "email": "mock-target@ringo-kai.local",
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
    ).execute()


def ensure_mock_wishlist_item(exclude_user_id: str | None = None) -> None:
    if not ENABLE_MOCK_WISHLIST_SEED:
        return
    if exclude_user_id and exclude_user_id == MOCK_TARGET_USER_ID:
        return

    now = utc_now().isoformat()
    ensure_mock_target_user(exclude_user_id=exclude_user_id)

    existing_item = supabase.table("wishlist_items").select("id").eq("user_id", MOCK_TARGET_USER_ID).limit(1).execute()
    if existing_item.data:
        return

    try:
        normalized = normalize_wishlist_url(MOCK_WISHLIST_URL)
    except HTTPException:
        normalized = MOCK_WISHLIST_URL

    supabase.table("wishlist_items").insert(
        {
            "user_id": MOCK_TARGET_USER_ID,
            "title": MOCK_WISHLIST_TITLE,
            "price": MOCK_WISHLIST_PRICE,
            "url": normalized,
            "assigned_purchase_id": None,
            "created_at": now,
            "updated_at": now,
        }
    ).execute()


def create_mock_purchase(user_id: str) -> dict[str, object]:
    """Last-resort fallback when no wishlist items exist yet.

    We avoid relying on wishlist_items rows (and potential FK constraints on mock users)
    by creating a purchase that points to the configured mock wishlist URL.
    """

    try:
        normalized = normalize_wishlist_url(MOCK_WISHLIST_URL)
    except HTTPException:
        normalized = MOCK_WISHLIST_URL

    ensure_mock_target_user(exclude_user_id=user_id)

    purchase_insert = (
        supabase.table("purchases")
        .insert(
            {
                "purchaser_id": user_id,
                "target_user_id": MOCK_TARGET_USER_ID,
                "target_wishlist_url": normalized,
                "target_item_name": MOCK_WISHLIST_TITLE,
                "target_item_price": MOCK_WISHLIST_PRICE,
                "status": "pending",
            }
        )
        .execute()
    )
    if not purchase_insert.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "モック購入の作成に失敗しました")
    return purchase_insert.data[0]


def fetch_available_wishlist_items(user_id: str, limit: int = 20) -> list[dict[str, object]]:
    response = (
        supabase.table("wishlist_items")
        .select("id, user_id, title, price, url, assigned_purchase_id")
        .neq("user_id", user_id)
        .is_("assigned_purchase_id", None)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return response.data or []


def fetch_dashboard_snapshot(user_id: str) -> tuple[dict[str, object], dict[str, int]]:
    user_resp = (
        supabase.table("users")
        .select(
            "email,status,wishlist_url,wishlist_registered_at,purchase_obligation,purchase_available,"
            "referral_code,referral_count,silver_gold_completed_count"
        )
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    profile = user_resp.data
    referral_code = ensure_referral_code(user_id, profile.get("referral_code"))
    profile["referral_code"] = referral_code

    counts: dict[str, int] = {kind: 0 for kind in ["bronze", "silver", "gold", "red", "poison"]}
    start = 0
    page_size = 1000
    while True:
        response = (
            supabase.table("apples")
            .select("apple_type,status,is_revealed")
            .eq("user_id", user_id)
            .order("id")
            .range(start, start + page_size - 1)
            .execute()
        )
        rows = response.data or []
        for row in rows:
            status = row.get("status")
            is_revealed = bool(row.get("is_revealed"))
            if not is_revealed and (status is None or status == "pending"):
                continue
            apple_type = row.get("apple_type")
            if apple_type in counts:
                counts[apple_type] += 1
        if len(rows) < page_size:
            break
        start += page_size

    return profile, counts


def fetch_wishlist_assignments(purchase_ids: list[int]) -> dict[int, dict[str, object]]:
    if not purchase_ids:
        return {}
    response = (
        supabase.table("wishlist_items")
        .select("id,user_id,title,price,url,assigned_purchase_id,updated_at")
        .in_("assigned_purchase_id", purchase_ids)
        .execute()
    )
    mapping: dict[int, dict[str, object]] = {}
    for row in response.data or []:
        assigned_id = row.get("assigned_purchase_id")
        if isinstance(assigned_id, int):
            mapping[assigned_id] = row
    return mapping


async def seed_wishlist_items_from_users(limit: int = 50, exclude_user_id: str | None = None) -> int:
    query = (
        supabase.table("users")
        .select("id, wishlist_url")
        .filter("wishlist_url", "not.is", "null")
        .order("created_at")
        .limit(limit)
    )
    if exclude_user_id:
        query = query.neq("id", exclude_user_id)

    response = query.execute()
    seeded = 0
    for row in response.data or []:
        user_id = row.get("id")
        wishlist_url = row.get("wishlist_url")
        if not user_id or not wishlist_url:
            continue
        existing = (
            supabase.table("wishlist_items")
            .select("id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            continue
        try:
            normalized = normalize_wishlist_url(wishlist_url)
            metadata = await fetch_wishlist_snapshot(normalized)
        except HTTPException:
            continue
        price = metadata.get("price")
        if not isinstance(price, int):
            continue
        upsert_wishlist_item(user_id, metadata.get("title"), price, normalized)
        seeded += 1
    return seeded


async def send_resend_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    if not RESEND_API_KEY or not to_email:
        return
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    if text_body:
        payload["text"] = text_body

    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post("https://api.resend.com/emails", headers=headers, json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:  # pragma: no cover - best effort
        print(f"[Resend] Failed to send email: {exc}")


async def notify_purchase_status_email(
    to_email: str | None,
    decision: str,
    item_name: str | None,
    item_price: int | None,
    reason: str | None = None,
) -> None:
    if decision not in {"approved", "rejected"}:
        return
    if not to_email:
        return

    safe_item = escape(item_name) if item_name else "今回のアイテム"
    price_line = f"<li>価格: ¥{item_price:,}</li>" if item_price else ""
    reason_block = f"<p><strong>判定理由</strong>: {escape(reason)}</p>" if reason else ""

    if decision == "approved":
        subject = "【りんご会♪】購入の審査が完了しました"
        intro = "おめでとうございます！提出いただいたスクリーンショットの確認が完了し、購入が承認されました。"
        next_steps = "<p>アプリにログインして、欲しいものリストの登録とりんご抽選を進めてください。</p>"
    else:
        subject = "【りんご会♪】スクリーンショットの再提出をお願いします"
        intro = "残念ながら、今回のスクリーンショットでは購入内容を確認できませんでした。"
        next_steps = "<p>お手数ですが、注文番号や商品名が鮮明に写ったスクリーンショットを再度アップロードしてください。</p>"

    html_body = f"""
        <div>
            <p>{intro}</p>
            <ul>
                <li>対象: {safe_item}</li>
                {price_line}
            </ul>
            {reason_block}
            {next_steps}
            <p>りんご会♪ 運営チーム</p>
        </div>
    """
    text_body = "\n".join(
        (
            intro,
            f"対象: {item_name or '今回のアイテム'}",
            f"価格: ¥{item_price:,}" if item_price else "",
            f"判定理由: {reason}" if reason else "",
            "アプリにログインして次のステップに進んでください。" if decision == "approved" else "再度スクリーンショットを提出してください。",
        )
    ).strip()

    await send_resend_email(to_email, subject, html_body, text_body or None)


def build_thresholds(referral_count: int) -> list[dict[str, str | int]]:
    stages: list[dict[str, str | int]] = []
    first_pending_set = False
    for amount in REFERRAL_THRESHOLDS:
        if referral_count >= amount:
            status = "completed"
        elif not first_pending_set:
            status = "active"
            first_pending_set = True
        else:
            status = "locked"
        stages.append({"count": amount, "status": status})
    if not first_pending_set:
        # all completed
        stages = [{**stage, "status": "completed"} for stage in stages]
    return stages


def get_total_user_count() -> int:
    try:
        response = supabase.table("users").select("id", count="exact").limit(1).execute()
        if hasattr(response, "count") and response.count is not None:
            return int(response.count)
        return len(response.data or [])
    except Exception:
        return MIN_DYNAMIC_USERS


def get_active_user_count(statuses: tuple[str, ...] = ACTIVE_STATUS_FOR_METRICS) -> int:
    if not statuses:
        return 0
    try:
        response = (
            supabase.table("users")
            .select("id", count="exact")
            .in_("status", list(statuses))
            .execute()
        )
        if hasattr(response, "count") and response.count is not None:
            return int(response.count)
        return len(response.data or [])
    except Exception:
        return 0


def get_monthly_new_user_count(now: datetime | None = None) -> int:
    now = now or utc_now()
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    try:
        response = (
            supabase.table("users")
            .select("id", count="exact")
            .gte("created_at", start_of_month.isoformat())
            .execute()
        )
        if hasattr(response, "count") and response.count is not None:
            return int(response.count)
        return len(response.data or [])
    except Exception:
        return 0


def get_days_since_launch() -> int:
    return max((utc_now() - LAUNCH_DATE).days, 0)


def should_use_bootstrap_probabilities(days_since_launch: int, total_users: int, rtp: float) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if days_since_launch < BOOTSTRAP_DAYS:
        reasons.append(
            f"リリースから {days_since_launch} 日のため、安定期間({BOOTSTRAP_DAYS}日)を優先して固定確率を使用しています。"
        )
        return True, reasons
    if total_users < MIN_DYNAMIC_USERS:
        reasons.append(
            f"登録ユーザーが {total_users} 人のため、{MIN_DYNAMIC_USERS} 人に達するまでは固定確率で運用します。"
        )
        return True, reasons
    if rtp <= 0:
        return True, ["RTP が計算できなかったため暫定の固定確率を使用します。"]
    if abs(1 - rtp) > RTP_VARIANCE_THRESHOLD:
        reasons.append(
            f"RTP の変動幅が {abs(1 - rtp):.2f} と大きいため、一時的に固定確率へフォールバックしています。"
        )
        return True, reasons
    return False, reasons


def calculate_days_since_last_silver_gold(last_completed_at: str | datetime | None) -> int | None:
    if not last_completed_at:
        return None
    try:
        completed_at = parse_timestamp(last_completed_at)
    except Exception:
        return None
    delta = utc_now() - completed_at
    return max(delta.days, 0)


def apply_last_silver_gold_adjustment(probabilities: Dict[str, float], days_since: int | None) -> tuple[Dict[str, float], str | None]:
    if days_since is None:
        return probabilities, None

    adjustment: tuple[float, float, str] | None = None
    if days_since < 7:
        adjustment = (0.3, 0.3, "直近7日以内にシルバー/ゴールドを完了しているため、確率を大幅に抑制しています。")
    elif days_since < 14:
        adjustment = (0.5, 0.2, "直近14日以内にシルバー/ゴールドを完了しているため、確率を抑制しています。")
    elif days_since < 30:
        adjustment = (0.8, 0.1, "直近30日以内にシルバー/ゴールドを完了しているため、わずかに確率を調整しています。")

    if not adjustment:
        return probabilities, None

    factor, poison_delta, message = adjustment
    probabilities = probabilities.copy()
    probabilities["silver"] *= factor
    probabilities["gold"] *= factor
    probabilities["red"] *= factor
    probabilities["poison"] = max(probabilities.get("poison", 0) + poison_delta, 0.01)
    probabilities = normalize_probabilities(probabilities)

    return probabilities, message


def apply_completion_adjustment(probabilities: Dict[str, float], completion_count: int) -> tuple[Dict[str, float], str | None]:
    if completion_count <= 0:
        return probabilities, None

    adjustments = {
        1: (0.7, 0.15, "シルバー/ゴールドを1回完了しているため、次回の上位りんご確率を少し抑えています。"),
        2: (0.5, 0.25, "シルバー/ゴールドを2回完了しているため、確率を大きく抑えています。"),
    }
    factor, poison_delta, message = adjustments.get(
        completion_count,
        (0.3, 0.35, "シルバー/ゴールドを複数回完了しているため、しばらく確率を厳しくしています。"),
    )

    probabilities = probabilities.copy()
    probabilities["silver"] *= factor
    probabilities["gold"] *= factor
    probabilities["red"] *= factor
    probabilities["poison"] = max(probabilities.get("poison", 0) + poison_delta, 0.01)
    probabilities = normalize_probabilities(probabilities)

    return probabilities, message


def calculate_predictive_rtp(current_rtp: float, new_users: int, total_users: int) -> float:
    if total_users <= 0 or new_users <= 0:
        return current_rtp
    growth_rate = new_users / total_users
    if growth_rate <= 0:
        return current_rtp
    return current_rtp / (1.0 + growth_rate)


def calculate_probability_profile(user_row: dict, persist_rtp_snapshot: bool = False) -> tuple[Dict[str, float], list[str], dict[str, object]]:
    referral_count = user_row.get("referral_count") or 0
    completion_count = user_row.get("silver_gold_completed_count") or 0
    days_since_last = calculate_days_since_last_silver_gold(user_row.get("last_silver_gold_completed_at"))
    total_users = get_total_user_count()
    days_since_launch = get_days_since_launch()
    rtp = get_cached_rtp()
    new_users = get_monthly_new_user_count()
    growth_rate = new_users / total_users if total_users else 0.0
    predicted_rtp = calculate_predictive_rtp(rtp, new_users, total_users)

    use_bootstrap, bootstrap_reasons = should_use_bootstrap_probabilities(days_since_launch, total_users, rtp)
    probabilities = get_bootstrap_probabilities(referral_count) if use_bootstrap else get_referral_probabilities(referral_count)
    reasons = bootstrap_reasons.copy()

    next_threshold = get_next_referral_threshold(referral_count)
    if next_threshold is not None:
        reasons.append(f"紹介人数 {referral_count} 人。あと {next_threshold - referral_count} 人で次の確率テーブルに到達します。")
    else:
        reasons.append(f"紹介人数 {referral_count} 人で、最高ランクの確率テーブルを利用中です。")

    if not use_bootstrap:
        probabilities = adjust_probabilities_by_rtp(probabilities, rtp, persist=persist_rtp_snapshot)
        reasons.append(f"現在のRTP {rtp:.2f} に応じて確率を微調整しています。")
        if abs(predicted_rtp - rtp) > 0.02:
            probabilities = adjust_probabilities_by_rtp(probabilities, predicted_rtp, persist=False)
            reasons.append(
                f"今月の新規登録 {new_users} 人 (総数 {total_users} 人) を考慮し、予測RTP {predicted_rtp:.2f} に合わせて追加調整しています。"
            )
    else:
        reasons.append(
            f"今月の新規登録 {new_users} 人 (成長率 {growth_rate:.2%}) のため、安定期間終了後に動的RTPへ切り替わります。"
        )
        probabilities = normalize_probabilities(probabilities)

    probabilities, recency_reason = apply_last_silver_gold_adjustment(probabilities, days_since_last)
    if recency_reason:
        reasons.append(recency_reason)

    probabilities, completion_reason = apply_completion_adjustment(probabilities, completion_count)
    if completion_reason:
        reasons.append(completion_reason)

    probabilities = normalize_probabilities(probabilities)

    meta = {
        "referral_count": referral_count,
        "silver_gold_completed_count": completion_count,
        "days_since_last_silver_gold": days_since_last,
        "last_silver_gold_completed_at": user_row.get("last_silver_gold_completed_at"),
        "using_bootstrap": use_bootstrap,
        "rtp": rtp,
        "predicted_rtp": predicted_rtp,
        "growth_rate": growth_rate,
        "monthly_new_users": new_users,
        "total_users": total_users,
        "days_since_launch": days_since_launch,
        "next_referral_threshold": next_threshold,
    }

    return probabilities, reasons, meta


def fetch_user_emails(user_ids: set[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    response = (
        supabase.table("users")
        .select("id, email")
        .in_("id", list(user_ids))
        .execute()
    )
    return {row["id"]: row.get("email", "") for row in response.data or []}


def fetch_user_profiles(user_ids: set[str]) -> dict[str, dict[str, object]]:
    if not user_ids:
        return {}
    response = (
        supabase.table("users")
        .select("id,email,status,referral_code")
        .in_("id", list(user_ids))
        .execute()
    )
    profiles: dict[str, dict[str, object]] = {}
    for row in response.data or []:
        user_id = row.get("id")
        if not user_id:
            continue
        profiles[user_id] = {
            "id": user_id,
            "email": row.get("email"),
            "status": row.get("status"),
            "referral_code": row.get("referral_code"),
        }
    return profiles


def fetch_recent_apples_with_users(limit: int = 40) -> list[dict[str, object]]:
    response = (
        supabase.table("apples")
        .select(
            "id,user_id,apple_type,status,draw_time,reveal_time,is_revealed,purchase_available,purchase_obligation,purchase_id"
        )
        .order("draw_time", desc=True)
        .limit(limit)
        .execute()
    )
    rows = response.data or []
    user_ids = {row.get("user_id") for row in rows if row.get("user_id")}
    profiles = fetch_user_profiles(user_ids)

    enriched: list[dict[str, object]] = []
    for row in rows:
        user_id = row.get("user_id")
        payload = dict(row)
        payload["user"] = profiles.get(user_id, {"id": user_id})
        enriched.append(payload)
    return enriched


def count_field_values(table: str, field: str, order_field: str = "id", page_size: int = 1000) -> dict[str, int]:
    counts: dict[str, int] = {}
    start = 0
    select_clause = f"{field},{order_field}" if field != order_field else field
    while True:
        response = (
            supabase.table(table)
            .select(select_clause)
            .order(order_field)
            .range(start, start + page_size - 1)
            .execute()
        )
        rows = response.data or []
        for row in rows:
            key = row.get(field) or "unknown"
            counts[key] = counts.get(key, 0) + 1
        if len(rows) < page_size:
            break
        start += page_size
    return counts


def fetch_purchase_balances(page_size: int = 1000) -> Tuple[int, int]:
    total_obligation = 0
    total_available = 0
    start = 0

    while True:
        response = (
            supabase.table("users")
            .select("purchase_obligation, purchase_available")
            .order("id")
            .range(start, start + page_size - 1)
            .execute()
        )
        rows = response.data or []
        for row in rows:
            total_obligation += row.get("purchase_obligation") or 0
            total_available += row.get("purchase_available") or 0

        if len(rows) < page_size:
            break
        start += page_size

    return total_obligation, total_available


def record_system_metrics(
    *,
    total_users: int,
    new_users: int,
    active_users: int,
    total_obligation: int,
    total_available: int,
    current_rtp: float,
    predicted_rtp: float,
    growth_rate: float,
    probabilities: Dict[str, float],
    captured_at: datetime | None = None,
) -> None:
    payload = {
        "captured_at": (captured_at or utc_now()).isoformat(),
        "total_users": total_users,
        "new_users_this_month": new_users,
        "active_users": active_users,
        "total_purchase_obligation": total_obligation,
        "total_purchase_available": total_available,
        "current_rtp": current_rtp,
        "predicted_rtp": predicted_rtp,
        "growth_rate": growth_rate,
        "bronze_probability": probabilities.get("bronze", 0.0),
        "silver_probability": probabilities.get("silver", 0.0),
        "gold_probability": probabilities.get("gold", 0.0),
        "red_probability": probabilities.get("red", 0.0),
        "poison_probability": probabilities.get("poison", 0.0),
    }
    try:
        supabase.table("system_metrics").insert(payload).execute()
    except Exception as exc:  # pragma: no cover - metrics are best-effort
        print(f"[SystemMetrics] Failed to record snapshot: {exc}")


def fetch_recent_system_metrics(limit: int = 30) -> list[dict[str, object]]:
    try:
        response = (
            supabase.table("system_metrics")
            .select(
                "captured_at,total_users,new_users_this_month,active_users,total_purchase_obligation,total_purchase_available,"
                "current_rtp,predicted_rtp,growth_rate,bronze_probability,silver_probability,gold_probability,red_probability,poison_probability"
            )
            .order("captured_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception:
        return []


def get_latest_rtp_snapshot() -> dict[str, object] | None:
    try:
        response = (
            supabase.table("rtp_snapshots")
            .select("rtp, probabilities, captured_at")
            .order("captured_at", desc=True)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
    except Exception:
        return None
    return None


def get_dashboard_metrics() -> dict[str, object]:
    user_status_counts = count_field_values("users", "status")
    total_users = sum(user_status_counts.values())
    active_users = sum(user_status_counts.get(key, 0) for key in ("ready_to_draw", "active"))

    purchase_counts = count_field_values("purchases", "status")
    apple_counts = count_field_values("apples", "apple_type")

    rtp_value = get_cached_rtp()
    latest_snapshot = get_latest_rtp_snapshot()
    recent_apples = fetch_recent_apples_with_users(limit=40)

    return {
        "user_counts": {
            "total": total_users,
            "active": active_users,
            "status_breakdown": user_status_counts,
        },
        "purchase_counts": purchase_counts,
        "apple_counts": apple_counts,
        "rtp": rtp_value,
        "latest_snapshot": latest_snapshot,
        "recent_apples": recent_apples,
    }


def invalidate_rtp_cache() -> None:
    global _rtp_cache
    _rtp_cache = None


def get_cached_rtp() -> float:
    global _rtp_cache
    now = utc_now()
    if _rtp_cache:
        cached_at = _rtp_cache.get("timestamp")
        if isinstance(cached_at, datetime) and (now - cached_at).total_seconds() < RTP_CACHE_TTL_SECONDS:
            return float(_rtp_cache.get("rtp", 1.0))

    obligation, available = fetch_purchase_balances()
    rtp = available / obligation if obligation else 1.0
    _rtp_cache = {"rtp": rtp, "timestamp": now}
    return rtp


def normalize_probabilities(probabilities: Dict[str, float]) -> Dict[str, float]:
    total = sum(probabilities.values())
    if total <= 0:
        return {key: 1.0 / len(probabilities) for key in probabilities}
    return {key: max(value / total, 0.0) for key, value in probabilities.items()}


def persist_rtp_snapshot(rtp: float, probabilities: Dict[str, float], snapshot_time: datetime | None = None) -> None:
    snapshot_time = snapshot_time or utc_now()
    try:
        supabase.table("rtp_snapshots").insert(
            {
                "rtp": rtp,
                "probabilities": probabilities,
                "captured_at": snapshot_time.isoformat(),
            }
        ).execute()
    except Exception as exc:  # pragma: no cover - optional table
        print(f"[RTP] Failed to persist snapshot: {exc}")


def adjust_probabilities_by_rtp(base: Dict[str, float], rtp: float, *, persist: bool = True) -> Dict[str, float]:
    probabilities = base.copy()
    deviation = rtp - 1.0

    if deviation > 0.05:
        poison_delta = min(deviation * 0.5, 0.1)
        probabilities["poison"] = min(probabilities.get("poison", 0) + poison_delta, 0.5)
        probabilities["silver"] = max(probabilities.get("silver", 0) - poison_delta * 0.3, 0.01)
        probabilities["gold"] = max(probabilities.get("gold", 0) - poison_delta * 0.2, 0.01)
        probabilities["red"] = max(probabilities.get("red", 0) - poison_delta * 0.1, 0.005)
    elif deviation < -0.05:
        poison_delta = min(abs(deviation) * 0.5, 0.1)
        probabilities["poison"] = max(probabilities.get("poison", 0) - poison_delta, 0.01)
        probabilities["silver"] = min(probabilities.get("silver", 0) + poison_delta * 0.3, 0.4)
        probabilities["gold"] = min(probabilities.get("gold", 0) + poison_delta * 0.2, 0.3)
        probabilities["red"] = min(probabilities.get("red", 0) + poison_delta * 0.1, 0.15)

    normalized = normalize_probabilities(probabilities)
    if persist:
        persist_rtp_snapshot(rtp, normalized)
    return normalized


def parse_timestamp(value: str | datetime | None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    return utc_now()


def normalize_wishlist_url(raw_url: str) -> str:
    if not raw_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "URLを入力してください。")

    candidate = raw_url.strip()
    if not candidate.startswith(("http://", "https://")):
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)
    if not parsed.netloc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "有効なURL形式ではありません。")

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "http または https のURLを使用してください。")

    host = parsed.netloc.lower()
    if host not in WISHLIST_ALLOWED_HOSTS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amazonの欲しいものリストURLのみ登録できます。")

    path = parsed.path.lower()
    if not any(keyword in path for keyword in WISHLIST_PATH_KEYWORDS):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "欲しいものリストのURLを入力してください（wishlist/registry パスが必要です）。")

    normalized = parsed._replace(scheme="https")
    return normalized.geturl()


def extract_price_snapshot(html: str) -> int | None:
    candidates: list[int] = []
    for match in PRICE_PATTERN.finditer(html):
        digits = match.group(1).replace(",", "")
        try:
            candidates.append(int(digits))
        except ValueError:
            continue

    if not candidates:
        return None

    # Prefer values in the expected range so we don't accidentally pick shipping/other UI values.
    in_range = [value for value in candidates if 3000 <= value <= 4000]
    if in_range:
        return in_range[0]

    return candidates[0]


def extract_title(html: str) -> str | None:
    match = TITLE_PATTERN.search(html)
    if not match:
        return None
    title = match.group(1).strip()
    return re.sub(r"\s+", " ", title)


def _replace_host(url: str, new_host: str) -> str:
    parsed = urlparse(url)
    if not new_host or parsed.netloc == new_host:
        return url
    return urlunparse(parsed._replace(netloc=new_host))


def _ensure_query_params(url: str, updates: dict[str, str]) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    changed = False
    for key, value in updates.items():
        if query.get(key) != value:
            query[key] = value
            changed = True
    if not changed:
        return url
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


def _ensure_mobile_view(url: str) -> str:
    return _ensure_query_params(
        url,
        {
            "viewType": "mobile",
            "sort": "default",
            "language": "ja_JP",
        },
    )


def _looks_like_wishlist_html(html: str) -> bool:
    if not html:
        return False
    if WISHLIST_ASIN_PATTERN.search(html):
        return True
    if "itemPrice_" in html or "wl-list-item" in html or "g-items" in html:
        return True
    return False


def _is_robot_block(html: str) -> bool:
    if not html:
        return True
    lowered = html.lower()
    if "robot check" in lowered or "enter the characters you see below" in lowered:
        return True
    if "api-services-support@amazon.com" in lowered:
        return True
    return False


async def fetch_wishlist_html(url: str) -> str:
    parsed = urlparse(url)
    host_variants = [parsed.netloc]
    if parsed.netloc.endswith(".amazon.jp") and parsed.netloc != "www.amazon.co.jp":
        host_variants.append("www.amazon.co.jp")
    if parsed.netloc.endswith(".amazon.com") and parsed.netloc != "www.amazon.com":
        host_variants.append("www.amazon.com")

    variants: list[tuple[str, dict[str, str], str]] = []
    seen: set[str] = set()
    for host in host_variants:
        base = _replace_host(url, host)
        for label, transformer, headers in (
            ("desktop", lambda value: value, AMAZON_DESKTOP_HEADERS),
            ("mobile", _ensure_mobile_view, AMAZON_MOBILE_HEADERS),
        ):
            candidate = transformer(base)
            if candidate in seen:
                continue
            seen.add(candidate)
            variants.append((candidate, headers, f"{host or parsed.netloc}:{label}"))

    last_error = ""
    for candidate, headers, label in variants:
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers, follow_redirects=True) as client:
                response = await client.get(candidate)
        except httpx.HTTPError as exc:
            last_error = f"{label} fetch error: {exc}"
            continue

        if response.status_code >= 400:
            last_error = f"{label} HTTP {response.status_code}"
            continue

        html = response.text
        if _is_robot_block(html):
            last_error = f"{label} blocked by Amazon"
            continue

        if _looks_like_wishlist_html(html):
            return html
        last_error = f"{label} unexpected HTML structure"

    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        f"欲しいものリストを取得できませんでした。公開設定やURLをご確認ください。({last_error or 'unknown error'})",
    )


async def fetch_wishlist_snapshot(url: str) -> dict[str, str | int | None]:
    html = await fetch_wishlist_html(url)
    return {
        "title": extract_title(html),
        "price": extract_price_snapshot(html),
    }


def extract_wishlist_items_summary(html: str) -> dict[str, object]:
    """Extract wishlist item count and (when possible) a single target item's title/price.

    This is intentionally regex-based to avoid brittle DOM parsing and to work in server environments.
    """

    asins = list(dict.fromkeys(WISHLIST_ASIN_PATTERN.findall(html)))
    prices_raw: list[str] = []
    for pattern in (WISHLIST_ITEM_PRICE_PATTERN, WISHLIST_MOBILE_PRICE_PATTERN):
        prices_raw.extend(pattern.findall(html))
    prices = []
    for raw in prices_raw:
        try:
            prices.append(int(raw.replace(",", "")))
        except ValueError:
            continue

    item_count = max(len(asins), len(prices))

    title: str | None = None
    if len(asins) == 1:
        target_asin = asins[0]
        for asin, raw_title in WISHLIST_ASIN_TITLE_PATTERN.findall(html):
            if asin.upper() == target_asin.upper():
                title = re.sub(r"\s+", " ", raw_title).strip()
                break
    if not title:
        title = extract_title(html)

    price: int | None = None
    unique_prices = list(dict.fromkeys(prices))
    if not unique_prices:
        fallback_price = extract_price_snapshot(html)
        if isinstance(fallback_price, int):
            unique_prices = [fallback_price]
    unique_in_range = [p for p in unique_prices if 3000 <= p <= 4000]
    if item_count == 1:
        if len(unique_in_range) == 1:
            price = unique_in_range[0]
        elif len(unique_prices) == 1:
            # Still return the price so we can show an out-of-range error.
            price = unique_prices[0]
        else:
            price = None
    else:
        # For multi-item lists we only care about count; returning a price would be misleading.
        price = None

    return {
        "item_count": item_count,
        "title": title,
        "price": price,
        "asins": asins,
        "prices": unique_prices,
    }


def normalize_ocr_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    def coerce_price(value: Any) -> int | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            digits = re.sub(r"[^0-9]", "", value)
            if digits:
                try:
                    return int(digits)
                except ValueError:
                    return None
        return None

    def parse_bool_flag(value: Any) -> bool | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(int(value))
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"true", "1", "yes", "y"}:
                return True
            if lowered in {"false", "0", "no", "n"}:
                return False
        return None

    item_name = snapshot.get("item_name") or snapshot.get("product") or snapshot.get("detected_item")
    order_id = snapshot.get("order_id") or snapshot.get("orderNumber") or snapshot.get("order")
    price = coerce_price(snapshot.get("price") or snapshot.get("detected_price"))
    confidence_raw = snapshot.get("confidence") or snapshot.get("score")
    try:
        confidence = float(confidence_raw)
    except (TypeError, ValueError):
        confidence = None

    matched_name = parse_bool_flag(snapshot.get("matched_name"))
    matched_price = parse_bool_flag(snapshot.get("matched_price"))

    return {
        "item_name": item_name,
        "order_id": order_id,
        "price": price,
        "confidence": confidence,
        "matched_name": matched_name,
        "matched_price": matched_price,
    }


def interpret_verification_response(raw: str) -> tuple[str, str, dict[str, Any] | None, dict[str, Any] | None]:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        payload = {}

    decision = str(payload.get("decision", "review")).lower()
    reason = payload.get("reason") or payload.get("message") or raw

    ocr_snapshot = None
    raw_ocr = payload.get("ocr") if isinstance(payload, dict) else None
    if isinstance(raw_ocr, dict):
        ocr_snapshot = normalize_ocr_snapshot(raw_ocr)

    metadata: dict[str, Any] | None = None
    if isinstance(payload, dict):
        filtered = {key: value for key, value in payload.items() if key not in {"ocr", "reason", "message"}}
        metadata = filtered or None

    if "approve" in decision:
        return "approved", reason, ocr_snapshot, metadata
    if "reject" in decision:
        return "rejected", reason, ocr_snapshot, metadata
    return "review_required", reason, ocr_snapshot, metadata


def run_screenshot_verification(
    screenshot_url: str,
    item_name: str,
    price: int,
) -> tuple[str, str, dict[str, Any] | None, dict[str, Any] | None]:
    metadata: dict[str, Any] = {
        "model": "gpt-4o-mini",
        "evaluated_at": utc_now().isoformat(),
        "target_item": item_name,
        "target_price": price,
    }

    if not openai_client:
        metadata["skipped"] = True
        return "review_required", "OpenAI未設定のため自動審査をスキップしました", None, metadata

    prompt = (
        "以下のスクリーンショットがAmazon購入完了画面で、対象商品が"
        f"{item_name} であり、価格が概ね ¥{price} であるかを判定してください。"
        "必ず JSON で回答し、形式は {\"decision\": \"APPROVED|REVIEW|REJECT\", \"reason\": \"...\", \"ocr\": {\"item_name\": string, \"price\": number, \"order_id\": string, \"confidence\": number, \"matched_name\": boolean, \"matched_price\": boolean}} とします。"
        "余計な文章は含めないでください。"
    )

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict validator for Amazon purchase receipts. Respond only with the JSON schema provided.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": screenshot_url}},
                    ],
                },
            ],
        )
        content = response.choices[0].message.content or ""
    except Exception as exc:  # pragma: no cover - network failure
        print(f"[PurchaseVerify] OpenAI error: {exc}")
        metadata["error"] = str(exc)
        return "review_required", "OpenAI API エラーのため手動確認が必要です", None, metadata

    decision, reason, ocr_snapshot, raw_metadata = interpret_verification_response(content)
    if raw_metadata:
        metadata["llm"] = raw_metadata

    return decision, reason, ocr_snapshot, metadata


def build_chatbot_messages(payload: ChatbotRequest, user_id: str | None) -> list[dict[str, str]]:
    status = payload.status or "guest"
    status_hint = STATUS_HINTS.get(status, STATUS_HINTS["guest"])
    context_lines = [
        f"User ID: {user_id or 'guest'}",
        f"Status: {status}",
        f"Status Hint: {status_hint}",
        f"Email: {payload.user_email or '不明'}",
    ]
    user_message = "\n".join(context_lines + ["---", payload.message.strip()])
    return [
        {"role": "system", "content": CHATBOT_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


def extract_chatbot_reply(choice) -> str:
    message = getattr(choice, "message", None)
    if message is None:
        return ""
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                text_parts.append(str(block.get("text", "")))
            else:
                text_parts.append(str(block))
        return "".join(text_parts).strip()
    return str(content).strip()


def fallback_chatbot_reply(status: str | None) -> str:
    return STATUS_FALLBACK_RESPONSES.get(status or "guest", STATUS_FALLBACK_RESPONSES["guest"])


# ---------- Endpoints ----------


@api.post("/api/user/status", tags=["user"])
async def update_status(payload: StatusUpdateRequest, user_id: str = Depends(get_user_id)) -> dict[str, str]:
    response = (
        supabase.table("users")
        .update({"status": payload.status, **(payload.metadata or {}), "updated_at": utc_now().isoformat()})
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    return {"status": payload.status}


@api.get("/api/apple/current", response_model=AppleResponse | None, tags=["apple"])
async def get_current_apple(user_id: str = Depends(get_user_id)):
    response = (
        supabase.table("apples")
        .select("id, apple_type, draw_time, reveal_time, status")
        .eq("user_id", user_id)
        .order("draw_time", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    row = response.data[0]
    return {
        "id": row["id"],
        "apple_type": row["apple_type"],
        "draw_time": row["draw_time"],
        "reveal_time": row["reveal_time"],
        "status": row["status"],
    }


@api.get("/api/apple/probabilities", tags=["apple"])
async def get_personalized_probabilities(user_id: str = Depends(get_user_id)):
    user_resp = (
        supabase.table("users")
        .select(
            "referral_count, silver_gold_completed_count, last_silver_gold_completed_at,"
            "apple_draw_rights, purchase_obligation, purchase_available"
        )
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    probabilities, reasons, meta = calculate_probability_profile(user_resp.data, persist_rtp_snapshot=False)
    return {
        "probabilities": probabilities,
        "reasons": reasons,
        "meta": meta,
    }


@api.post("/api/apple/draw", response_model=AppleResponse, tags=["apple"])
async def draw_apple(payload: DrawRequest, user_id: str = Depends(get_user_id)):
    user_resp = (
        supabase.table("users")
        .select(
            "apple_draw_rights, referral_count, purchase_obligation, purchase_available,"
            "silver_gold_completed_count, last_silver_gold_completed_at"
        )
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    data = user_resp.data
    draw_rights = data.get("apple_draw_rights") or 0
    referral_count = data.get("referral_count") or payload.referral_count

    if draw_rights <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "りんご抽選権がありません")

    data["referral_count"] = referral_count
    probabilities, _, _ = calculate_probability_profile(data, persist_rtp_snapshot=True)
    items = list(probabilities.items())
    apples, weights = zip(*items)
    apple_type = random.choices(apples, weights=weights, k=1)[0]
    reward = APPLE_REWARDS[apple_type]
    draw_time = utc_now()
    reveal_time = draw_time + timedelta(hours=24)

    purchase_query = (
        supabase.table("purchases")
        .select("id, status")
        .eq("purchaser_id", user_id)
        .in_("status", ["submitted", "approved"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not purchase_query.data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "承認済みの購入が必要です")
    purchase_id = purchase_query.data[0]["id"]

    insert_resp = (
        supabase.table("apples")
        .insert(
            {
                "user_id": user_id,
                "apple_type": apple_type,
                "purchase_id": purchase_id,
                "purchase_obligation": reward["purchase_obligation"],
                "purchase_available": reward["purchase_available"],
                "draw_time": draw_time.isoformat(),
                "reveal_time": reveal_time.isoformat(),
                "status": "pending",
            }
        )
        .execute()
    )

    if not insert_resp.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "りんご生成に失敗しました")

    updated_user = {
        "apple_draw_rights": draw_rights - 1,
        "purchase_available": (data.get("purchase_available") or 0) + reward["purchase_available"],
        "updated_at": draw_time.isoformat(),
    }
    supabase.table("users").update(updated_user).eq("id", user_id).execute()
    invalidate_rtp_cache()

    apple_row = insert_resp.data[0]
    return {
        "id": apple_row["id"],
        "apple_type": apple_row["apple_type"],
        "draw_time": apple_row["draw_time"],
        "reveal_time": apple_row["reveal_time"],
        "status": apple_row["status"],
    }


@api.get("/api/apple/result/{apple_id}", tags=["apple"])
async def get_apple_result(apple_id: int, user_id: str = Depends(get_user_id)):
    apple_resp = (
        supabase.table("apples")
        .select("id, user_id, apple_type, draw_time, reveal_time, status, is_revealed, purchase_available, purchase_obligation")
        .eq("id", apple_id)
        .single()
        .execute()
    )
    if not apple_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "りんごが見つかりません")
    if apple_resp.data["user_id"] != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "他のユーザーのりんごです")

    row = apple_resp.data
    now = utc_now()
    reveal_time = parse_timestamp(row.get("reveal_time"))
    if reveal_time and now >= reveal_time and row.get("status") == "pending":
        update_resp = (
            supabase.table("apples")
            .update({"status": "revealed", "is_revealed": True, "updated_at": now.isoformat()})
            .eq("id", apple_id)
            .execute()
        )
        if update_resp.data:
            row = update_resp.data[0]

    return {
        "id": row["id"],
        "apple_type": row["apple_type"],
        "draw_time": row["draw_time"],
        "reveal_time": row["reveal_time"],
        "status": row["status"],
        "is_revealed": row.get("is_revealed", False) or now >= reveal_time,
        "purchase_available": row.get("purchase_available", 0),
        "purchase_obligation": row.get("purchase_obligation", 0),
    }


@api.post("/api/apple/consume/{apple_id}", tags=["apple"])
async def consume_ticket(apple_id: int, user_id: str = Depends(get_user_id)):
    apple_resp = (
        supabase.table("apples")
        .select("id, user_id, apple_type, purchase_available, reveal_time, status")
        .eq("id", apple_id)
        .single()
        .execute()
    )
    if not apple_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "りんごが見つかりません")
    if apple_resp.data["user_id"] != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "他のユーザーのりんごです")

    apple_row = apple_resp.data
    if apple_row["apple_type"] not in {"silver", "gold", "red"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "このりんごは購入免除チケットを持っていません")
    if apple_row.get("purchase_available", 0) <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "使用可能なチケットがありません")

    now = utc_now()
    reveal_time = parse_timestamp(apple_row.get("reveal_time"))
    if now < reveal_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "24時間の公開が完了するまでお待ちください")

    new_available = apple_row["purchase_available"] - 1
    apple_updates: dict[str, object] = {"purchase_available": new_available, "updated_at": now.isoformat()}
    if new_available == 0:
        apple_updates["is_consumed"] = True
        if apple_row.get("status") in {"pending", "revealed"}:
            apple_updates["status"] = "consumed"

    supabase.table("apples").update(apple_updates).eq("id", apple_id).execute()

    user_resp = (
        supabase.table("users")
        .select("purchase_available, purchase_obligation, referral_count, silver_gold_completed_count")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    current_user_available = user_resp.data.get("purchase_available") or 0
    user_updates: dict[str, object] = {
        "purchase_available": max(current_user_available - 1, 0),
        "updated_at": now.isoformat(),
    }

    if apple_row["apple_type"] in {"silver", "gold"} and new_available == 0:
        user_updates["referral_count"] = 0
        user_updates["silver_gold_completed_count"] = (user_resp.data.get("silver_gold_completed_count") or 0) + 1
        user_updates["last_silver_gold_completed_at"] = now.isoformat()

    supabase.table("users").update(user_updates).eq("id", user_id).execute()
    invalidate_rtp_cache()

    return {"purchase_available": new_available}


@api.post("/api/purchase/start", response_model=PurchaseStartResponse, tags=["purchase"])
async def start_purchase(user_id: str = Depends(get_user_id)):
    profile = (
        supabase.table("users")
        .select("status, email, purchase_obligation")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if profile.data.get("status") not in {"tutorial_completed", "ready_to_purchase"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "このステップにはまだ進めません")

    current_obligation = int(profile.data.get("purchase_obligation") or 0)

    existing_purchase = (
        supabase.table("purchases")
        .select("id, target_user_id, target_item_name, target_item_price, target_wishlist_url, status")
        .eq("purchaser_id", user_id)
        .in_("status", ["pending", "submitted"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if existing_purchase.data:
        purchase = existing_purchase.data[0]
        return {
            "purchase_id": purchase["id"],
            "alias": build_anonymous_alias(purchase.get("target_user_id")),
            "item_name": purchase.get("target_item_name") or "Amazon 欲しいもの",
            "price": int(purchase.get("target_item_price") or 0),
            "wishlist_url": purchase.get("target_wishlist_url") or "",
        }

    items = fetch_available_wishlist_items(user_id, limit=20)
    if not items:
        await seed_wishlist_items_from_users(limit=50, exclude_user_id=user_id)
        items = fetch_available_wishlist_items(user_id, limit=20)
    if not items:
        ensure_mock_wishlist_item(exclude_user_id=user_id)
        items = fetch_available_wishlist_items(user_id, limit=20)
    if not items:
        if not ENABLE_MOCK_WISHLIST_SEED:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "現在割り当て可能な欲しいものリストがありません。少し待ってから再試行してください。")

        purchase = create_mock_purchase(user_id)
        new_obligation = current_obligation + 1
        supabase.table("users").update({
            "status": "ready_to_purchase",
            "purchase_obligation": new_obligation,
            "updated_at": utc_now().isoformat(),
        }).eq("id", user_id).execute()
        return {
            "purchase_id": purchase["id"],
            "alias": build_anonymous_alias(purchase.get("target_user_id")),
            "item_name": purchase.get("target_item_name") or MOCK_WISHLIST_TITLE,
            "price": int(purchase.get("target_item_price") or MOCK_WISHLIST_PRICE),
            "wishlist_url": purchase.get("target_wishlist_url") or MOCK_WISHLIST_URL,
        }

    selected_item: dict[str, object] | None = None
    purchase: dict[str, object] | None = None

    for item in items:
        item_price = int(item.get("price") or 0)
        purchase_insert = (
            supabase.table("purchases")
            .insert(
                {
                    "purchaser_id": user_id,
                    "target_user_id": item["user_id"],
                    "target_wishlist_url": item["url"],
                    "target_item_name": item.get("title") or "Amazon 欲しいもの",
                    "target_item_price": item_price,
                    "status": "pending",
                }
            )
            .execute()
        )

        if not purchase_insert.data:
            continue

        purchase_candidate = purchase_insert.data[0]
        claim = (
            supabase.table("wishlist_items")
            .update({"assigned_purchase_id": purchase_candidate["id"]})
            .eq("id", item["id"])
            .is_("assigned_purchase_id", None)
            .execute()
        )

        if claim.data:
            selected_item = item
            purchase = purchase_candidate
            break

        supabase.table("purchases").delete().eq("id", purchase_candidate["id"]).execute()

    if not selected_item or not purchase:
        raise HTTPException(status.HTTP_409_CONFLICT, "他のユーザーが同じリストを取得したため、再試行してください。")

    new_obligation = current_obligation + 1
    supabase.table("users").update({
        "status": "ready_to_purchase",
        "purchase_obligation": new_obligation,
        "updated_at": utc_now().isoformat(),
    }).eq("id", user_id).execute()

    return {
        "purchase_id": purchase["id"],
        "alias": build_anonymous_alias(selected_item.get("user_id")),
        "item_name": selected_item.get("title") or "Amazon 欲しいもの",
        "price": int(selected_item.get("price") or 0),
        "wishlist_url": selected_item.get("url") or "",
    }


@api.get("/api/purchase/current", tags=["purchase"])
async def get_current_purchase(user_id: str = Depends(get_user_id)):
    response = (
        supabase.table("purchases")
        .select("id, target_user_id, target_item_name, target_item_price, target_wishlist_url, status, screenshot_url")
        .eq("purchaser_id", user_id)
        .in_("status", ["pending", "submitted"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "提出待ちの購入が見つかりません")

    purchase = response.data[0]

    return {
        "purchase_id": purchase["id"],
        "alias": build_anonymous_alias(purchase.get("target_user_id")),
        "item_name": purchase["target_item_name"],
        "price": purchase.get("target_item_price", 0),
        "wishlist_url": purchase["target_wishlist_url"],
        "status": purchase["status"],
        "screenshot_url": purchase.get("screenshot_url"),
    }


@api.post("/api/purchase/upload", tags=["purchase"])
async def upload_purchase_screenshot(
    purchase_id: int = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id),
):
    purchase = (
        supabase.table("purchases")
        .select("id, purchaser_id, status")
        .eq("id", purchase_id)
        .single()
        .execute()
    )
    if not purchase.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")
    if purchase.data["purchaser_id"] != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "別のユーザーの購入です")
    if purchase.data["status"] not in {"pending", "submitted"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "この購入は提出済みです")

    screenshot_url = await save_screenshot(file, user_id, purchase_id)

    supabase.table("purchases").update({"screenshot_url": screenshot_url}).eq("id", purchase_id).execute()

    return {"screenshot_url": screenshot_url}


@api.post("/api/purchase/verify", tags=["purchase"])
async def submit_purchase(payload: PurchaseVerifyRequest, user_id: str = Depends(get_user_id)):
    purchase_resp = (
        supabase.table("purchases")
        .select("id, purchaser_id, status, target_item_name, target_item_price, screenshot_url")
        .eq("id", payload.purchase_id)
        .single()
        .execute()
    )
    if not purchase_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")
    if purchase_resp.data.get("purchaser_id") != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "別のユーザーの購入です")

    screenshot_url = payload.screenshot_url or purchase_resp.data.get("screenshot_url")
    if not screenshot_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "スクリーンショットのアップロードが必要です")

    (
        verification_status,
        verification_reason,
        ocr_snapshot,
        verification_metadata,
    ) = run_screenshot_verification(
        screenshot_url,
        purchase_resp.data.get("target_item_name", ""),
        purchase_resp.data.get("target_item_price", 0) or 0,
    )

    purchase_update = {
        "status": "submitted",
        "screenshot_url": screenshot_url,
        "admin_notes": payload.note,
        "verification_status": verification_status,
        "verification_result": verification_reason,
        "verified_at": utc_now().isoformat() if verification_status == "approved" else None,
    }
    if ocr_snapshot:
        purchase_update["ocr_snapshot"] = ocr_snapshot
    if verification_metadata:
        purchase_update["verification_metadata"] = verification_metadata
    supabase.table("purchases").update(purchase_update).eq("id", payload.purchase_id).execute()

    user_snapshot = (
        supabase.table("users")
        .select("email, apple_draw_rights, purchase_obligation")
        .eq("id", user_id)
        .single()
        .execute()
    )
    current_rights = 0
    user_email = None
    if user_snapshot.data:
        current_rights = user_snapshot.data.get("apple_draw_rights") or 0
        user_email = user_snapshot.data.get("email")

    next_status = "first_purchase_completed" if verification_status == "approved" else "verifying"
    user_update: dict[str, str | int] = {"status": next_status, "updated_at": utc_now().isoformat()}
    if verification_status == "approved":
        user_update["apple_draw_rights"] = current_rights + 1
        current_obligation = (user_snapshot.data or {}).get("purchase_obligation") or 0
        user_update["purchase_obligation"] = max(current_obligation - 1, 0)

    supabase.table("users").update(user_update).eq("id", user_id).execute()
    invalidate_rtp_cache()

    if verification_status == "rejected":
        release_wishlist_assignment(payload.purchase_id)

    if verification_status in {"approved", "rejected"}:
        await notify_purchase_status_email(
            user_email,
            verification_status,
            purchase_resp.data.get("target_item_name"),
            purchase_resp.data.get("target_item_price"),
            verification_reason,
        )

    return {"status": verification_status, "message": verification_reason}


@api.post("/api/wishlist/register", tags=["wishlist"])
async def register_wishlist(payload: WishlistRegisterRequest, user_id: str = Depends(get_user_id)):
    profile = (
        supabase.table("users")
        .select("status, wishlist_url, apple_draw_rights")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    user_data = profile.data
    if user_data.get("status") != "first_purchase_completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "購入承認が完了した後にリストを登録できます。")
    if user_data.get("wishlist_url"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "欲しいものリストは既に登録済みです。")

    normalized_url = normalize_wishlist_url(payload.url)

    html = await fetch_wishlist_html(normalized_url)
    summary = extract_wishlist_items_summary(html)
    item_count = int(summary.get("item_count") or 0)
    title = summary.get("title") if isinstance(summary.get("title"), str) else None
    price = summary.get("price") if isinstance(summary.get("price"), int) else None

    if item_count <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "欲しいものリストを判定できませんでした。公開設定にして、希望商品を1つだけ入れた状態で再度お試しください。")

    if item_count >= 2:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "欲しいものリストに商品が2つ以上入っています。判定に迷うので、リストには希望商品を1つにしてください。",
        )

    if price is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "商品の価格を判定できませんでした。公開設定にして、3000〜4000円の商品を1つだけ入れた状態で再度お試しください。")

    if price < 3000 or price > 4000:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"検出した価格が範囲外です (¥{price}). 3000円〜4000円の商品を1つだけ登録してください。",
        )

    if not title:
        title = "Amazon 欲しいものリスト"

    apple_rights = user_data.get("apple_draw_rights") or 0
    upsert_wishlist_item(user_id, title, price, normalized_url)
    update_resp = (
        supabase.table("users")
        .update(
            {
                "wishlist_url": normalized_url,
                "wishlist_registered_at": utc_now().isoformat(),
                "status": "ready_to_draw",
                "apple_draw_rights": max(apple_rights, 1),
                "updated_at": utc_now().isoformat(),
            }
        )
        .eq("id", user_id)
        .execute()
    )

    if not update_resp.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "欲しいものリストの登録に失敗しました")

    return {
        "status": "ready_to_draw",
        "price": price,
        "title": title,
        "wishlist_url": normalized_url,
    }


@api.get("/api/referral/summary", tags=["referral"])
async def referral_summary(user_id: str = Depends(get_user_id)):
    user_resp = (
        supabase.table("users")
        .select("referral_code, referral_count, referred_by")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    user_data = user_resp.data
    referral_count = user_data.get("referral_count") or 0
    code = ensure_referral_code(user_id, user_data.get("referral_code"))
    thresholds = build_thresholds(referral_count)
    next_threshold = next((value for value in REFERRAL_THRESHOLDS if referral_count < value), None)
    progress_percent = 100.0 if not next_threshold else round(min(referral_count / next_threshold, 1.0) * 100, 2)

    return {
        "referral_code": code,
        "referral_count": referral_count,
        "thresholds": thresholds,
        "next_threshold": next_threshold,
        "progress_percent": progress_percent,
        "can_claim_code": user_data.get("referred_by") is None,
        "referred_by": user_data.get("referred_by"),
    }


@api.post("/api/referral/claim", tags=["referral"])
async def claim_referral(payload: ReferralClaimRequest, user_id: str = Depends(get_user_id)):
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "紹介コードを入力してください")

    user_resp = (
        supabase.table("users")
        .select("referred_by")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user_resp.data.get("referred_by"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "紹介コードは1回のみ利用できます")

    referrer_resp = (
        supabase.table("users")
        .select("id, referral_count")
        .eq("referral_code", code)
        .single()
        .execute()
    )
    if not referrer_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "紹介コードが見つかりません")

    referrer_id = referrer_resp.data["id"]
    if referrer_id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "自分のコードは使用できません")

    current_referral_count = referrer_resp.data.get("referral_count") or 0
    supabase.table("users").update({"referred_by": referrer_id, "updated_at": utc_now().isoformat()}).eq("id", user_id).execute()
    supabase.table("users").update({"referral_count": current_referral_count + 1, "updated_at": utc_now().isoformat()}).eq("id", referrer_id).execute()

    try:
        supabase.table("referrals").insert({"referrer_id": referrer_id, "referred_id": user_id}).execute()
    except Exception:
        # best effort logging
        pass

    return {"status": "ok"}


@api.get("/api/admin/verifications", tags=["admin"])
async def admin_list_verifications(_: None = Depends(require_admin)):
    response = (
        supabase.table("purchases")
        .select(
            "id, purchaser_id, target_user_id, status, verification_status, verification_result, screenshot_url, admin_notes, created_at,"
            " verified_at, target_item_name, target_item_price, target_wishlist_url, ocr_snapshot, verification_metadata"
        )
        .in_("status", ["submitted", "review_required"])
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )
    rows = response.data or []
    purchase_ids = [row["id"] for row in rows if isinstance(row.get("id"), int)]
    wishlist_map = fetch_wishlist_assignments(purchase_ids)

    user_ids: set[str] = set()
    for row in rows:
        purchaser_id = row.get("purchaser_id")
        target_user_id = row.get("target_user_id")
        if isinstance(purchaser_id, str):
            user_ids.add(purchaser_id)
        if isinstance(target_user_id, str):
            user_ids.add(target_user_id)
    for wishlist in wishlist_map.values():
        owner_id = wishlist.get("user_id")
        if isinstance(owner_id, str):
            user_ids.add(owner_id)

    emails = fetch_user_emails(user_ids)

    for row in rows:
        purchaser_id = row.get("purchaser_id")
        target_user_id = row.get("target_user_id")
        row["purchaser_email"] = emails.get(purchaser_id, "")
        row["target_user_email"] = emails.get(target_user_id, "")
        row["has_screenshot"] = bool(row.get("screenshot_url"))
        row["ocr_snapshot"] = row.get("ocr_snapshot") or None
        row["verification_metadata"] = row.get("verification_metadata") or None

        assignment = wishlist_map.get(row.get("id"))
        if assignment:
            owner_id = assignment.get("user_id")
            row["wishlist_assignment"] = {
                "id": assignment.get("id"),
                "title": assignment.get("title"),
                "price": assignment.get("price"),
                "url": assignment.get("url"),
                "owner_id": owner_id,
                "owner_email": emails.get(owner_id, ""),
                "assigned_at": assignment.get("updated_at"),
            }
        else:
            row["wishlist_assignment"] = None
    return rows


@api.post("/api/admin/verifications/{purchase_id}", tags=["admin"])
async def admin_update_verification(
    purchase_id: int,
    payload: AdminVerificationUpdate,
    _: None = Depends(require_admin),
):
    purchase_resp = (
        supabase.table("purchases")
        .select("id, purchaser_id, status, verification_status, screenshot_url, target_item_name, target_item_price")
        .eq("id", purchase_id)
        .single()
        .execute()
    )
    if not purchase_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found")

    purchase_data = purchase_resp.data
    purchaser_id = purchase_data.get("purchaser_id")
    if not purchaser_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "purchaser_id is missing")

    user_resp = (
        supabase.table("users")
        .select("email, apple_draw_rights, purchase_obligation")
        .eq("id", purchaser_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User profile not found")

    now = utc_now()
    decision = payload.decision
    purchase_update: dict[str, object] = {
        "admin_notes": payload.note,
        "verification_status": decision,
        "verification_result": payload.note or f"Manual decision: {decision}",
        "updated_at": now.isoformat(),
    }
    user_update: dict[str, object] = {"updated_at": now.isoformat()}
    invalidate_cache = False

    if decision == "approved":
        purchase_update["status"] = "approved"
        purchase_update["verified_at"] = now.isoformat()
        user_update["status"] = "first_purchase_completed"
        user_update["apple_draw_rights"] = (user_resp.data.get("apple_draw_rights") or 0) + 1
        user_update["purchase_obligation"] = max((user_resp.data.get("purchase_obligation") or 0) - 1, 0)
        invalidate_cache = True
    elif decision == "rejected":
        purchase_update["status"] = "rejected"
        user_update["status"] = "ready_to_purchase"
    else:  # review_required
        purchase_update["status"] = "review_required"
        user_update["status"] = "verifying"

    supabase.table("purchases").update(purchase_update).eq("id", purchase_id).execute()
    supabase.table("users").update(user_update).eq("id", purchaser_id).execute()
    if invalidate_cache:
        invalidate_rtp_cache()

    if decision == "rejected":
        release_wishlist_assignment(purchase_id)

    if decision in {"approved", "rejected"}:
        await notify_purchase_status_email(
            user_resp.data.get("email") if user_resp.data else None,
            decision,
            purchase_data.get("target_item_name"),
            purchase_data.get("target_item_price"),
            payload.note or purchase_update.get("verification_result"),
        )

    return {"status": decision}


@api.get("/api/admin/dashboard", tags=["admin"])
async def admin_dashboard(_: None = Depends(require_admin)):
    return get_dashboard_metrics()


@api.get("/api/dashboard", response_model=DashboardResponse, tags=["user"])
async def dashboard_snapshot(user_id: str = Depends(get_user_id)):
    profile, apples = fetch_dashboard_snapshot(user_id)
    stats = {
        "referral_count": profile.get("referral_count", 0),
        "purchase_obligation": profile.get("purchase_obligation", 0),
        "purchase_available": profile.get("purchase_available", 0),
        "silver_gold_completed_count": profile.get("silver_gold_completed_count", 0),
        "purchase_pending": bool(
            supabase.table("purchases")
            .select("id")
            .eq("purchaser_id", user_id)
            .in_("status", ["pending", "submitted"])
            .limit(1)
            .execute()
            .data
        ),
    }
    return {
        "user": {
            "email": profile.get("email"),
            "status": profile.get("status"),
            "wishlist_url": profile.get("wishlist_url"),
            "wishlist_registered_at": profile.get("wishlist_registered_at"),
            "referral_code": profile.get("referral_code"),
        },
        "apples": apples,
        "stats": stats,
    }


@api.get("/api/admin/system-metrics", tags=["admin"])
async def admin_system_metrics(limit: int = 30, _: None = Depends(require_admin)):
    limit = max(1, min(limit, 365))
    metrics = fetch_recent_system_metrics(limit)
    return {"metrics": metrics}


@api.get("/api/admin/users", tags=["admin"])
async def admin_list_users(
    status_filter: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    _: None = Depends(require_admin),
):
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    select_fields = (
        "id,email,status,referral_code,referral_count,silver_gold_completed_count," "apple_draw_rights,purchase_obligation,purchase_available,wishlist_url,created_at,updated_at"
    )
    query = supabase.table("users").select(select_fields).order("created_at", desc=True).range(offset, offset + limit - 1)
    if status_filter:
        query = query.eq("status", status_filter)
    if search:
        safe = search.replace(",", " ").strip()
        pattern = f"%{safe}%"
        query = query.or_(f"email.ilike.{pattern},referral_code.ilike.{pattern}")

    response = query.execute()
    rows = response.data or []

    return {
        "users": rows,
        "limit": limit,
        "offset": offset,
    }


@api.put("/api/admin/users/{user_id}", tags=["admin"])
async def admin_update_user(user_id: str, payload: AdminUserUpdate, _: None = Depends(require_admin)):
    updates = {key: value for key, value in payload.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "更新するフィールドが指定されていません")

    user_exists = supabase.table("users").select("id").eq("id", user_id).single().execute()
    if not user_exists.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ユーザーが見つかりません")

    updates["updated_at"] = utc_now().isoformat()
    supabase.table("users").update(updates).eq("id", user_id).execute()

    updated = (
        supabase.table("users")
        .select(
            "id,email,status,referral_code,referral_count,silver_gold_completed_count,apple_draw_rights,purchase_obligation,purchase_available,wishlist_url,created_at,updated_at"
        )
        .eq("id", user_id)
        .single()
        .execute()
    )

    return updated.data


@api.post("/api/admin/users/{user_id}/grant-red-apple", tags=["admin"])
async def admin_grant_red_apple(user_id: str, _: None = Depends(require_admin)):
    user_resp = (
        supabase.table("users")
        .select("id, email, status, wishlist_url, purchase_obligation, purchase_available")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ユーザーが見つかりません")

    user_data = user_resp.data
    now = utc_now()

    purchase_resp = (
        supabase.table("purchases")
        .insert(
            {
                "purchaser_id": user_id,
                "target_user_id": user_id,
                "target_wishlist_url": user_data.get("wishlist_url") or "admin://grant",
                "target_item_name": "Admin Granted Red Apple",
                "status": "approved",
                "verification_status": "approved",
                "verification_result": "Admin granted red apple",
                "admin_notes": "Manual grant",
                "screenshot_url": None,
                "created_at": now.isoformat(),
                "verified_at": now.isoformat(),
            }
        )
        .execute()
    )

    if not purchase_resp.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "購入レコードの作成に失敗しました")

    purchase_id = purchase_resp.data[0]["id"]
    reward = APPLE_REWARDS["red"]

    apple_resp = (
        supabase.table("apples")
        .insert(
            {
                "user_id": user_id,
                "purchase_id": purchase_id,
                "apple_type": "red",
                "purchase_obligation": reward["purchase_obligation"],
                "purchase_available": reward["purchase_available"],
                "draw_time": now.isoformat(),
                "reveal_time": now.isoformat(),
                "status": "revealed",
                "is_revealed": True,
                "is_consumed": False,
            }
        )
        .execute()
    )

    if not apple_resp.data:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "りんごレコードの作成に失敗しました")

    user_update: dict[str, object] = {
        "purchase_available": (user_data.get("purchase_available") or 0) + reward["purchase_available"],
        "updated_at": now.isoformat(),
    }
    if user_data.get("status") not in {"ready_to_draw", "active"}:
        user_update["status"] = "ready_to_draw"

    supabase.table("users").update(user_update).eq("id", user_id).execute()
    invalidate_rtp_cache()

    return {"apple": apple_resp.data[0]}


@api.post("/api/chatbot", response_model=ChatbotResponse, tags=["chatbot"])
async def chatbot_reply(payload: ChatbotRequest, user_id: str | None = Depends(get_optional_user_id)):
    if openai_client is None:
        return {"reply": fallback_chatbot_reply(payload.status)}

    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=build_chatbot_messages(payload, user_id),
            temperature=0.4,
            max_tokens=400,
        )
        reply_text = extract_chatbot_reply(completion.choices[0]) or fallback_chatbot_reply(payload.status)
    except Exception as exc:  # pragma: no cover - network failure path
        print(f"[Chatbot] OpenAI error: {exc}")
        reply_text = fallback_chatbot_reply(payload.status)

    return {"reply": reply_text}
