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
          <section className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-ringo-card border-2 border-white text-center relative overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ringo-pink to-ringo-red"></div>
             
             {currentApple ? (
               <div className="py-4">
                 <h2 className="text-xl font-bold text-ringo-rose mb-6 flex items-center justify-center gap-2">
                   <span>🌱</span>
                   <span>あなたのりんごが育っています</span>
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
                   <div className="bg-ringo-bg/50 rounded-xl p-4 mt-6 border border-ringo-pink-soft">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">状態</span>
                        <span className="font-bold text-ringo-ink">{appleResult.status}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchResult(String(appleResult.id))}
                        className="btn-secondary py-2 text-sm w-full bg-white text-ringo-rose border-ringo-rose hover:bg-ringo-bg"
                      >
                        {isResultLoading ? "更新中..." : "状態を更新する"}
                      </button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="py-10">
                 <div className="text-7xl mb-6 animate-bounce drop-shadow-md">🍎</div>
                 <h2 className="text-3xl font-bold text-ringo-ink mb-3">運命のりんごを引く</h2>
                 <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                   1日1回、不思議なりんごを育てよう。<br/>
                   どんな色が実るかは、あなたの運とコミュニティ次第。
                 </p>
                 <button 
                   type="button" 
                   onClick={handleDraw} 
                   className="btn-primary w-full shadow-xl text-lg py-5 hover:scale-105 active:scale-95 transition-transform" 
                   disabled={isLoading}
                 >
                   {isLoading ? "準備中..." : "今すぐりんごを育てる！"}
                 </button>
                 {error && <p className="mt-4 text-ringo-red text-sm bg-ringo-red/10 p-3 rounded-lg font-bold">{error}</p>}
               </div>
             )}
          </section>

          {/* Probabilities */}
          <section className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white shadow-sm">
            <h3 className="text-sm font-bold text-ringo-ink mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>現在の確率テーブル</span>
              </span>
              <span className="text-[10px] font-normal text-white bg-ringo-rose/80 px-2 py-1 rounded-full">変動あり</span>
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
                        <span className="font-medium">{label}</span>
                        <span className="font-bold">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full ${color} transition-all duration-1000 ease-out`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Friends CTA */}
          <section className="bg-gradient-to-br from-ringo-rose to-ringo-pink rounded-3xl p-1 shadow-lg text-ringo-ink relative overflow-hidden">
            <div className="bg-white/90 backdrop-blur-md rounded-[1.4rem] p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-ringo-rose">お友達招待キャンペーン</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    招待数に応じて次回の確率がアップ！<br/>みんなで確率を育てよう。
                  </p>
                </div>
                <div className="text-4xl filter drop-shadow-md">💌</div>
              </div>
              
              <div className="mt-4 p-4 bg-ringo-bg/50 rounded-xl border border-ringo-pink-soft">
                {referralLink ? (
                  <>
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">あなたの招待リンク</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <code className="flex-1 truncate rounded-xl border-2 border-ringo-pink-soft bg-white px-4 py-3 text-sm text-ringo-ink font-mono shadow-sm">
                        {referralLink}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyReferral}
                        className="btn-primary py-3 px-6 text-sm whitespace-nowrap shadow-md"
                        disabled={isCopying}
                      >
                        {isCopying ? "コピー中" : "コピー"}
                      </button>
                    </div>
                    {referralNotice && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-ringo-green bg-white p-2 rounded-lg border border-ringo-green/30">
                        <span>✅</span>
                        {referralNotice}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 animate-pulse">
                    {referralError ?? "招待リンクを準備中..."}
                  </p>
                )}
                
                <div className="mt-4 pt-4 border-t border-ringo-pink-soft/50 flex justify-between items-center">
                   <p className="text-[10px] text-gray-400">
                     ※ 確率反映は次回の抽選時となります
                   </p>
                   <Link href="/friends" className="text-xs font-bold text-ringo-rose hover:underline flex items-center gap-1">
                     詳しく見る <span>→</span>
                   </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Probability Status (Friendly Version) */}
          {probabilityInfo && (
            <div className="mt-8 text-center">
               <div className="inline-block bg-white/40 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/50 text-left w-full max-w-md mx-auto">
                 <p className="text-xs font-bold text-gray-400 mb-3 text-center uppercase tracking-widest">現在の確率ステータス</p>
                 <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                   <div className="bg-white/60 p-3 rounded-xl text-center">
                     <p className="text-[10px] text-gray-500 mb-1">ユーザー成長率</p>
                     <p className="font-bold text-ringo-ink text-lg">{(probabilityInfo.meta.growth_rate * 100).toFixed(0)}%</p>
                   </div>
                   <div className="bg-white/60 p-3 rounded-xl text-center">
                     <p className="text-[10px] text-gray-500 mb-1">現在の招待数</p>
                     <p className="font-bold text-ringo-ink text-lg">{probabilityInfo.meta.referral_count}人</p>
                   </div>
                 </div>
                 
                 {probabilityInfo.reasons.length > 0 && (
                   <div className="bg-ringo-rose/5 p-3 rounded-xl border border-ringo-rose/10">
                     <p className="text-[10px] font-bold text-ringo-rose mb-1">📢 変動理由</p>
                     <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                       {probabilityInfo.reasons.map((r, i) => <li key={i}>{r}</li>)}
                     </ul>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
