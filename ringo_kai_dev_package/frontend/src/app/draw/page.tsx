"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppleReveal, AppleType } from "@/components/AppleReveal";
import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
import { authorizedFetch, fetchDashboard } from "@/lib/status";
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

const probabilityOrder: { key: AppleType; label: string; color: string }[] = [
  { key: "bronze", label: "ブロンズ", color: "bg-amber-600" },
  { key: "silver", label: "シルバー", color: "bg-gray-400" },
  { key: "gold", label: "ゴールド", color: "bg-yellow-400" },
  { key: "red", label: "赤りんご", color: "bg-red-500" },
  { key: "poison", label: "毒りんご", color: "bg-purple-600" },
];

const defaultProbabilities = {
  probabilities: {
    bronze: 0.55,
    silver: 0.25,
    gold: 0.12,
    red: 0.05,
    poison: 0.03,
  },
};

export default function DrawPage() {
  const { user } = useUser();
  const [currentApple, setCurrentApple] = useState<AppleRevealResponse | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleResult, setAppleResult] = useState<AppleResult | null>(null);
  const [isResultLoading, setResultLoading] = useState(false);
  const [probabilityInfo, setProbabilityInfo] = useState<ProbabilityResponse | null>(null);
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralNotice, setReferralNotice] = useState<string | null>(null);
  const [isCopying, setCopying] = useState(false);

  const mapApple = useCallback((payload: AppleApiResponse): AppleRevealResponse => ({
    id: String(payload.id),
    appleType: payload.apple_type,
    drawTime: payload.draw_time,
    revealTime: payload.reveal_time,
    status: payload.status,
  }), []);

  const fetchProbabilities = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authorizedFetch("/api/apple/probabilities", user.id, {
        cache: "no-store",
      });
      const data = (await res.json()) as ProbabilityResponse;
      setProbabilityInfo(data);
    } catch (err) {
      console.error("apple probabilities fetch failed", err);
    }
  }, [user]);

  const fetchResult = useCallback(
    async (appleId: string) => {
      if (!user) return;
      setResultLoading(true);
      try {
        const res = await authorizedFetch(`/api/apple/result/${appleId}`, user.id, {
          cache: "no-store",
        });
        const data = (await res.json()) as AppleResult;
        setAppleResult(data);
      } catch (err) {
        console.warn("apple result fetch failed", err);
      } finally {
        setResultLoading(false);
      }
    },
    [user]
  );

  const fetchCurrentApple = useCallback(async () => {
    if (!user) return;
      setLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch("/api/apple/current", user.id, {
        cache: "no-store",
      });
      const data = (await res.json()) as AppleApiResponse | null;
      const mapped = data ? mapApple(data) : null;
      setCurrentApple(mapped);
      if (mapped) {
        fetchResult(mapped.id);
      } else {
        setAppleResult(null);
      }
    } catch (err) {
      console.warn("apple fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [fetchResult, mapApple, user]);

  useEffect(() => {
    fetchCurrentApple();
    fetchProbabilities();
  }, [fetchCurrentApple, fetchProbabilities]);

  const handleDraw = async () => {
    if (!user) {
      setError("ログイン状態を確認してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch("/api/apple/draw", user.id, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ referral_count: 0 }),
      });
      const data = (await res.json()) as AppleApiResponse;
      const mapped = mapApple(data);
      setCurrentApple(mapped);
      fetchResult(mapped.id);
      fetchProbabilities();
    } catch (err) {
      console.error(err);
      setError("抽選できませんでした。時間を置いて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadReferral = async () => {
      try {
        const data = await fetchDashboard(user.id);
        if (cancelled) return;
        const code = data?.user?.referral_code as string | undefined;
        if (!code) {
          setReferralLink(null);
          setReferralError("紹介コードはまだ発行されていません。");
          return;
        }
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const link = origin ? `${origin}/register?ref=${code}` : code;
        setReferralLink(link);
        setReferralError(null);
        setReferralNotice(null);
      } catch (err) {
        console.warn("referral fetch failed", err);
        if (!cancelled) {
          setReferralError("紹介リンクの取得に失敗しました");
        }
      }
    };
    loadReferral();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCopyReferral = async () => {
    if (!referralLink || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      setCopying(true);
      await navigator.clipboard.writeText(referralLink);
      setReferralNotice("コピーしました！次回抽選の前に共有してください。");
    } catch (err) {
      console.warn("copy failed", err);
      setReferralNotice("コピーに失敗しました。手動で選択してください。");
    } finally {
      setCopying(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="ready_to_draw">
      <FlowLayout 
        currentStepIndex={5} 
        title="りんごを引く" 
        subtitle="運命の瞬間！どんなりんごが出るかな？"
      >
        <div className="space-y-8">
          {/* Main Draw Area */}
          <section className="bg-white/80 rounded-[2.5rem] p-8 shadow-ringo-card border border-white text-center relative overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ringo-pink to-ringo-red"></div>
             
             {currentApple ? (
               <div className="py-4">
                 <h2 className="text-xl font-bold text-ringo-rose mb-6">
                   あなたのりんごが育っています...🌱
                 </h2>
                 <div className="mx-auto mb-8">
                   <AppleReveal
                      appleId={currentApple.id}
                      appleType={currentApple.appleType}
                      drawTime={currentApple.drawTime}
                      revealTime={currentApple.revealTime}
                      status={currentApple.status}
                    />
                 </div>
                 
                 {appleResult && (
                   <div className="bg-ringo-bg/50 rounded-xl p-4 mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">状態</span>
                        <span className="font-bold">{appleResult.status}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchResult(String(appleResult.id))}
                        className="btn-secondary py-2 text-sm w-full"
                      >
                        {isResultLoading ? "更新中..." : "状態を更新する"}
                      </button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="py-10">
                 <div className="text-6xl mb-6 animate-bounce">🍎</div>
                 <h2 className="text-2xl font-bold text-ringo-ink mb-2">りんごを引く準備完了！</h2>
                 <p className="text-gray-500 mb-8 text-sm">
                   ボタンを押すと抽選が始まります。<br/>
                   結果は24時間後にわかります。
                 </p>
                 <button 
                   type="button" 
                   onClick={handleDraw} 
                   className="btn-primary w-full shadow-lg text-lg py-4" 
                   disabled={isLoading}
                 >
                   {isLoading ? "抽選中..." : "運命のりんごを引く！"}
                 </button>
                 {error && <p className="mt-4 text-ringo-red text-sm bg-ringo-red/10 p-2 rounded">{error}</p>}
               </div>
             )}
          </section>

          {/* Probabilities */}
          <section className="bg-white/60 rounded-2xl p-6 border border-ringo-pink-soft/30">
            <h3 className="text-sm font-bold text-ringo-ink mb-4 flex items-center justify-between">
              <span>📊 現在の確率</span>
              <span className="text-xs font-normal text-gray-400">リアルタイム変動中</span>
            </h3>
            
            <div className="space-y-3">
              {(probabilityInfo || defaultProbabilities).probabilities &&
                probabilityOrder.map(({ key, label, color }) => {
                  const info = probabilityInfo || defaultProbabilities;
                  const percent = info.probabilities[key]
                    ? info.probabilities[key] * 100
                    : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{label}</span>
                        <span className="font-bold">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${color}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Friends CTA */}
          <section className="bg-gradient-to-r from-ringo-rose to-ringo-pink rounded-2xl p-6 shadow-md text-ringo-ink">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white/90">お友達を招待する</h3>
                <p className="text-xs text-white/80">
                  今回のりんごには影響しませんが、次回の抽選確率がぐっと上がります。
                </p>
              </div>
              <div className="text-3xl">👯‍♀️</div>
            </div>
            <div className="mt-4 rounded-2xl bg-white/85 p-4 text-left">
              {referralLink ? (
                <>
                  <p className="text-xs font-semibold text-ringo-rose">紹介リンク</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 truncate rounded-xl border border-ringo-pink-soft bg-white px-3 py-2 text-sm text-ringo-ink">
                      {referralLink}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="btn-secondary bg-ringo-rose text-white"
                      disabled={isCopying}
                    >
                      {isCopying ? "コピー中..." : "コピー"}
                    </button>
                  </div>
                  {referralNotice && (
                    <p className="mt-2 text-xs text-gray-600">{referralNotice}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {referralError ?? "紹介リンクを読み込み中です..."}
                </p>
              )}
              <p className="mt-2 text-[11px] text-gray-500">
                ※ 次のりんごを引く瞬間に紹介人数が確率へ反映されます。
              </p>
              <Link href="/friends" className="mt-3 inline-flex items-center text-sm font-bold text-ringo-rose">
                詳細を見る →
              </Link>
            </div>
          </section>

          {/* Tech Info Toggle */}
          <div className="text-center pt-4">
            <button 
              onClick={() => setShowTechInfo(!showTechInfo)}
              className="text-xs text-gray-300 underline"
            >
              {showTechInfo ? "詳細情報を隠す" : "詳細情報を表示"}
            </button>
            
            {showTechInfo && probabilityInfo && (
              <div className="mt-4 text-left text-xs text-gray-400 bg-gray-50 p-4 rounded-xl space-y-1">
                 <p>RTP: {probabilityInfo.meta.rtp.toFixed(3)}</p>
                 <p>Predicted RTP: {probabilityInfo.meta.predicted_rtp.toFixed(3)}</p>
                 <p>User Growth: {(probabilityInfo.meta.growth_rate * 100).toFixed(1)}%</p>
                 <p>Silver/Gold Completed: {probabilityInfo.meta.silver_gold_completed_count}</p>
                 <div className="mt-2 border-t pt-2">
                   <p className="font-bold">変動理由:</p>
                   <ul className="list-disc pl-4">
                     {probabilityInfo.reasons.map((r, i) => <li key={i}>{r}</li>)}
                   </ul>
                 </div>
              </div>
            )}
          </div>
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
