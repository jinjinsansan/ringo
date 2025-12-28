"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
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
      <FlowLayout 
        currentStepIndex={2} 
        title="ギフトを贈る" 
        subtitle="マッチングした誰かのリストから、素敵なプレゼントを贈りましょう。"
        showBack
      >
        <div className="space-y-8">
          {/* Assignment Card */}
          <section className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-ringo-pink-soft/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <h2 className="text-lg font-bold text-ringo-rose mb-4 flex items-center gap-2 relative z-10">
              <span className="text-2xl">🎯</span> あなたの購入担当
            </h2>

            {assignment ? (
              <div className="space-y-6 relative z-10">
                <div className="bg-ringo-bg p-5 rounded-2xl border border-ringo-pink-soft/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-ringo-purple rounded-full flex items-center justify-center text-xl">👤</div>
                    <div>
                      <p className="text-xs text-gray-500">お相手</p>
                      <p className="font-bold text-ringo-ink">{assignment.alias} さん</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-xs text-gray-500">希望商品</p>
                     <p className="font-bold text-lg text-ringo-ink">{assignment.itemName}</p>
                     <p className="text-sm text-ringo-red font-bold">¥{assignment.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    href={assignment.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full shadow-md text-center no-underline"
                  >
                    Amazonで商品を見る ↗
                  </a>
                  <p className="text-xs text-center text-gray-400">
                    ※ Amazonのページが開きます。そのまま購入手続きへお進みください。
                  </p>
                </div>

                <div className="pt-4 border-t border-ringo-pink-soft/30 text-center">
                  <p className="text-sm font-bold text-ringo-ink mb-3">購入できましたか？</p>
                  <Link href="/upload-screenshot" className="btn-secondary w-full block text-center">
                     報告（スクショ提出）へ進む
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎁</div>
                <p className="text-gray-600 mb-6">
                  下のボタンを押すと、あなたがプレゼントを贈るお相手が決定します。
                </p>
                <button
                  type="button"
                  onClick={requestAssignment}
                  className="btn-primary w-full shadow-lg"
                  disabled={isUpdating || isLoadingAssignment}
                >
                  {isLoadingAssignment
                    ? "読み込み中..."
                    : isUpdating
                      ? "マッチング中..."
                      : "お相手を見つける！"}
                </button>
              </div>
            )}
          </section>

          {/* Guidelines */}
          <section className="bg-ringo-purple/10 rounded-2xl p-5 border border-ringo-purple/20">
            <h3 className="text-sm font-bold text-ringo-poison mb-2">💡 購入のヒント</h3>
            <ul className="text-xs space-y-2 text-gray-600">
              <li className="flex gap-2">
                <span>・</span>
                <span>必ず「ギフト設定」をして、匿名で送りましょう。</span>
              </li>
              <li className="flex gap-2">
                <span>・</span>
                <span>注文完了画面のスクリーンショットを忘れずに！</span>
              </li>
              <li className="flex gap-2">
                <span>・</span>
                <span>注文番号、商品名、合計金額が見えるように撮影してください。</span>
              </li>
            </ul>
          </section>

          {error && (
            <div className="bg-ringo-red/10 border border-ringo-red/20 rounded-xl p-4 text-sm text-ringo-red text-center">
              {error}
            </div>
          )}
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
