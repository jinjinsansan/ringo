"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBackendBaseUrl } from "@/lib/backend";
import { persistAdminToken, readAdminToken } from "@/lib/adminToken";

type WishlistAssignment = {
  id?: string;
  title?: string;
  price?: number;
  url?: string;
  owner_id?: string;
  owner_email?: string;
  assigned_at?: string;
} | null;

type OcrSnapshot = {
  item_name?: string | null;
  order_id?: string | null;
  price?: number | null;
  confidence?: number | null;
  matched_name?: boolean | null;
  matched_price?: boolean | null;
} | null;

type VerificationMetadata = {
  evaluated_at?: string;
  model?: string;
  [key: string]: unknown;
} | null;

type VerificationRow = {
  id: number;
  purchaser_id: string;
  purchaser_email?: string;
  target_user_id?: string;
  target_user_email?: string;
  status: string;
  verification_status?: string;
  verification_result?: string;
  screenshot_url?: string;
  has_screenshot?: boolean;
  admin_notes?: string;
  created_at?: string;
  verified_at?: string;
  target_item_name?: string;
  target_item_price?: number;
  target_wishlist_url?: string;
  ocr_snapshot?: OcrSnapshot;
  verification_metadata?: VerificationMetadata;
  wishlist_assignment?: WishlistAssignment;
};

const statusColors: Record<string, string> = {
  approved: "bg-ringo-green/20 text-ringo-green",
  rejected: "bg-ringo-red/20 text-ringo-red",
  review_required: "bg-ringo-indigo/15 text-ringo-indigo",
  submitted: "bg-ringo-pink/10 text-ringo-rose",
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString("ja-JP") : "-");
const formatPrice = (value?: number | null) => (typeof value === "number" ? `¥${value.toLocaleString()}` : "-");

const formatVerificationResult = (result?: string): string => {
  console.log("[formatVerificationResult] Input:", result);
  if (!result) return "AI からのコメントはまだありません。";
  
  // Remove markdown code blocks if present
  let cleaned = result.trim();
  if (cleaned.startsWith("```json") || cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json?\s*/, "").replace(/```\s*$/, "").trim();
    console.log("[formatVerificationResult] Removed markdown, cleaned:", cleaned);
  }
  
  // Try to parse JSON if it looks like JSON
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    try {
      const parsed = JSON.parse(cleaned);
      console.log("[formatVerificationResult] Parsed:", parsed);
      if (parsed.reason) return parsed.reason;
      if (parsed.message) return parsed.message;
      if (parsed.decision) return `判定: ${parsed.decision}`;
    } catch (e) {
      console.error("[formatVerificationResult] Parse error:", e);
      // If parsing fails, return as-is
    }
  }
  
  return cleaned;
};

export default function AdminVerificationsPage() {
  const [adminToken, setAdminToken] = useState<string>("");
  const [storedTokenChecked, setStoredTokenChecked] = useState(false);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<number | null>(null);
  const [backendBase, setBackendBase] = useState<string>("");

  useEffect(() => {
    const saved = readAdminToken();
    if (saved) {
      setAdminToken(saved);
    }
    setStoredTokenChecked(true);
    const url = getBackendBaseUrl();
    console.log("[AdminVerifications] Backend URL:", url, "ENV:", process.env.NEXT_PUBLIC_BACKEND_URL);
    setBackendBase(url);
  }, []);

  const canFetch = useMemo(() => {
    const result = Boolean(adminToken && backendBase);
    console.log("[AdminVerifications] canFetch:", result, "token:", adminToken?.slice(0, 5) + "...", "base:", backendBase);
    return result;
  }, [adminToken, backendBase]);

  const fetchVerifications = useCallback(async () => {
    console.log("[AdminVerifications] fetchVerifications called, canFetch:", canFetch);
    if (!canFetch) {
      console.log("[AdminVerifications] Skipping fetch - canFetch is false");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `${backendBase}/api/admin/verifications`;
      console.log("[AdminVerifications] Fetching:", url);
      const res = await fetch(url, {
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
      if (!res.ok) throw new Error("検証一覧を取得できませんでした");
      const data = (await res.json()) as VerificationRow[];
      setVerifications(data);
      persistAdminToken(adminToken);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "一覧取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [adminToken, backendBase, canFetch]);

  useEffect(() => {
    console.log("[AdminVerifications] useEffect - canFetch:", canFetch, "storedTokenChecked:", storedTokenChecked);
    if (canFetch && storedTokenChecked) {
      console.log("[AdminVerifications] Calling fetchVerifications");
      fetchVerifications();
    }
  }, [canFetch, fetchVerifications, storedTokenChecked]);

  const handleDecision = async (id: number, decision: "approved" | "rejected" | "review_required") => {
    if (!canFetch) return;
    setDecisionLoadingId(id);
    setDecisionMessage(null);
    try {
      const res = await fetch(`${backendBase}/api/admin/verifications/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error("決定の送信に失敗しました");
      setDecisionMessage(`ID ${id} を ${decision} に更新しました。`);
      fetchVerifications();
    } catch (err) {
      console.error(err);
      setDecisionMessage(err instanceof Error ? err.message : "決定の送信に失敗しました。");
    } finally {
      setDecisionLoadingId(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 text-ringo-ink">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-ringo-rose">管理者ワークスペース</p>
        <h1 className="font-logo text-4xl font-bold">購入スクショ審査</h1>
        <p className="text-sm text-ringo-ink/70">
          欲しいものリストのマッチング状況・AI判定・OCR結果をひと目で確認し、最終承認を行えます。
        </p>
      </header>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">管理者トークン</h2>
        <form
          className="mt-3 flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            fetchVerifications();
          }}
        >
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="管理者用トークンを入力"
            className="flex-1 rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
          />
          <button type="submit" className="btn-primary px-6 text-sm">
            {isLoading ? "更新中..." : "認証 & 再読み込み"}
          </button>
        </form>
        {!backendBase && <p className="mt-2 text-sm text-ringo-red">NEXT_PUBLIC_BACKEND_URL が未設定のため、APIに接続できません。</p>}
      </section>

      {decisionMessage && (
        <p className="rounded-3xl border border-ringo-purple/20 bg-ringo-slate-light/40 px-4 py-3 text-sm text-ringo-ink">{decisionMessage}</p>
      )}

      {error && <p className="rounded-3xl border border-ringo-red/30 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/90 p-6 shadow-ringo-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ringo-red">提出一覧</h2>
          <button
            type="button"
            onClick={fetchVerifications}
            className="rounded-ringo-pill border border-ringo-pink px-4 py-2 text-xs font-semibold text-ringo-pink"
          >
            {isLoading ? "更新中..." : "最新の状態に更新"}
          </button>
        </div>
        {verifications.length === 0 ? (
          <p className="mt-4 text-sm text-ringo-ink/70">現在、確認待ちの提出はありません。</p>
        ) : (
          <div className="mt-6 space-y-6">
            {verifications.map((row) => {
              const aiStatus = row.verification_status ?? row.status;
              const wishlist = row.wishlist_assignment;
              const ocr = row.ocr_snapshot;
              const displayTitle = wishlist?.title ?? row.target_item_name ?? "(タイトル未登録)";
              const displayPrice = wishlist?.price ?? row.target_item_price;

              return (
                <article key={row.id} className="rounded-3xl border border-ringo-purple/20 bg-white/90 p-5 shadow-ringo-card">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ringo-purple/10 pb-4">
                    <div>
                      <p className="text-xs font-semibold text-ringo-ink/60">購入者</p>
                      <p className="text-base font-bold text-ringo-ink">{row.purchaser_email ?? row.purchaser_id}</p>
                      <p className="text-xs text-gray-500">提出: {formatDate(row.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1 font-semibold ${statusColors[aiStatus ?? "submitted"] ?? "bg-gray-100 text-gray-600"}`}>
                        AI: {aiStatus ?? "-"}
                      </span>
                      <span className="rounded-full bg-ringo-slate-light/60 px-3 py-1 font-semibold text-ringo-ink/80">
                        現在: {row.status}
                      </span>
                      {row.verified_at && <span className="rounded-full bg-ringo-green/20 px-3 py-1 font-semibold text-ringo-green">承認済み</span>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <section className="rounded-2xl border border-ringo-purple/10 bg-ringo-bg/60 p-4 text-sm">
                      <h3 className="text-xs font-semibold text-gray-500">割り当てられた欲しいもの</h3>
                      <p className="mt-2 text-base font-bold text-ringo-ink">{displayTitle}</p>
                      <p className="text-sm text-gray-600">{formatPrice(displayPrice)}</p>
                      {(wishlist?.url ?? row.target_wishlist_url) && (
                        <Link
                          href={wishlist?.url ?? row.target_wishlist_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-ringo-pink underline"
                        >
                          Amazonリストを確認
                        </Link>
                      )}
                      <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-gray-500">
                        <p>リスト所有者: {wishlist?.owner_email ?? row.target_user_email ?? "-"}</p>
                        <p>マッチング日時: {formatDate(wishlist?.assigned_at)}</p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-ringo-purple/10 bg-white/70 p-4 text-sm">
                      <h3 className="text-xs font-semibold text-gray-500">スクリーンショット / OCR</h3>
                      {row.screenshot_url ? (
                        <div className="mt-2 overflow-hidden rounded-xl border border-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.screenshot_url}
                            alt={`スクリーンショット ${row.id}`}
                            className="h-48 w-full object-cover"
                          />
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">まだアップロードされていません。</p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        <p>検出商品: {ocr?.item_name ?? "-"}</p>
                        <p>
                          検出価格: {formatPrice(ocr?.price)}
                          {typeof ocr?.matched_price === "boolean" && (
                            <span className={`ml-2 font-semibold ${ocr.matched_price ? "text-ringo-green" : "text-ringo-red"}`}>
                              {ocr.matched_price ? "一致" : "不一致"}
                            </span>
                          )}
                        </p>
                        <p>注文番号: {ocr?.order_id ?? "-"}</p>
                        <p>信頼度: {ocr?.confidence ? `${Math.round(ocr.confidence * 100)}%` : "-"}</p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-ringo-purple/10 bg-ringo-slate-light/50 p-4 text-sm">
                      <h3 className="text-xs font-semibold text-gray-500">AI 判定メモ</h3>
                      <p className="mt-2 text-sm text-ringo-ink/80 whitespace-pre-wrap">{formatVerificationResult(row.verification_result)}</p>
                      {row.admin_notes && (
                        <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-gray-600">
                          最終メモ: {row.admin_notes}
                        </p>
                      )}
                      {row.verification_metadata?.evaluated_at && (
                        <p className="mt-2 text-xs text-gray-500">
                          判定時刻: {formatDate(row.verification_metadata.evaluated_at as string)}
                        </p>
                      )}
                    </section>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ringo-purple/10 pt-4 text-xs text-gray-500">
                    <div>
                      <p>スクショ受領: {row.has_screenshot ? "済" : "未"}</p>
                      <p>割り当て→購入者: {row.target_user_email ? `${row.target_user_email} → ${row.purchaser_email ?? row.purchaser_id}` : "-"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => handleDecision(row.id, "approved")}
                        className="btn-primary px-6 text-xs"
                        disabled={decisionLoadingId === row.id}
                      >
                        {decisionLoadingId === row.id ? "処理中..." : "承認する"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(row.id, "review_required")}
                        className="rounded-ringo-pill border border-ringo-purple/40 bg-white px-4 py-2 text-xs font-semibold text-ringo-indigo"
                        disabled={decisionLoadingId === row.id}
                      >
                        要確認
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(row.id, "rejected")}
                        className="rounded-ringo-pill bg-ringo-red px-4 py-2 text-xs font-semibold text-white"
                        disabled={decisionLoadingId === row.id}
                      >
                        却下
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
