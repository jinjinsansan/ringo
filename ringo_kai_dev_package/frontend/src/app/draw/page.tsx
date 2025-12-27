"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppleReveal, AppleType } from "@/components/AppleReveal";
import { UserFlowGuard } from "@/components/UserFlowGuard";
import { useUser } from "@/lib/user";

type AppleStatus = "pending" | "revealed";

type AppleRevealResponse = {
  id: string;
  appleType: AppleType;
  drawTime: string;
  revealTime: string;
  status: AppleStatus;
};

type AppleApiResponse = {
  id: number;
  apple_type: AppleType;
  draw_time: string;
  reveal_time: string;
  status: AppleStatus;
};

type AppleResult = {
  id: number;
  apple_type: AppleType;
  draw_time: string;
  reveal_time: string;
  status: string;
  is_revealed: boolean;
  purchase_available: number;
  purchase_obligation: number;
};

type ProbabilityMeta = {
  referral_count: number;
  silver_gold_completed_count: number;
  days_since_last_silver_gold: number | null;
  last_silver_gold_completed_at?: string | null;
  using_bootstrap: boolean;
  rtp: number;
  predicted_rtp: number;
  monthly_new_users: number;
  growth_rate: number;
  total_users: number;
  next_referral_threshold?: number | null;
};

type ProbabilityResponse = {
  probabilities: Record<AppleType, number>;
  reasons: string[];
  meta: ProbabilityMeta;
};

const probabilityOrder: { key: AppleType; label: string }[] = [
  { key: "bronze", label: "ブロンズ" },
  { key: "silver", label: "シルバー" },
  { key: "gold", label: "ゴールド" },
  { key: "red", label: "赤いりんご" },
  { key: "poison", label: "毒りんご" },
];

const defaultProbabilities = [
  { label: "ブロンズ", value: "55%" },
  { label: "シルバー", value: "25%" },
  { label: "ゴールド", value: "12%" },
  { label: "赤いりんご", value: "5%" },
  { label: "毒りんご", value: "3%" },
];

const mockApple = (): AppleRevealResponse => {
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  const appleTypes: AppleType[] = ["bronze", "silver", "gold", "red", "poison"];
  return {
    id: "preview",
    appleType: appleTypes[Math.floor(Math.random() * appleTypes.length)],
    drawTime: new Date(now).toISOString(),
    revealTime: new Date(in24h).toISOString(),
    status: "pending",
  };
};

export default function DrawPage() {
  const { user } = useUser();
  const [currentApple, setCurrentApple] = useState<AppleRevealResponse | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleResult, setAppleResult] = useState<AppleResult | null>(null);
  const [isResultLoading, setResultLoading] = useState(false);
  const [consumeMessage, setConsumeMessage] = useState<string | null>(null);
  const [probabilityInfo, setProbabilityInfo] = useState<ProbabilityResponse | null>(null);
  const [probabilityError, setProbabilityError] = useState<string | null>(null);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "", []);

  const mapApple = useCallback((payload: AppleApiResponse): AppleRevealResponse => ({
    id: String(payload.id),
    appleType: payload.apple_type,
    drawTime: payload.draw_time,
    revealTime: payload.reveal_time,
    status: payload.status,
  }), []);

  const buildUrl = useCallback(
    (path: string) => `${apiBase}${path}`,
    [apiBase]
  );

  const fetchProbabilities = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(buildUrl("/api/apple/probabilities"), {
        cache: "no-store",
        headers: {
          "X-User-Id": user.id,
        },
      });
      if (!res.ok) throw new Error("確率情報を取得できませんでした");
      const data = (await res.json()) as ProbabilityResponse;
      setProbabilityInfo(data);
      setProbabilityError(null);
    } catch (err) {
      console.error(err);
      setProbabilityError("確率情報の取得に失敗しました");
    }
  }, [buildUrl, user]);

  const fetchResult = useCallback(
    async (appleId: string) => {
      if (!user) return;
      setResultLoading(true);
      setConsumeMessage(null);
      try {
        const res = await fetch(buildUrl(`/api/apple/result/${appleId}`), {
          cache: "no-store",
          headers: {
            "X-User-Id": user.id,
          },
        });
        if (!res.ok) throw new Error("りんごの結果を取得できませんでした");
        const data = (await res.json()) as AppleResult;
        setAppleResult(data);
      } catch (err) {
        console.warn("apple result fetch failed", err);
        setAppleResult(null);
      } finally {
        setResultLoading(false);
      }
    },
    [buildUrl, user]
  );

  const fetchCurrentApple = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl("/api/apple/current"), {
        cache: "no-store",
        headers: {
          "X-User-Id": user.id,
        },
      });
      if (!res.ok) throw new Error("現在のりんご情報を取得できませんでした");
      const data = (await res.json()) as AppleApiResponse | null;
      const mapped = data ? mapApple(data) : null;
      setCurrentApple(mapped);
      if (mapped) {
        fetchResult(mapped.id);
      } else {
        setAppleResult(null);
      }
    } catch (err) {
      console.warn("apple fetch failed, fallback to mock", err);
      setCurrentApple(null);
      setAppleResult(null);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, fetchResult, mapApple, user]);

  useEffect(() => {
    fetchCurrentApple();
  }, [fetchCurrentApple]);

  useEffect(() => {
    fetchProbabilities();
  }, [fetchProbabilities]);

  const handleDraw = async () => {
    if (!user) {
      setError("ユーザー情報が確認できません。ログイン状態を確認してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl("/api/apple/draw"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
        },
        body: JSON.stringify({ referral_count: 0 }),
      });
      if (!res.ok) throw new Error("りんご抽選に失敗しました");
      const data = (await res.json()) as AppleApiResponse;
      const mapped = mapApple(data);
      setCurrentApple(mapped);
      fetchResult(mapped.id);
      fetchProbabilities();
    } catch (err) {
      console.error(err);
      setError("APIと接続できなかったため、プレビュー用のモックを表示します。");
      setCurrentApple(mockApple());
      setAppleResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConsume = async () => {
    if (!user || !appleResult) return;
    if (appleResult.purchase_available <= 0) {
      setConsumeMessage("使用できるチケットがありません。");
      return;
    }
    try {
      setConsumeMessage(null);
      const res = await fetch(buildUrl(`/api/apple/consume/${appleResult.id}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
        },
      });
      if (!res.ok) throw new Error("チケットを使用できませんでした");
      const data = (await res.json()) as { purchase_available: number };
      setConsumeMessage("購入免除チケットを1枚使用しました。");
      setAppleResult((prev) => (prev ? { ...prev, purchase_available: data.purchase_available } : prev));
    } catch (err) {
      console.error(err);
      setConsumeMessage(err instanceof Error ? err.message : "チケット使用に失敗しました。");
    }
  };

  return (
    <UserFlowGuard requiredStatus="ready_to_draw">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 text-ringo-ink md:px-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-ringo-red">STEP.09</p>
          <h1 className="font-logo text-4xl font-bold">りんごを引く</h1>
          <p className="text-sm text-ringo-ink/70">
            24時間後に結果が分かるスリル満点のりんご抽選。友達紹介や動的RTPによって勝率が変動します。
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-bold">現在のりんご確率</h2>
            <p className="text-sm text-ringo-ink/70">
              Probability Design 仕様書準拠のベース値。紹介人数やRTPによりリアルタイムで調整されます。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(probabilityInfo
                ? probabilityOrder.map(({ key, label }) => ({
                    label,
                    value: `${(probabilityInfo.probabilities[key] * 100).toFixed(1)}%`,
                  }))
                : defaultProbabilities
              ).map((item) => (
                <div key={item.label} className="rounded-2xl bg-ringo-bg/70 p-4">
                  <p className="text-sm text-ringo-ink/70">{item.label}</p>
                  <p className="text-2xl font-bold text-ringo-red">{item.value}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={handleDraw} className="btn-primary mt-6 w-full" disabled={isLoading}>
              {isLoading ? "抽選中..." : "今すぐりんごを引く"}
            </button>
            {error && <p className="mt-3 text-sm text-ringo-red">{error}</p>}
            {probabilityError && <p className="mt-3 text-sm text-ringo-red">{probabilityError}</p>}
            {probabilityInfo?.reasons?.length ? (
              <div className="mt-6 rounded-2xl bg-white/70 p-4 text-xs text-ringo-ink/80">
                <p className="font-semibold text-ringo-red">確率が変動する理由</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {probabilityInfo.reasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-bold">あなたのステータス</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="text-ringo-ink/70">ユーザー:</span> {user?.email ?? "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">ステータス:</span> {user?.status ?? "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">紹介人数:</span> {probabilityInfo?.meta.referral_count ?? "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">シルバー/ゴールド完了:</span> {probabilityInfo?.meta.silver_gold_completed_count ?? "-"} 回
              </p>
              <p>
                <span className="text-ringo-ink/70">最終完了日:</span>{" "}
                {probabilityInfo?.meta.last_silver_gold_completed_at
                  ? new Date(probabilityInfo.meta.last_silver_gold_completed_at).toLocaleDateString()
                  : "まだ完了していません"}
              </p>
              <p>
                <span className="text-ringo-ink/70">RTP:</span> {probabilityInfo ? probabilityInfo.meta.rtp.toFixed(2) : "-"}
                {" ／ ブートストラップ: "}
                {probabilityInfo ? (probabilityInfo.meta.using_bootstrap ? "適用中" : "解除済み") : "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">予測RTP:</span> {probabilityInfo ? probabilityInfo.meta.predicted_rtp.toFixed(2) : "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">今月の新規登録:</span>{" "}
                {probabilityInfo ? probabilityInfo.meta.monthly_new_users : "-"}人
                {typeof probabilityInfo?.meta.growth_rate === "number" && (
                  <span className="text-ringo-ink/60">
                    （成長率 {(probabilityInfo.meta.growth_rate * 100).toFixed(1)}%）
                  </span>
                )}
              </p>
              <p className="text-ringo-ink/70">ステータスは Supabase の users テーブルから取得しています。</p>
            </div>
          </div>
        </section>

        {appleResult && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm">
              <h2 className="text-xl font-bold text-ringo-red">りんご結果</h2>
              <p className="mt-2 text-ringo-ink/70">24時間後に自動公開されます。最新の状態を確認しましょう。</p>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-ringo-ink/70">種別</dt>
                  <dd className="font-semibold text-ringo-ink">{appleResult.apple_type.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ringo-ink/70">状態</dt>
                  <dd className="font-semibold text-ringo-ink">{appleResult.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ringo-ink/70">公開済み</dt>
                  <dd className="font-semibold text-ringo-ink">{appleResult.is_revealed ? "はい" : "まだ"}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => fetchResult(String(appleResult.id))}
                className="mt-4 w-full rounded-ringo-pill border border-ringo-pink py-3 text-sm font-semibold text-ringo-pink transition hover:bg-ringo-pink/10"
              >
                {isResultLoading ? "更新中..." : "結果を更新"}
              </button>
            </div>

            <div className="rounded-3xl border border-ringo-gold/20 bg-ringo-beige/40 p-6 shadow-ringo-card text-sm">
              <h2 className="text-xl font-bold text-ringo-red">購入免除チケット</h2>
              <p className="mt-2 text-ringo-ink/70">シルバー以上のりんごで獲得したチケットは、次回購入をスキップできます。</p>
              <p className="mt-4 text-3xl font-bold text-ringo-red">{appleResult.purchase_available} 枚</p>
              <button
                type="button"
                onClick={handleConsume}
                disabled={appleResult.purchase_available <= 0}
                className="btn-primary mt-4 w-full"
              >
                チケットを使用する
              </button>
              {consumeMessage && <p className="mt-2 text-xs text-ringo-ink/70">{consumeMessage}</p>}
            </div>
          </section>
        )}


        {currentApple ? (
          <AppleReveal
            appleType={currentApple.appleType}
            drawTime={currentApple.drawTime}
            revealTime={currentApple.revealTime}
            status={currentApple.status}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-ringo-purple/40 bg-white/70 p-10 text-center text-sm text-ringo-ink/70">
            まだ抽選していません。りんごを引くボタンを押して、初めてのりんごカードを開いてみよう！
          </div>
        )}

        <section className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 text-sm shadow-ringo-card">
          <h2 className="text-xl font-bold">ルールのおさらい</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>抽選結果は24時間後に完全公開。途中経過でもドキドキ感を楽しめます。</li>
            <li>毒りんごを引いた場合、購入義務を果たした後に再挑戦できます。</li>
            <li>シルバー・ゴールド・赤りんごはチケットとして購入免除が付与され、完了時に紹介カウントが調整されます。</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-ringo-purple/20 bg-ringo-slate-light/40 p-6 text-sm shadow-ringo-card">
          <h2 className="text-xl font-bold text-ringo-red">友達紹介で確率アップ</h2>
          <p className="mt-2 text-ringo-ink/80">
            友達を招待すると紹介人数に応じてシルバー以上のりんごが出やすくなります。目標ハードルをクリアして特典を解放しましょう。
          </p>
          <Link href="/friends" className="btn-primary mt-4 inline-flex items-center justify-center px-6">
            友達紹介ページへ進む
          </Link>
        </section>
      </main>
    </UserFlowGuard>
  );
}
