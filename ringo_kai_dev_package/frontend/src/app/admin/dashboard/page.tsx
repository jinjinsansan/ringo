"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getBackendBaseUrl } from "@/lib/backend";
import { persistAdminToken, readAdminToken } from "@/lib/adminToken";

type AdminAppleUser = {
  id?: string;
  email?: string;
  status?: string;
  referral_code?: string;
};

type AdminAppleRow = {
  id: number;
  apple_type: string;
  status: string;
  draw_time?: string;
  reveal_time?: string;
  is_revealed?: boolean;
  purchase_available?: number;
  purchase_obligation?: number;
  user?: AdminAppleUser;
};

type DashboardMetrics = {
  user_counts: {
    total: number;
    active: number;
    status_breakdown: Record<string, number>;
  };
  purchase_counts: Record<string, number>;
  apple_counts: Record<string, number>;
  rtp: number;
  latest_snapshot?: {
    captured_at?: string;
    probabilities?: Record<string, number>;
  } | null;
  recent_apples?: AdminAppleRow[];
};

type SystemMetricEntry = {
  captured_at: string;
  total_users: number;
  new_users_this_month: number;
  active_users: number;
  total_purchase_obligation: number;
  total_purchase_available: number;
  current_rtp: number;
  predicted_rtp: number;
  growth_rate: number;
  bronze_probability: number;
  silver_probability: number;
  gold_probability: number;
  red_probability: number;
  poison_probability: number;
};

const backendBase = getBackendBaseUrl();

const appleLabels: Record<string, string> = {
  bronze: "ブロンズ",
  silver: "シルバー",
  gold: "ゴールド",
  red: "赤りんご",
  poison: "毒りんご",
};

export default function AdminDashboardPage() {
  const [adminToken, setAdminToken] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async (token: string) => {
    if (!token || !backendBase) return;
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, systemRes] = await Promise.all([
        fetch(`${backendBase}/api/admin/dashboard`, {
          headers: {
            "X-Admin-Token": token,
          },
        }),
        fetch(`${backendBase}/api/admin/system-metrics?limit=14`, {
          headers: {
            "X-Admin-Token": token,
          },
        }),
      ]);

      if (!dashboardRes.ok) throw new Error("ダッシュボードの取得に失敗しました");

      const data = (await dashboardRes.json()) as DashboardMetrics;
      setMetrics(data);
      if (systemRes.ok) {
        const systemData = (await systemRes.json()) as { metrics?: SystemMetricEntry[] };
        setSystemMetrics(systemData.metrics ?? []);
      } else {
        setSystemMetrics([]);
      }
      persistAdminToken(token);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "取得に失敗しました。トークンを確認してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readAdminToken();
    if (stored) {
      setAdminToken(stored);
      void fetchMetrics(stored);
    }
  }, [fetchMetrics]);

  const statusBreakdown = metrics?.user_counts.status_breakdown ?? {};
  const appleBreakdown = metrics?.apple_counts ?? {};
  const purchaseBreakdown = metrics?.purchase_counts ?? {};
  const probabilityEntries = Object.entries(metrics?.latest_snapshot?.probabilities ?? {});
  const recentApples = metrics?.recent_apples ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 text-ringo-ink">
      <header className="space-y-2">
        <h1 className="font-logo text-4xl font-bold">管理者ダッシュボード</h1>
        <p className="text-sm text-ringo-ink/70">システム全体のメトリクスと現在のRTPを確認できます。</p>
        <div className="text-xs text-ringo-ink/60">
          <Link href="/admin/verifications" className="text-ringo-pink underline">
            購入検証の管理ページへ移動
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">管理者トークン</h2>
        <form
          className="mt-3 flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            fetchMetrics(adminToken);
          }}
        >
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder="管理者用トークンを入力"
            className="flex-1 rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="btn-primary px-6 text-sm">
            {isLoading ? "更新中..." : "更新"}
          </button>
        </form>
        {!backendBase && <p className="mt-2 text-xs text-ringo-red">NEXT_PUBLIC_BACKEND_URL が設定されていません。</p>}
      </section>

      {error && <p className="rounded-3xl border border-ringo-red/40 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <p className="text-sm text-ringo-ink/60">総ユーザー数</p>
          <p className="text-3xl font-bold text-ringo-red">{metrics?.user_counts.total ?? "-"}</p>
        </div>
        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <p className="text-sm text-ringo-ink/60">アクティブユーザー</p>
          <p className="text-3xl font-bold text-ringo-green">{metrics?.user_counts.active ?? "-"}</p>
        </div>
        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <p className="text-sm text-ringo-ink/60">現在のRTP</p>
          <p className="text-3xl font-bold text-ringo-pink">{metrics ? metrics.rtp.toFixed(2) : "-"}</p>
          {metrics?.latest_snapshot?.captured_at && (
            <p className="text-xs text-ringo-ink/60">更新: {new Date(metrics.latest_snapshot.captured_at).toLocaleString()}</p>
          )}
        </div>
      </section>

      {probabilityEntries.length > 0 && (
        <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <h2 className="text-lg font-semibold text-ringo-red">現在のRTP確率</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {probabilityEntries.map(([apple, value]) => (
              <div key={apple} className="rounded-2xl border border-ringo-purple/10 bg-ringo-bg/70 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-ringo-ink/60">{appleLabels[apple] ?? apple}</p>
                <p className="text-2xl font-bold text-ringo-ink">{(value * 100).toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <h2 className="text-lg font-semibold text-ringo-red">ユーザーステータス内訳</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{status || "(不明)"}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
            {!Object.keys(statusBreakdown).length && <li className="text-ringo-ink/60">データなし</li>}
          </ul>
        </div>

        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
          <h2 className="text-lg font-semibold text-ringo-red">購入ステータス内訳</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(purchaseBreakdown).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{status}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
            {!Object.keys(purchaseBreakdown).length && <li className="text-ringo-ink/60">データなし</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">りんご種類別カウント</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(appleBreakdown).map(([apple, count]) => (
            <div key={apple} className="rounded-2xl border border-ringo-purple/20 bg-ringo-bg/60 p-4 text-center">
              <p className="text-sm text-ringo-ink/70">{apple}</p>
              <p className="text-2xl font-bold text-ringo-ink">{count}</p>
            </div>
          ))}
          {!Object.keys(appleBreakdown).length && <p className="text-sm text-ringo-ink/60">データなし</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">RTP & 成長率トレンド</h2>
        {systemMetrics.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-ringo-ink/70">
              <thead>
                <tr className="text-ringo-ink/90">
                  <th className="px-3 py-2">日時</th>
                  <th className="px-3 py-2">総ユーザー</th>
                  <th className="px-3 py-2">今月新規</th>
                  <th className="px-3 py-2">アクティブ</th>
                  <th className="px-3 py-2">RTP</th>
                  <th className="px-3 py-2">予測RTP</th>
                  <th className="px-3 py-2">毒りんご%</th>
                </tr>
              </thead>
              <tbody>
                {systemMetrics.map((entry) => (
                  <tr key={entry.captured_at} className="border-t border-ringo-purple/20">
                    <td className="px-3 py-2">
                      {new Date(entry.captured_at).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 font-semibold text-ringo-ink">{entry.total_users}</td>
                    <td className="px-3 py-2">+{entry.new_users_this_month}</td>
                    <td className="px-3 py-2">{entry.active_users}</td>
                    <td className="px-3 py-2 text-ringo-pink">{entry.current_rtp.toFixed(2)}</td>
                    <td className="px-3 py-2 text-ringo-purple">{entry.predicted_rtp.toFixed(2)}</td>
                    <td className="px-3 py-2 text-ringo-red">{(entry.poison_probability * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ringo-ink/60">まだメトリクスが保存されていません。</p>
        )}
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">最新のりんごトラッカー</h2>
        {recentApples.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-ringo-ink/70">
              <thead>
                <tr className="border-b border-ringo-purple/20 text-ringo-ink/90">
                  <th className="px-3 py-2">りんご</th>
                  <th className="px-3 py-2">ユーザー</th>
                  <th className="px-3 py-2">進行状況</th>
                  <th className="px-3 py-2">購入権/義務</th>
                </tr>
              </thead>
              <tbody>
                {recentApples.map((apple) => (
                  <tr key={apple.id} className="border-b border-ringo-purple/10">
                    <td className="px-3 py-2 font-semibold text-ringo-ink">
                      <div>{appleLabels[apple.apple_type] ?? apple.apple_type}</div>
                      <div className="text-[10px] uppercase text-ringo-ink/50">{apple.apple_type}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{apple.user?.email ?? "-"}</div>
                      <div className="text-[11px] text-ringo-ink/60">{apple.user?.status ?? "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{apple.status}</div>
                      <div className="text-[11px] text-ringo-ink/60">
                        抽選: {apple.draw_time ? new Date(apple.draw_time).toLocaleString() : "-"}
                      </div>
                      <div className="text-[11px] text-ringo-ink/60">
                        公開: {apple.reveal_time ? new Date(apple.reveal_time).toLocaleString() : "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>購入権: {apple.purchase_available ?? 0}</div>
                      <div>購入義務: {apple.purchase_obligation ?? 0}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ringo-ink/60">表示できるりんご履歴がありません。</p>
        )}
      </section>
    </main>
  );
}
