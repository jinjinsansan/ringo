"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { fetchDashboard } from "@/lib/status";
import { useUser } from "@/lib/user";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

type DashboardData = {
  user: {
    email?: string;
    status?: string;
    wishlist_url?: string;
    referral_code?: string;
  };
  apples: Record<string, number>;
  stats: {
    referral_count?: number;
    purchase_obligation?: number;
    purchase_available?: number;
    silver_gold_completed_count?: number;
  };
};

const appleLabels: Record<string, string> = {
  bronze: "ブロンズ",
  silver: "シルバー",
  gold: "ゴールド",
  red: "赤りんご",
  poison: "毒りんご",
};

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const payload = await fetchDashboard(user.id);
        setData(payload);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const referralLink = useMemo(() => {
    if (!data?.user?.referral_code) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/register?ref=${data.user.referral_code}`;
  }, [data?.user?.referral_code]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setError("コピーに失敗しました");
    }
  };

  const stats = data?.stats ?? {};
  const apples = data?.apples ?? {};

  return (
    <UserFlowGuard requiredStatus="first_purchase_completed">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 text-ringo-ink">
        <header className="space-y-1">
          <p className="text-sm font-semibold text-ringo-red">HOME</p>
          <h1 className="font-logo text-4xl font-bold">マイページ</h1>
          <p className="text-sm text-ringo-ink/70">りんごや紹介状況、欲しいものリストをまとめてチェックできます。</p>
        </header>

        {error && <p className="rounded-3xl border border-ringo-red/30 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}

        {isLoading ? (
          <div className="mt-6 text-center text-sm text-ringo-ink/60">読み込み中…</div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-5 shadow-ringo-card">
                <p className="text-sm font-semibold text-ringo-red">🍎 あなたのりんご</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(appleLabels).map(([key, label]) => (
                    <div key={key} className="rounded-2xl bg-ringo-bg/70 px-4 py-3">
                      <p className="text-xs text-ringo-ink/60">{label}</p>
                      <p className="text-2xl font-bold text-ringo-ink">{apples[key] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-5 shadow-ringo-card">
                <p className="text-sm font-semibold text-ringo-red">📊 あなたの統計</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ringo-ink/60">紹介人数</dt>
                    <dd className="font-semibold">{stats.referral_count ?? 0} 人</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ringo-ink/60">購入義務残数</dt>
                    <dd className="font-semibold text-ringo-red">{stats.purchase_obligation ?? 0} 回</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ringo-ink/60">購入権残数</dt>
                    <dd className="font-semibold text-ringo-green">{stats.purchase_available ?? 0} 回</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ringo-ink/60">シルバー/ゴールド完了</dt>
                    <dd className="font-semibold">{stats.silver_gold_completed_count ?? 0} 回</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-5 shadow-ringo-card">
                <p className="text-sm font-semibold text-ringo-red">🎁 あなたの欲しいものリスト</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-ringo-ink/70">URL:</p>
                  {data?.user?.wishlist_url ? (
                    <a href={data.user.wishlist_url as string} target="_blank" rel="noreferrer" className="break-all text-ringo-pink underline">
                      {data.user.wishlist_url}
                    </a>
                  ) : (
                    <p className="text-ringo-ink/50">まだ登録されていません。</p>
                  )}
                  <p className="text-xs text-ringo-ink/50">初回登録後は変更できません。</p>
                  {!data?.user?.wishlist_url && (
                    <Link
                      href="/register-wishlist"
                      className="inline-flex w-full items-center justify-center rounded-ringo-pill bg-ringo-pink py-2 text-sm font-semibold text-white shadow-lg shadow-ringo-pink/40"
                    >
                      欲しいものリストを登録
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-5 shadow-ringo-card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ringo-red">🔗 紹介リンク</p>
                  {data?.user?.referral_code && (
                    <span className="text-xs text-ringo-ink/60">コード: {data.user.referral_code}</span>
                  )}
                </div>
                {referralLink ? (
                  <div className="space-y-2 text-sm">
                    <p className="break-all rounded-2xl bg-ringo-bg/70 px-3 py-2 text-ringo-ink/80">{referralLink}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 rounded-ringo-pill border border-ringo-pink py-2 text-sm font-semibold text-ringo-pink hover:bg-ringo-pink/10"
                      >
                        {copied ? "コピーしました" : "リンクをコピー"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQr((value) => !value)}
                        className="flex-1 rounded-ringo-pill border border-ringo-purple py-2 text-sm font-semibold text-ringo-purple hover:bg-ringo-purple/10"
                      >
                        QRコード表示
                      </button>
                    </div>
                    {showQr && (
                      <div className="mt-3 flex justify-center rounded-2xl bg-white/90 p-4">
                        <QRCode value={referralLink} size={160} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ringo-ink/60">紹介リンクの読み込みに失敗しました。</p>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-ringo-purple/20 bg-white/80 p-5 text-sm shadow-ringo-card">
              <p className="text-sm font-semibold text-ringo-red">次のアクション</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  href="/draw"
                  className="rounded-2xl border border-ringo-pink bg-ringo-pink/10 px-4 py-3 text-center font-semibold text-ringo-pink hover:bg-ringo-pink/20"
                >
                  りんごを引く
                </Link>
                <Link
                  href="/friends"
                  className="rounded-2xl border border-ringo-purple/40 bg-ringo-purple/10 px-4 py-3 text-center font-semibold text-ringo-purple hover:bg-ringo-purple/20"
                >
                  紹介ページを見る
                </Link>
                <Link
                  href="/purchase"
                  className="rounded-2xl border border-ringo-ink/10 bg-ringo-bg px-4 py-3 text-center font-semibold text-ringo-ink hover:bg-ringo-bg/80"
                >
                  購入状況を確認
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </UserFlowGuard>
  );
}
