"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
import { updateUserStatus } from "@/lib/status";
import { useUser } from "@/lib/user";

export default function TermsPage() {
  const router = useRouter();
  const { user, refresh } = useUser();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgree = async () => {
    if (!user) {
      setError("ユーザー情報の取得に失敗しました。ログインし直してください。");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const { error: updateError } = await updateUserStatus(user.id, "terms_agreed", {
        terms_agreed_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
      await refresh();
      router.push("/tutorial");
    } catch (err) {
      console.error(err);
      setError("同意ステータスの更新に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="registered">
      <FlowLayout 
        currentStepIndex={0} 
        title="利用規約" 
        subtitle="みんなが安心して楽しめるように、大切なお約束です。"
      >
        <div className="space-y-6">
          <section className="bg-white/50 rounded-2xl p-6 border border-ringo-pink-soft/50 text-sm leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
            <h2 className="text-lg font-bold text-ringo-rose mb-4 border-b border-ringo-pink-soft pb-2">
              りんご会♪ 利用規約（抜粋）
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-2">
                <span className="text-ringo-red font-bold">1.</span>
                <span>登録情報はあなただけのもの。お友達に貸したりしないでくださいね。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ringo-red font-bold">2.</span>
                <span>Amazonでの購入は、必ずご自身で行ってください。購入証明（スクショ）の提出が必要です。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ringo-red font-bold">3.</span>
                <span>嘘の報告や、画像の加工は絶対にダメ！見つかったら退会となってしまいます。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ringo-red font-bold">4.</span>
                <span>ここで知った誰かの情報を、他の場所で教えたりしないでください。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ringo-red font-bold">5.</span>
                <span>みんなで仲良く、マナーを守って楽しみましょう♪</span>
              </li>
            </ul>
            <p className="mt-6 text-xs text-gray-400">
              ※ 詳細な規約は別途PDF等で定める正式版に準拠します。
            </p>
          </section>

          {user && user.status !== "registered" ? (
            <div className="text-center bg-ringo-green/10 p-4 rounded-xl border border-ringo-green/30">
              <p className="text-ringo-green font-bold mb-2">すでに同意済みです ✨</p>
              <button 
                className="btn-secondary py-2 px-6 text-sm" 
                onClick={() => router.push("/tutorial")}
              >
                次のステップへ進む
              </button>
            </div>
          ) : (
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500 mb-4">
                上記の内容を確認し、同意する場合はボタンを押して進んでください。
              </p>
              <button 
                type="button" 
                onClick={handleAgree} 
                className="btn-primary w-full shadow-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "処理中..." : "規約に同意して次へ"}
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
