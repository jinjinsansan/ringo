"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type VerificationRow = {
  id: number;
  purchaser_id: string;
  purchaser_email?: string;
  status: string;
  verification_status?: string;
  verification_result?: string;
  screenshot_url?: string;
  admin_notes?: string;
  created_at?: string;
  target_item_name?: string;
  target_item_price?: number;
  target_wishlist_url?: string;
};

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export default function AdminVerificationsPage() {
  const [adminToken, setAdminToken] = useState<string>("");
  const [storedTokenChecked, setStoredTokenChecked] = useState(false);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("adminToken");
    if (saved) {
      setAdminToken(saved);
    }
    setStoredTokenChecked(true);
  }, []);

  const canFetch = useMemo(() => Boolean(adminToken && backendBase), [adminToken]);

  const fetchVerifications = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendBase}/api/admin/verifications`, {
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
      if (!res.ok) throw new Error("検証一覧を取得できませんでした");
      const data = (await res.json()) as VerificationRow[];
      setVerifications(data);
      window.localStorage.setItem("adminToken", adminToken);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "一覧取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [adminToken, canFetch]);

  useEffect(() => {
    if (canFetch && storedTokenChecked) {
      fetchVerifications();
    }
  }, [canFetch, fetchVerifications, storedTokenChecked]);

  const handleDecision = async (id: number, decision: "approved" | "rejected" | "review_required") => {
    if (!canFetch) return;
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
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 text-ringo-ink">
      <header className="space-y-2">
        <h1 className="font-logo text-4xl font-bold">管理者: 購入検証</h1>
        <p className="text-sm text-ringo-ink/70">提出されたスクリーンショットとAI判定結果を確認し、手動で承認 / 却下できます。</p>
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
            認証 & 再読み込み
          </button>
        </form>
        {!backendBase && <p className="mt-2 text-sm text-ringo-red">NEXT_PUBLIC_BACKEND_URL が未設定のため、APIに接続できません。</p>}
      </section>

      {decisionMessage && (
        <p className="rounded-3xl border border-ringo-purple/20 bg-ringo-slate-light/40 px-4 py-3 text-sm text-ringo-ink">{decisionMessage}</p>
      )}

      {error && <p className="rounded-3xl border border-ringo-red/30 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ringo-red">提出一覧</h2>
          <button
            type="button"
            onClick={fetchVerifications}
            className="rounded-ringo-pill border border-ringo-pink px-4 py-2 text-xs font-semibold text-ringo-pink"
          >
            {isLoading ? "更新中..." : "再読み込み"}
          </button>
        </div>
        {verifications.length === 0 ? (
          <p className="mt-4 text-sm text-ringo-ink/70">現在、検証待ちの購入はありません。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-ringo-purple/20 text-xs uppercase text-ringo-ink/70">
                  <th className="p-3">ID</th>
                  <th className="p-3">ユーザー</th>
                  <th className="p-3">商品</th>
                  <th className="p-3">ステータス</th>
                  <th className="p-3">スクショ</th>
                  <th className="p-3">管理メモ</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((row) => (
                  <tr key={row.id} className="border-b border-ringo-purple/10">
                    <td className="p-3 align-top text-xs text-ringo-ink/70">{row.id}</td>
                    <td className="p-3 align-top">
                      <p className="font-semibold">{row.purchaser_email ?? row.purchaser_id}</p>
                      <p className="text-xs text-ringo-ink/60">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                    </td>
                    <td className="p-3 align-top">
                      <p className="font-semibold">{row.target_item_name}</p>
                      <p className="text-xs text-ringo-ink/60">¥{row.target_item_price?.toLocaleString()}</p>
                      {row.target_wishlist_url && (
                        <Link href={row.target_wishlist_url} target="_blank" rel="noreferrer" className="text-xs text-ringo-pink underline">
                          Wishlist を開く
                        </Link>
                      )}
                    </td>
                    <td className="p-3 align-top text-xs">
                      <p>status: {row.status}</p>
                      <p>verify: {row.verification_status}</p>
                      <p className="text-ringo-ink/60">{row.verification_result}</p>
                    </td>
                    <td className="p-3 align-top text-xs">
                      {row.screenshot_url ? (
                        <Link href={row.screenshot_url} target="_blank" rel="noreferrer" className="text-ringo-pink underline">
                          画像を開く
                        </Link>
                      ) : (
                        <span className="text-ringo-ink/50">なし</span>
                      )}
                    </td>
                    <td className="p-3 align-top text-xs text-ringo-ink/70">{row.admin_notes ?? "-"}</td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-2 text-xs">
                        <button
                          type="button"
                          className="btn-primary px-3 py-1 text-xs"
                          onClick={() => handleDecision(row.id, "approved")}
                        >
                          承認
                        </button>
                        <button
                          type="button"
                          className="rounded-ringo-pill bg-ringo-purple/80 px-3 py-1 font-semibold text-white"
                          onClick={() => handleDecision(row.id, "review_required")}
                        >
                          要確認
                        </button>
                        <button
                          type="button"
                          className="rounded-ringo-pill bg-ringo-red px-3 py-1 font-semibold text-white"
                          onClick={() => handleDecision(row.id, "rejected")}
                        >
                          却下
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
