"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
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
  3: "初級：まずは身近な友達にシェア！",
  5: "中級：SNSでの発信に挑戦しよう",
  10: "上級：りんご会♪のアンバサダーかも？",
  20: "達人：コミュニティのスターです✨",
  30: "伝説：VIPプログラムへご招待！？",
};

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
      setClaimMessage({ type: "success", text: "リンクをコピーしました！" });
    } catch (err) {
      console.error(err);
      setClaimMessage({ type: "error", text: "コピーに失敗しました。" });
    }
  };

  const handleClaim = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !summary) return;
    if (!summary.can_claim_code) {
      setClaimMessage({ type: "error", text: "紹介コードは登録済みです。" });
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

  return (
    <UserFlowGuard requiredStatus="verifying">
      <FlowLayout 
        currentStepIndex={5} 
        title="お友達招待" 
        subtitle="友達と一緒に楽しんで、レアりんご確率UP！"
        showBack
      >
        <div className="space-y-6">
           {claimMessage && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm text-center font-bold ${
                claimMessage.type === "success"
                  ? "border-ringo-green bg-ringo-green/10 text-ringo-green"
                  : "border-ringo-red bg-ringo-red/10 text-ringo-red"
              }`}
            >
              {claimMessage.text}
            </div>
          )}

          {isLoading ? (
             <div className="text-center py-10 text-gray-400">読み込み中...</div>
          ) : error ? (
             <div className="text-center py-10 text-ringo-red">{error}</div>
          ) : summary ? (
             <>
               {/* Stats Card */}
               <section className="bg-gradient-to-br from-ringo-rose to-ringo-pink text-white rounded-[2rem] p-6 shadow-ringo-card text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="relative z-10">
                     <p className="text-sm font-bold opacity-90 mb-2">現在の紹介人数</p>
                     <div className="text-5xl font-bold mb-4">
                       {summary.referral_count} <span className="text-lg">人</span>
                     </div>
                     
                     <div className="bg-white/20 rounded-full h-4 w-full max-w-xs mx-auto mb-2 overflow-hidden backdrop-blur-sm">
                       <div 
                         className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                         style={{ width: `${summary.progress_percent}%` }}
                       ></div>
                     </div>
                     <p className="text-xs font-bold">
                       次のレベルまで あと {summary.next_threshold ? summary.next_threshold - summary.referral_count : 0} 人！
                     </p>
                  </div>
               </section>

               {/* Share Link */}
               <section className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
                  <h2 className="text-lg font-bold text-ringo-rose mb-4 text-center">
                    💌 あなたの紹介リンク
                  </h2>
                  <div className="bg-ringo-bg p-4 rounded-xl text-center mb-4 border border-ringo-pink-soft break-all font-mono text-sm text-gray-600">
                    {referralLink}
                  </div>
                  <button onClick={handleCopy} className="btn-primary w-full shadow-lg">
                    リンクをコピーする
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    ※ 登録時にこのコードが自動で入力されます
                  </p>
               </section>

               {/* Claim Code */}
               <section className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
                  <h2 className="text-lg font-bold text-ringo-poison mb-4 text-center">
                    🤝 紹介された方へ
                  </h2>
                  {summary.referred_by ? (
                    <div className="text-center bg-ringo-purple/10 p-4 rounded-xl text-ringo-poison font-bold">
                      <p>あなたは {summary.referred_by} さんから紹介されました ✨</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 text-center">
                        紹介コードをお持ちの場合は、ここに入力してください。
                      </p>
                      <form onSubmit={handleClaim} className="flex gap-2">
                         <input 
                           type="text" 
                           value={claimCode}
                           onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                           placeholder="コード (例: ABC12)"
                           className="flex-1 rounded-full border border-ringo-pink-soft px-4 py-2 text-center outline-none focus:border-ringo-poison transition-colors"
                         />
                         <button 
                           type="submit" 
                           className="btn-secondary py-2 px-4 text-sm whitespace-nowrap"
                           disabled={!summary.can_claim_code}
                         >
                           登録
                         </button>
                      </form>
                    </div>
                  )}
               </section>

               {/* Hurdles */}
               <section className="space-y-3">
                  <h2 className="text-center font-bold text-gray-400 text-sm">🏆 ランクアップ特典</h2>
                  {summary.thresholds.map((t) => (
                    <div 
                      key={t.count} 
                      className={`flex items-center gap-4 p-4 rounded-2xl border ${
                        t.status === 'completed' 
                          ? 'bg-white border-ringo-gold shadow-sm' 
                          : t.status === 'active' 
                            ? 'bg-white border-ringo-pink shadow-md transform scale-105' 
                            : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${t.status === 'completed' ? 'bg-ringo-gold text-white' : 'bg-gray-200 text-gray-400'}
                      `}>
                        {t.count}
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${t.status === 'active' ? 'text-ringo-rose' : 'text-gray-600'}`}>
                          {t.count}人紹介
                        </p>
                        <p className="text-xs text-gray-400">
                          {hurdleDescriptions[t.count]}
                        </p>
                      </div>
                      {t.status === 'completed' && <span className="text-xl">✅</span>}
                    </div>
                  ))}
               </section>
             </>
          ) : null}
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
