"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { authorizedFetch } from "@/lib/status";
import { useUser } from "@/lib/user";
import type { ApiError } from "@/lib/status";

type WishlistAssignment = {
  alias: string;
  itemName: string;
  price: number;
  link: string;
};

type PurchaseAssignment = WishlistAssignment & {
  purchaseId: number;
};

export default function PurchasePage() {
  const { user, refresh } = useUser();
  const [assignment, setAssignment] = useState<PurchaseAssignment | null>(null);
  const [isUpdating, setUpdating] = useState(false);
  const [isLoadingAssignment, setLoadingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateAssignment = useCallback(async () => {
    if (!user) {
      setAssignment(null);
      return;
    }

    setLoadingAssignment(true);
    setError(null);
    try {
      const response = await authorizedFetch("/api/purchase/current", user.id);
      const data = (await response.json()) as {
        purchase_id: number;
        alias: string;
        item_name: string;
        price: number;
        wishlist_url: string;
      };
      setAssignment({
        purchaseId: data.purchase_id,
        alias: data.alias,
        itemName: data.item_name,
        price: data.price,
        link: data.wishlist_url,
      });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 404) {
        setAssignment(null);
      } else {
        console.error(err);
        setError(apiErr?.message ?? "割り当て取得に失敗しました。");
      }
    } finally {
      setLoadingAssignment(false);
    }
  }, [user]);

  useEffect(() => {
    hydrateAssignment();
  }, [hydrateAssignment]);

  const requestAssignment = async () => {
    if (!user) {
      setError("ユーザー情報が見つかりません。ログインし直してください。");
      return;
    }
    if (assignment) {
      setError("既に購入対象が割り当て済みです。スクリーンショット提出へ進んでください。");
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      const response = await authorizedFetch("/api/purchase/start", user.id, {
        method: "POST",
      });
      const data = (await response.json()) as {
        purchase_id: number;
        alias: string;
        item_name: string;
        price: number;
        wishlist_url: string;
      };
      setAssignment({
        purchaseId: data.purchase_id,
        alias: data.alias,
        itemName: data.item_name,
        price: data.price,
        link: data.wishlist_url,
      });
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "割り当て取得に失敗しました。");
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
              disabled={isUpdating || isLoadingAssignment || Boolean(assignment)}
            >
              {isLoadingAssignment
                ? "読み込み中..."
                : assignment
                  ? "購入対象は割り当て済み"
                  : isUpdating
                    ? "割り当て中..."
                    : "購入対象を取得"}
            </button>
            {assignment && (
              <Link
                href="/upload-screenshot"
                className="mt-4 block rounded-ringo-pill bg-ringo-pink py-3 text-center text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5"
              >
                スクリーンショット提出ページへ進む
              </Link>
            )}
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm">
            <h2 className="text-xl font-semibold text-ringo-red">スクリーンショット提出の注意</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>注文番号・商品名・金額が分かるように撮影してください。</li>
              <li>PNG または JPG / 10MB 以下。</li>
              <li>提出後は AI + 管理者が確認するまでお待ちください。</li>
            </ul>
            <p className="mt-4 text-xs text-ringo-ink/70">購入後は「スクリーンショット提出ページへ進む」ボタンから画像をアップロードしてください。</p>
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
