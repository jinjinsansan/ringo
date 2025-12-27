"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { authorizedFetch } from "@/lib/status";
import { useUser } from "@/lib/user";

type Threshold = {
  count: number;
  status: "completed" | "active" | "locked";
};

type ReferralSummary = {
  referral_code: string;
  referral_count: number;
  thresholds: Threshold[];
  next_threshold: number | null;
  progress_percent: number;
  can_claim_code: boolean;
  referred_by: string | null;
};

const hurdleDescriptions: Record<number, string> = {
  3: "初級：まずは身近な友達にシェア",
  5: "中級：SNSでの発信に挑戦",
  10: "上級：りんご会♪アンバサダー候補",
  20: "達人：コミュニティのスター",
  30: "伝説：VIPプログラム招待",
};

const referralTips = [
  "りんご会♪の魅力を一言で添えてシェア",
  "Instagramストーリーに紹介コードのスクショを載せる",
  "オフラインではQRコードを見せてその場で参加を促す",
];

export default function FriendsPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claimMessage, setClaimMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authorizedFetch("/api/referral/summary", user.id);
      const data = (await response.json()) as ReferralSummary;
      setSummary(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "紹介状況を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const referralLink = useMemo(() => {
    if (!summary) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}/register?ref=${summary.referral_code}` : summary.referral_code;
  }, [summary]);

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(referralLink || summary.referral_code);
      setClaimMessage({ type: "success", text: "紹介リンクをコピーしました！" });
    } catch (err) {
      console.error(err);
      setClaimMessage({ type: "error", text: "コピーに失敗しました。手動で選択してください。" });
    }
  };

  const handleClaim = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !summary) return;
    if (!summary.can_claim_code) {
      setClaimMessage({ type: "error", text: "紹介コードはすでに登録済みです。" });
      return;
    }
    if (!claimCode.trim()) {
      setClaimMessage({ type: "error", text: "紹介コードを入力してください。" });
      return;
    }
    try {
      await authorizedFetch("/api/referral/claim", user.id, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: claimCode }),
      });
      setClaimMessage({ type: "success", text: "紹介コードを登録しました！" });
      setClaimCode("");
      fetchSummary();
    } catch (err) {
      console.error(err);
      setClaimMessage({ type: "error", text: err instanceof Error ? err.message : "登録に失敗しました。" });
    }
  };

  const content = () => {
    if (isLoading) {
      return <p className="text-sm text-ringo-ink/70">紹介状況を読み込み中です…</p>;
    }

    if (error) {
      return <p className="text-sm text-ringo-red">{error}</p>;
    }

    if (!summary) {
      return <p className="text-sm text-ringo-ink/70">紹介データが見つかりませんでした。</p>;
    }

    const nextThresholdLabel = summary.next_threshold ? `${summary.next_threshold}人` : "全ハードル制覇";

    return (
      <div className="space-y-8">
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ringo-purple/20 bg-ringo-slate-light/40 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">📊 あなたの紹介状況</h2>
            <p className="mt-2 text-sm text-ringo-ink/70">友達を招待して、上位りんごの確率をブーストしましょう。</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ringo-ink/70">紹介人数</dt>
                <dd className="font-semibold text-ringo-ink">{summary.referral_count}人</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ringo-ink/70">次のハードル</dt>
                <dd className="font-semibold text-ringo-ink">{nextThresholdLabel}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-ringo-ink/70">
                <span>進捗</span>
                <span>{summary.progress_percent}%</span>
              </div>
              <div className="mt-2 h-3 w-full rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ringo-purple to-ringo-pink"
                  style={{ width: `${summary.progress_percent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">🎯 ハードル一覧</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {summary.thresholds.map((threshold) => {
                const description = hurdleDescriptions[threshold.count];
                const statusIcon = threshold.status === "completed" ? "✅" : threshold.status === "active" ? "⏳" : "⭕";
                const statusColor =
                  threshold.status === "completed"
                    ? "text-ringo-green"
                    : threshold.status === "active"
                      ? "text-ringo-pink"
                      : "text-ringo-ink/50";
                return (
                  <li key={threshold.count} className={`flex items-start gap-3 rounded-2xl border border-ringo-purple/10 bg-ringo-bg/70 p-3 ${statusColor}`}>
                    <span>{statusIcon}</span>
                    <div className="text-ringo-ink">
                      <p className="font-semibold text-ringo-ink">{threshold.count}人紹介</p>
                      {description && <p className="text-xs text-ringo-ink/70">{description}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ringo-gold/20 bg-ringo-beige/40 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">🔗 紹介リンク</h2>
            <p className="mt-2 text-sm text-ringo-ink/70">このコードを共有すると、友達が登録時にあなたを選べます。</p>
            <div className="mt-4 rounded-2xl bg-white/80 p-4 text-center">
              <p className="text-sm font-semibold text-ringo-ink/70">紹介コード</p>
              <p className="text-2xl font-bold text-ringo-red">{summary.referral_code}</p>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full rounded-ringo-pill bg-ringo-pink py-3 font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5"
              >
                コピーして共有する
              </button>
              <p className="text-center text-xs text-ringo-ink/70 break-words">{referralLink}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">🤝 紹介コードを登録</h2>
            <p className="mt-2 text-sm text-ringo-ink/70">まだ紹介してくれた友達がいる場合は、ここでコードを登録しましょう。</p>
            <form onSubmit={handleClaim} className="mt-4 space-y-3">
              <input
                type="text"
                value={claimCode}
                onChange={(event) => setClaimCode(event.target.value.toUpperCase())}
                placeholder="例: ABCD1234"
                disabled={!summary.can_claim_code}
                className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!summary.can_claim_code}
                className="w-full rounded-ringo-pill border border-ringo-pink py-3 text-sm font-semibold text-ringo-pink transition hover:bg-ringo-pink/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {summary.can_claim_code ? "紹介コードを登録" : "紹介コード済み"}
              </button>
            </form>
            {summary.referred_by && <p className="mt-3 text-xs text-ringo-ink/70">登録済みの紹介者: {summary.referred_by}</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-ringo-purple/20 bg-ringo-slate-light/40 p-6 shadow-ringo-card">
          <h2 className="text-xl font-semibold text-ringo-red">💡 紹介のコツ</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-ringo-ink/80">
            {referralTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>
    );
  };

  return (
    <UserFlowGuard requiredStatus="verifying">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-ringo-ink">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.13</p>
          <h1 className="font-logo text-4xl font-bold">友達紹介精度</h1>
          <p className="text-sm text-ringo-ink/70">紹介人数に応じて、シルバー以上のりんごが出る確率がアップします。仲間を増やしてワクワクを共有しましょう。</p>
        </header>

        {claimMessage && (
          <p
            className={`rounded-3xl border px-4 py-3 text-sm ${
              claimMessage.type === "success"
                ? "border-ringo-green/40 bg-ringo-green/10 text-ringo-green"
                : "border-ringo-red/40 bg-ringo-pink/10 text-ringo-red"
            }`}
          >
            {claimMessage.text}
          </p>
        )}

        {content()}

        <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 text-sm shadow-ringo-card">
          <p>
            まだ最初の紹介が済んでいない場合は、
            <Link href="/draw" className="text-ringo-pink underline">
              りんご抽選ページ
            </Link>
            から抽選権を集め、紹介コードと合わせてシェアしてみましょう。
          </p>
        </div>
      </main>
    </UserFlowGuard>
  );
}
