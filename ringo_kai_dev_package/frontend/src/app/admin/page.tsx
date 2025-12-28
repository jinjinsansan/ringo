"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@/lib/user";

const adminCards = [
  {
    title: "審査ワークスペース",
    description: "AI結果とOCR照合を全件確認し、最終承認を行います。",
    href: "/admin/verifications",
    accent: "bg-ringo-pink/20 text-ringo-pink",
    icon: "🧾",
  },
  {
    title: "システムダッシュボード",
    description: "全体メトリクス・RTP・りんご内訳を確認。",
    href: "/admin/dashboard",
    accent: "bg-ringo-green/20 text-ringo-green",
    icon: "📊",
  },
  {
    title: "ユーザー管理",
    description: "ステータス調整・チケット配布・紹介コード検索。",
    href: "/admin/users",
    accent: "bg-ringo-indigo/20 text-ringo-indigo",
    icon: "👤",
  },
];

export default function AdminLandingPage() {
  const { user } = useUser();
  const isAdmin = user?.isAdmin;

  const welcome = useMemo(() => {
    if (!user) return "ログイン情報を確認しています";
    return `${user.email} としてログイン中`;
  }, [user]);

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center text-ringo-ink">
        <p className="text-sm font-semibold text-ringo-rose">管理者専用ページ</p>
        <h1 className="font-logo text-4xl font-bold">アクセス権が必要です</h1>
        <p className="text-sm text-gray-500">管理チームに登録されたメールアドレスでログインし、管理者トークンを入力してください。</p>
        <Link href="/" className="btn-secondary">
          ホームへ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-ringo-ink">
      <header className="rounded-3xl border border-ringo-pink-soft bg-white/90 p-8 shadow-ringo-card">
        <p className="text-sm font-semibold text-ringo-rose">管理者パネル</p>
        <h1 className="mt-2 font-logo text-4xl font-bold">りんご会♪ Ops Dashboard</h1>
        <p className="mt-3 text-sm text-gray-600">
          欲しいものリストのマッチング状況、AI審査の進行、ユーザーの義務/免除と紹介状況をここからすべて操作できます。
        </p>
        <p className="mt-2 text-xs text-gray-400">{welcome}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-ringo-purple/20 bg-white/90 p-5 shadow-ringo-card transition hover:border-ringo-rose/60 hover:shadow-lg"
          >
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${card.accent}`}>
              <span>{card.icon}</span>
              <span>メニュー</span>
            </span>
            <h2 className="mt-3 text-lg font-bold text-ringo-ink">{card.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{card.description}</p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-ringo-rose">開く →</span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-ringo-bg/70 p-6 text-sm text-gray-600">
        <h2 className="text-base font-semibold text-ringo-ink">運用メモ</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>審査ワークスペースでの最終承認後、自動でユーザーステータスが更新されます。</li>
          <li>管理者APIトークンはページ毎に入力できますが、ブラウザに安全に保存されます。</li>
          <li>AI判定に疑問がある場合はスクリーンショットプレビューとOCR結果を照合してください。</li>
        </ul>
      </section>
    </main>
  );
}
