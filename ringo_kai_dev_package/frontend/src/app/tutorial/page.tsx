"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
import { updateUserStatus } from "@/lib/status";
import { useUser } from "@/lib/user";

export default function TutorialPage() {
  const router = useRouter();
  const { user, refresh } = useUser();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!user) {
      setError("ユーザー情報を取得できません。ログインし直してください。");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const { error: updateError } = await updateUserStatus(user.id, "tutorial_completed", {
        tutorial_completed_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
      await refresh();
      router.push("/purchase");
    } catch (err) {
      console.error(err);
      setError("ステータス更新に失敗しました。再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="terms_agreed">
      <FlowLayout 
        currentStepIndex={1} 
        title="遊び方ガイド"
        subtitle="りんご会♪の流れをマスターしましょう！"
        showBack
      >
        <div className="space-y-8">
          {/* Flow Cards */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-ringo-rose text-center">
              〜 ハッピーの循環 〜
            </h2>
            
            <div className="grid gap-4">
              <div className="bg-white/60 p-4 rounded-2xl flex items-center gap-4 border border-ringo-pink-soft/30 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-ringo-pink-soft flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div>
                  <h3 className="font-bold text-ringo-ink">1. ギフトを贈る</h3>
                  <p className="text-xs text-gray-500">
                    表示された誰かの欲しいものリストから、3,000円〜4,000円の商品をプレゼント。
                  </p>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl flex items-center gap-4 border border-ringo-pink-soft/30 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-ringo-purple flex items-center justify-center text-2xl">
                  📸
                </div>
                <div>
                  <h3 className="font-bold text-ringo-ink">2. 報告する</h3>
                  <p className="text-xs text-gray-500">
                    注文完了画面のスクリーンショットをアップロード。AIとりんごちゃんが確認します！
                  </p>
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-2xl flex items-center gap-4 border border-ringo-pink-soft/30 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-ringo-red flex items-center justify-center text-2xl">
                  🍎
                </div>
                <div>
                  <h3 className="font-bold text-ringo-ink">3. りんごを引く</h3>
                  <p className="text-xs text-gray-500">
                    承認されると抽選権をGET。24時間後に結果がわかるドキドキのカードオープン♪
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section className="bg-ringo-bg/50 border border-ringo-pink-soft rounded-2xl p-6">
             <h2 className="text-sm font-bold text-ringo-ink mb-4 text-center">
               ✨ スタート前の確認リスト
             </h2>
             <ul className="space-y-3">
               {[
                 "Amazonの欲しいものリストURLを準備しましたか？",
                 "3,000円〜4,000円の商品を登録していますか？",
                 "誰かにプレゼントする準備はできていますか？",
                 "みんなで楽しむ気持ちを持っていますか？"
               ].map((text, i) => (
                 <li key={i} className="flex items-start gap-3">
                   <span className="flex-shrink-0 w-5 h-5 rounded-full bg-ringo-rose text-white flex items-center justify-center text-xs mt-0.5">✓</span>
                   <span className="text-sm text-gray-600">{text}</span>
                 </li>
               ))}
             </ul>
          </section>

          {user && user.status !== "terms_agreed" ? (
            <div className="text-center bg-ringo-green/10 p-4 rounded-xl border border-ringo-green/30">
              <p className="text-ringo-green font-bold mb-2">準備バッチリですね！ 🎉</p>
              <button 
                className="btn-secondary py-2 px-6 text-sm" 
                onClick={() => router.push("/purchase")}
              >
                購入ステップへ進む
              </button>
            </div>
          ) : (
             <div className="text-center pt-2">
               <button 
                 type="button" 
                 onClick={handleComplete} 
                 className="btn-primary w-full shadow-lg" 
                 disabled={isSubmitting}
               >
                 {isSubmitting ? "処理中..." : "理解しました！次へ"}
               </button>
               {error && (
                 <p className="text-sm text-ringo-red mt-3 bg-ringo-red/10 p-2 rounded-lg">
                   {error}
                 </p>
               )}
             </div>
          )}
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
