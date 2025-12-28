"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { fetchDashboard } from "@/lib/status";
import { statusOrder, useUser, type UserStatus } from "@/lib/user";

type NextAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

type DashboardSnapshot = {
  stats?: {
    referral_count?: number;
    purchase_obligation?: number;
    purchase_available?: number;
  };
};

const statusLabels: Record<UserStatus, string> = {
  registered: "はじめる前",
  terms_agreed: "説明を読む",
  tutorial_completed: "購入に進む",
  ready_to_purchase: "購入報告へ",
  verifying: "確認待ち",
  first_purchase_completed: "リスト登録へ",
  ready_to_draw: "抽選OK",
  active: "利用中",
};

const flowSteps: Array<{
  label: string;
  description: string;
  href: string;
  requiredStatus: UserStatus;
}> = [
  { label: "利用規約", description: "まずは規約に同意", href: "/terms", requiredStatus: "registered" },
  { label: "遊び方", description: "流れを3分で理解", href: "/tutorial", requiredStatus: "terms_agreed" },
  { label: "お相手を決めて購入", description: "Amazonでギフト購入", href: "/purchase", requiredStatus: "tutorial_completed" },
  { label: "スクショ提出", description: "購入完了画面を送信", href: "/upload-screenshot", requiredStatus: "ready_to_purchase" },
  { label: "確認待ち", description: "承認されるまで待機", href: "/verification-pending", requiredStatus: "verifying" },
  { label: "リスト登録", description: "あなたの欲しい物リスト", href: "/register-wishlist", requiredStatus: "first_purchase_completed" },
  { label: "りんご抽選", description: "24時間後に結果", href: "/draw", requiredStatus: "ready_to_draw" },
];

const getDefaultNextAction = (status: UserStatus): NextAction => {
  switch (status) {
    case "registered":
      return { title: "利用規約に同意する", description: "まずはここからスタート", href: "/terms", icon: "📄" };
    case "terms_agreed":
      return { title: "遊び方を見る", description: "次にやることを確認", href: "/tutorial", icon: "📘" };
    case "tutorial_completed":
    case "ready_to_purchase":
      return { title: "購入を進める", description: "お相手を決めてギフトを購入", href: "/purchase", icon: "🎁" };
    case "verifying":
      return { title: "審査状況を見る", description: "スクショ確認が終わるまで待機", href: "/verification-pending", icon: "🕵️‍♀️" };
    case "first_purchase_completed":
      return { title: "欲しい物リストを登録", description: "次に抽選へ進めます", href: "/register-wishlist", icon: "🔗" };
    case "ready_to_draw":
    case "active":
    default:
      return { title: "りんごを引く", description: "抽選して24時間後に結果発表", href: "/draw", icon: "🍎" };
  }
};

export function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const { user } = useUser();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Fetch lightweight user stats when the menu opens (for "次にやること" guidance)
  useEffect(() => {
    if (!isOpen) return;
    if (!user) {
      setDashboard(null);
      setDashboardError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const payload = (await fetchDashboard(user.id)) as DashboardSnapshot;
        if (!cancelled) {
          setDashboard(payload);
          setDashboardError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("dashboard fetch failed", err);
          setDashboard(null);
          setDashboardError("メニュー用データの取得に失敗しました");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  // Trap focus and handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab") {
        if (!menuRef.current) return;
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus first element when opened
    const timer = setTimeout(() => {
      const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const userStatusIndex = useMemo(() => {
    if (!user) return -1;
    return statusOrder.indexOf(user.status);
  }, [user]);

  const nextAction: NextAction | null = useMemo(() => {
    if (!user) return null;

    const stats = dashboard?.stats ?? {};
    const purchaseObligation = Number(stats.purchase_obligation ?? 0);
    const purchaseAvailable = Number(stats.purchase_available ?? 0);

    if (purchaseObligation > 0) {
      return {
        title: "購入義務を消化する",
        description: `あと ${purchaseObligation} 回の購入が必要です`,
        href: "/purchase",
        icon: "🎁",
      };
    }

    if (user.status === "verifying") {
      return getDefaultNextAction(user.status);
    }

    if (user.status === "first_purchase_completed") {
      return getDefaultNextAction(user.status);
    }

    if (purchaseAvailable > 0 && userStatusIndex >= statusOrder.indexOf("ready_to_draw")) {
      return {
        title: "チケットを使う / りんごを引く",
        description: `購入免除チケットが ${purchaseAvailable} 枚あります`,
        href: "/draw",
        icon: "🎟",
      };
    }

    return getDefaultNextAction(user.status);
  }, [dashboard?.stats, user, userStatusIndex]);

  const navItems = useMemo(
    () => [
      { label: "マイページ", description: "状況まとめ", path: "/dashboard", icon: "🏠", requiredStatus: "first_purchase_completed" as const },
      { label: "りんご抽選", description: "抽選・結果・チケット", path: "/draw", icon: "🍎", requiredStatus: "ready_to_draw" as const },
      { label: "友達紹介", description: "確率アップの近道", path: "/friends", icon: "👯‍♀️", requiredStatus: "verifying" as const },
      { label: "購入", description: "お相手のギフト購入", path: "/purchase", icon: "🎁", requiredStatus: "tutorial_completed" as const },
      { label: "利用規約", description: "ルール確認", path: "/terms", icon: "📄", requiredStatus: "registered" as const },
      { label: "プライバシー", description: "個人情報について", path: "/privacy", icon: "🔒" },
    ],
    []
  );

  const canAccessStatus = (required: UserStatus) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    const requiredIndex = statusOrder.indexOf(required);
    if (requiredIndex === -1 || userStatusIndex === -1) return false;
    return userStatusIndex >= requiredIndex;
  };

  return (
    <div className="relative z-50">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-11 px-3 rounded-full bg-white/90 shadow-sm border border-ringo-pink-soft/60 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-ringo-rose"
        aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
      >
        <span className="flex flex-col justify-center gap-1.5 w-5 h-5">
          <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-transform duration-300 ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-opacity duration-300 ${isOpen ? "opacity-0" : ""}`} />
          <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-transform duration-300 ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </span>
        <span className="text-[11px] font-bold text-gray-600 hidden sm:block">メニュー</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Panel */}
      <div 
        id="navigation-menu"
        ref={menuRef}
        className={`fixed top-0 right-0 h-full w-64 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-ringo-pink-soft/30 pt-20 px-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーションメニュー"
        aria-hidden={!isOpen}
      >
        {isOpen ? (
          <div className="space-y-6">
            <div>
              <div className="text-xs text-gray-400">ログイン中</div>
              <div className="text-sm font-bold text-ringo-ink break-all">
                {user?.email ?? "-"}
              </div>
              {user && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-ringo-bg px-3 py-1 text-[11px] font-bold text-ringo-ink border border-ringo-pink-soft/60">
                  <span className="text-ringo-rose">●</span>
                  <span>現在: {statusLabels[user.status]}</span>
                </div>
              )}
            </div>

            {nextAction && (
              <div className="rounded-2xl bg-ringo-bg/70 border border-ringo-pink-soft/70 p-4">
                <div className="text-[11px] font-bold text-ringo-rose tracking-wide">次にやること</div>
                <Link
                  href={nextAction.href}
                  onClick={() => setIsOpen(false)}
                  className="mt-2 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-white outline-none focus:ring-2 focus:ring-ringo-rose"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{nextAction.icon}</span>
                    <span className="text-sm font-bold text-ringo-ink">{nextAction.title}</span>
                  </div>
                  <span className="text-ringo-rose font-bold">→</span>
                </Link>
                <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">{nextAction.description}</p>
                {dashboardError && <p className="mt-2 text-[11px] text-ringo-red">{dashboardError}</p>}
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-wide">進み方（やることリスト）</div>
              <div className="mt-2 space-y-2">
                {flowSteps.map((step) => {
                  const accessible = canAccessStatus(step.requiredStatus);
                  const requiredIndex = statusOrder.indexOf(step.requiredStatus);
                  const completed = userStatusIndex !== -1 && userStatusIndex > requiredIndex;
                  const isNext = userStatusIndex !== -1 && userStatusIndex === requiredIndex;
                  const isActive = pathname === step.href;

                  const baseClass =
                    "flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors outline-none focus:ring-2 focus:ring-ringo-rose";

                  const content = (
                    <>
                      <span className="text-lg leading-none mt-0.5">
                        {completed ? "✅" : isNext ? "👉" : accessible ? "🔓" : "🔒"}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold ${isActive ? "text-ringo-rose" : "text-ringo-ink"}`}>
                          {step.label}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{step.description}</div>
                      </div>
                    </>
                  );

                  if (accessible) {
                    return (
                      <Link
                        key={step.href}
                        href={step.href}
                        onClick={() => setIsOpen(false)}
                        className={`${baseClass} ${
                          isNext
                            ? "bg-white border-ringo-rose/40"
                            : isActive
                              ? "bg-ringo-bg border-ringo-pink-soft"
                              : "bg-white/60 border-white hover:bg-white"
                        }`}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div key={step.href} className={`${baseClass} bg-gray-50 border-gray-100 opacity-70 cursor-not-allowed`}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>

            <nav className="space-y-2">
              <div className="text-[11px] font-bold text-gray-400 tracking-wide">メニュー</div>
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                const accessible = item.requiredStatus ? canAccessStatus(item.requiredStatus) : true;

                if (!accessible) {
                  return (
                    <div
                      key={item.path}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 opacity-75 cursor-not-allowed"
                    >
                      <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{item.label}</div>
                        <div className="text-[11px] text-gray-400 truncate">{item.description}</div>
                      </div>
                      <span className="text-[11px] text-gray-400 font-bold">未解放</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all outline-none focus:ring-2 focus:ring-ringo-rose ${
                      isActive
                        ? "bg-ringo-bg text-ringo-rose border border-ringo-pink-soft font-bold"
                        : "bg-white/60 border border-white text-gray-700 hover:bg-white hover:text-ringo-ink"
                    }`}
                  >
                    <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-[11px] text-gray-500 truncate">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {user?.isAdmin && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 tracking-wide">管理者専用</div>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-ringo-purple/30 bg-white/80 px-4 py-3 text-sm font-bold text-ringo-indigo outline-none transition hover:border-ringo-rose hover:bg-white focus:ring-2 focus:ring-ringo-rose"
                >
                  <span className="text-lg">🛡️</span>
                  <div>
                    <p>管理者ダッシュボード</p>
                    <p className="text-[11px] font-normal text-gray-500">AI審査 & ユーザー管理</p>
                  </div>
                </Link>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 bg-white/60 border border-white hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left outline-none focus:ring-2 focus:ring-red-200"
            >
              <span className="text-xl">🚪</span>
              <span className="font-bold text-sm">ログアウト</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
