"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { createSupabaseClient } from "@/lib/supabase/client";
import { updateUserStatus } from "@/lib/status";
import { useUser } from "@/lib/user";

type WishlistAssignment = {
  alias: string;
  itemName: string;
  price: number;
  link: string;
};

const mockAssignments: WishlistAssignment[] = [
  {
    alias: "りんごネーム #832",
    itemName: "ローズゴールド マグカップ",
    price: 3200,
    link: "https://amazon.jp/hz/wishlist/xxx",
  },
  {
    alias: "スターりんご #124",
    itemName: "ふわもこタオルセット",
    price: 3600,
    link: "https://amazon.jp/hz/wishlist/yyy",
  },
];

export default function PurchasePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { user, refresh } = useUser();
  const [assignment, setAssignment] = useState<WishlistAssignment | null>(null);
  const [isUpdating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAssignment = async () => {
    if (!user) {
      setError("ユーザー情報が見つかりません。ログインし直してください。");
      return;
    }

    setAssignment(mockAssignments[Math.floor(Math.random() * mockAssignments.length)]);
    try {
      setUpdating(true);
      setError(null);
      const { error: updateError } = await updateUserStatus(supabase, user.id, "ready_to_purchase");
      if (updateError) throw updateError;
      await refresh();
    } catch (err) {
      console.error(err);
      setError("ステータス更新に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setUpdating(false);
    }
  };

  const markScreenshotSubmitted = async () => {
    if (!user) {
      setError("ユーザー情報が見つかりません。ログインし直してください。");
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      const { error: updateError } = await updateUserStatus(supabase, user.id, "verifying");
      if (updateError) throw updateError;
      await refresh();
      router.push("/verification-pending");
    } catch (err) {
      console.error(err);
      setError("スクリーンショット提出後の処理に失敗しました。");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="tutorial_completed">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-ringo-ink">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-ringo-red">STEP.05 / 06</p>
          <h1 className="font-logo text-4xl font-bold">誰かの欲しいものを購入する</h1>
          <p className="text-sm text-ringo-ink/70">ランダムに割り当てられたリストから商品を購入し、スクリーンショットを提出します。</p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">購入対象</h2>
            {assignment ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="text-ringo-ink/70">匿名ユーザー:</span> {assignment.alias}
                </p>
                <p>
                  <span className="text-ringo-ink/70">商品名:</span> {assignment.itemName}
                </p>
                <p>
                  <span className="text-ringo-ink/70">価格:</span> ¥{assignment.price.toLocaleString()}
                </p>
                <a
                  href={assignment.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ringo-pink underline"
                >
                  Amazonで詳細を見る
                </a>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ringo-ink/70">「購入対象を取得」ボタンでマッチングを開始します。</p>
            )}
            <button
              type="button"
              onClick={requestAssignment}
              className="mt-6 w-full rounded-ringo-pill border border-ringo-pink py-3 text-lg font-semibold text-ringo-pink transition hover:bg-ringo-pink/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating}
            >
              {isUpdating ? "割り当て中..." : "購入対象を取得"}
            </button>
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm">
            <h2 className="text-xl font-semibold text-ringo-red">スクリーンショット提出の注意</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>注文番号・商品名・金額が分かるように撮影してください。</li>
              <li>PNG または JPG / 10MB 以下。</li>
              <li>提出後は AI + 管理者が確認するまでお待ちください。</li>
            </ul>
            <p className="mt-4 text-xs text-ringo-ink/70">実際のアップロードは後続バージョンで実装します。今はモックボタンで進行を確認します。</p>
            <button
              type="button"
              onClick={markScreenshotSubmitted}
              className="mt-6 w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating || !assignment}
            >
              {isUpdating ? "送信中..." : "スクショを提出した"}
            </button>
          </div>
        </section>

        {error && <p className="text-sm text-ringo-red">{error}</p>}

        <section className="rounded-3xl border border-dashed border-ringo-purple/40 bg-white/70 p-6 text-xs text-ringo-ink/70">
          <p>
            現在のステータス: <strong>{user?.status ?? "-"}</strong>（`ready_to_purchase` になると購入義務中、`verifying` になると検証待ちです）
          </p>
        </section>
      </main>
    </UserFlowGuard>
  );
}
