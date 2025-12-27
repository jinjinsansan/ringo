"use client";

import { useState } from "react";
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
        subtitle="りんごちゃんが一生懸命チェックしています！"
      >
        <div className="space-y-8 text-center">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-ringo-pink-soft/30 rounded-full blur-xl animate-pulse"></div>
             <div className="text-8xl animate-bounce relative z-10">🕵️‍♀️</div>
          </div>

          <section className="bg-white/80 rounded-2xl p-6 shadow-ringo-card border border-white">
            <h2 className="text-lg font-bold text-ringo-ink mb-4">ただいま審査中</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              提出いただいたスクリーンショットを確認しています。<br/>
              通常は数分〜数時間で完了しますので、<br/>
              しばらくお待ちくださいね♪
            </p>
            <div className="bg-ringo-bg/50 rounded-xl p-4 text-xs text-gray-500 text-left space-y-2">
               <p>📌 承認されると…<br/>→ 次の「リスト登録」へ進めるようになります。</p>
               <p>⚠️ もし何かあれば…<br/>→ メールでお知らせするか、この画面で再提出をお願いします。</p>
            </div>
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
