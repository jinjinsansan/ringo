"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
import { updateUserStatus } from "@/lib/status";
import { useUser } from "@/lib/user";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { user, refresh } = useUser();
  const [isUpdating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markApproved = async () => {
    if (!user) {
      setError("ユーザー情報を取得できません。ログインし直してください。");
      return;
    }
    try {
      setUpdating(true);
      setError(null);
      const { error: updateError } = await updateUserStatus(user.id, "first_purchase_completed");
      if (updateError) throw updateError;
      await refresh();
      router.push("/register-wishlist");
    } catch (err) {
      console.error(err);
      setError("承認処理に失敗しました。");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="verifying">
      <FlowLayout 
        currentStepIndex={3} 
        title="確認中です..." 
        subtitle="りんごちゃんAIと運営チームが順番にチェックしています"
      >
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-36 w-36 sm:h-44 sm:w-44">
              <div className="absolute inset-0 rounded-full bg-ringo-pink-soft/30 blur-2xl animate-pulse" aria-hidden />
              <Image
                src="/images/character/ringo_kai_main_character.png"
                alt="りんごちゃんがスクリーンショットを確認中"
                className="relative z-10 h-full w-full object-contain drop-shadow-xl animate-[float_4s_ease-in-out_infinite]"
                width={256}
                height={256}
                priority
              />
            </div>
            <p className="mt-4 text-sm text-gray-500">アップロードされたスクリーンショットをAI→人の順に照合しています。</p>
          </div>

          <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-ringo-card">
            <h2 className="text-lg font-bold text-ringo-ink">審査の流れ</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-ringo-bg/80 p-4">
                <p className="text-sm font-semibold text-ringo-rose">Step 1: りんごちゃんAI</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>・画像の注文番号・商品名・金額をOCRで抽出</li>
                  <li>・割り当てられた欲しいものリストと自動照合</li>
                  <li>・OKなら即時で承認候補に進みます</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-ringo-slate-light/60 p-4">
                <p className="text-sm font-semibold text-ringo-indigo">Step 2: 運営チーム</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>・AIが迷ったケースを人が再確認</li>
                  <li>・スクショ不足ならメールで再提出をご案内</li>
                  <li>・承認後は次の「欲しい物リスト登録」へ解放</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-ringo-bg/60 p-4 text-sm text-gray-600">
              <p>⏱ 通常は数分〜数時間で完了します。ピーク時は最大で半日ほどかかる場合がありますが、完了するとメールとこの画面でお知らせします。</p>
            </div>
          </section>

          <section className="rounded-3xl border border-ringo-pink-soft bg-white/80 p-6 shadow-ringo-card text-sm text-gray-600">
            <h2 className="mb-3 text-base font-bold text-ringo-ink">現在の割り当て</h2>
            <ul className="space-y-2">
              <li>🎯 指定された欲しいものリストの商品を購入済み</li>
              <li>🖼 スクリーンショット: {user?.status === "verifying" ? "受領済み" : "確認中"}</li>
              <li>🔍 AI判定: {user?.status === "verifying" ? "レビュー中" : "更新待ち"}</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">※ 再提出が必要な場合はメールとアプリ内でお知らせします。</p>
          </section>

          {/* Debug Button - keep for development but style discretely */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 text-xs text-gray-400">
            <p className="mb-2 font-bold">[開発用デバッグボタン]</p>
            <p className="mb-2">※ 実際の運用では表示されません</p>
            <button 
              type="button" 
              onClick={markApproved} 
              className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-bold transition-colors w-full" 
              disabled={isUpdating}
            >
              {isUpdating ? "更新中..." : "強制的に承認済みにする"}
            </button>
            {error && <p className="mt-2 text-red-500">{error}</p>}
          </div>
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
