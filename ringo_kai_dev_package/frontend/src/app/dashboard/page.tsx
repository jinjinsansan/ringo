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

  // Determine priority action based on user status and stats
  const getHeroAction = () => {
    if (!user) return null;
    
    // 1. Purchase Obligation
    if ((stats.purchase_obligation ?? 0) > 0) {
      return {
        label: "購入義務があります",
        desc: "あと " + stats.purchase_obligation + " 回の購入が必要です",
        button: "購入ページへ",
        href: "/purchase",
        color: "from-ringo-red to-ringo-rose",
        icon: "🎁"
      };
    }

    // 2. Pending Verification
    if (user.status === "verifying") {
      return {
        label: "確認待ちです",
        desc: "スクショの承認をお待ちください",
        button: "状況を確認",
        href: "/verification-pending",
        color: "from-ringo-purple to-ringo-pink",
        icon: "🕵️‍♀️"
      };
    }

    // 3. Purchase Available (Ticket)
    if ((stats.purchase_available ?? 0) > 0) {
      return {
        label: "チケットが使えます",
        desc: "購入免除チケットを持っています",
        button: "りんごを引く",
        href: "/draw",
        color: "from-ringo-gold to-yellow-400",
        icon: "🎟"
      };
    }

    // 4. Default: Draw Apple
    return {
      label: "りんごを引こう！",
      desc: "24時間のドキドキを楽しもう",
      button: "抽選ページへ",
      href: "/draw",
      color: "from-ringo-rose to-ringo-pink",
      icon: "🍎"
    };
  };

  const heroAction = getHeroAction();

  return (
    <UserFlowGuard requiredStatus="first_purchase_completed">
      <div className="min-h-screen bg-ringo-bg pb-20 font-body text-ringo-ink">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-ringo-pink-soft/50 shadow-sm px-6 py-4 flex items-center justify-between">
          <h1 className="font-logo font-bold text-xl text-ringo-rose">🍎 マイページ</h1>
          {/* NavigationMenu is now global in layout */}
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {error && <p className="bg-ringo-red/10 border border-ringo-red/30 text-ringo-red p-4 rounded-2xl text-center">{error}</p>}

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">データを読み込んでいます...</div>
          ) : (
            <>
              {/* Hero Action Card */}
              {heroAction && (
                <section className={`bg-gradient-to-br ${heroAction.color} text-white rounded-[2.5rem] p-8 shadow-lg relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                      <div className="text-sm font-bold opacity-90 mb-1 tracking-wider uppercase">Next Action</div>
                      <h2 className="text-3xl md:text-4xl font-bold font-logo mb-2">{heroAction.label}</h2>
                      <p className="text-white/90 text-sm md:text-base">{heroAction.desc}</p>
                    </div>
                    <Link 
                      href={heroAction.href}
                      className="bg-white text-ringo-rose px-8 py-4 rounded-full font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="text-2xl">{heroAction.icon}</span>
                      {heroAction.button}
                    </Link>
                  </div>
                </section>
              )}

              {/* Main Actions Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Link href="/draw" className="group bg-gradient-to-br from-ringo-rose to-ringo-pink text-white p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                    <div className="text-4xl mb-2 group-hover:animate-bounce">🍎</div>
                    <h2 className="font-bold text-lg">りんごを引く</h2>
                    <p className="text-xs opacity-90">運試しに挑戦！</p>
                 </Link>
                 <Link href="/friends" className="group bg-white border-2 border-ringo-purple/20 p-6 rounded-[2rem] shadow-sm hover:border-ringo-purple transition-all hover:scale-[1.02]">
                    <div className="text-4xl mb-2">👯‍♀️</div>
                    <h2 className="font-bold text-lg text-ringo-purple">友達紹介</h2>
                    <p className="text-xs text-gray-500">紹介人数: <span className="font-bold">{stats.referral_count ?? 0}</span>人</p>
                 </Link>
                 <Link href="/purchase" className="group bg-white border-2 border-ringo-green/20 p-6 rounded-[2rem] shadow-sm hover:border-ringo-green transition-all hover:scale-[1.02]">
                    <div className="text-4xl mb-2">🎁</div>
                    <h2 className="font-bold text-lg text-ringo-green">購入状況</h2>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                       <span>義務: {stats.purchase_obligation}</span>
                       <span>免除: {stats.purchase_available}</span>
                    </div>
                 </Link>
              </section>

              {/* Apples Collection */}
              <section className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
                <h2 className="text-lg font-bold text-ringo-ink mb-4 flex items-center gap-2">
                   <span>🧺</span> りんごコレクション
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(appleLabels).map(([key, label]) => (
                    <div key={key} className="bg-ringo-bg rounded-2xl p-3 text-center border border-ringo-pink-soft/30">
                      <div className="text-2xl mb-1 font-bold text-ringo-ink">{apples[key] ?? 0}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Info Grid */}
              <section className="grid gap-6 md:grid-cols-2">
                {/* Wishlist */}
                <div className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
                  <h2 className="text-lg font-bold text-ringo-ink mb-4">📝 欲しいものリスト</h2>
                  {data?.user?.wishlist_url ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-500 break-all border border-gray-100">
                        {data.user.wishlist_url}
                      </div>
                      <a 
                        href={data.user.wishlist_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-secondary w-full text-center text-xs py-2 block"
                      >
                        リストを確認する
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400 mb-4">まだ登録されていません</p>
                      <Link href="/register-wishlist" className="btn-primary w-full text-sm py-2">
                        登録する
                      </Link>
                    </div>
                  )}
                </div>

                {/* Share */}
                <div className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
                  <h2 className="text-lg font-bold text-ringo-ink mb-4">🔗 シェア用リンク</h2>
                  {referralLink ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopy}
                          className="flex-1 btn-secondary text-xs py-2 border-ringo-pink text-ringo-pink"
                        >
                          {copied ? "コピー完了！" : "リンクをコピー"}
                        </button>
                        <button
                          onClick={() => setShowQr(!showQr)}
                          className="flex-1 btn-secondary text-xs py-2 border-ringo-purple text-ringo-purple"
                        >
                          QRコード
                        </button>
                      </div>
                      {showQr && (
                        <div className="flex justify-center bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                           <QRCode value={referralLink} size={120} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">読み込み中...</p>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </UserFlowGuard>
  );
}
