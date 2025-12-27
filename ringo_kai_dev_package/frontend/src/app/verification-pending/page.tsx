"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function VerificationPendingPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isUpdating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markApproved = async () => {
    try {
      setUpdating(true);
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({ data: { status: "first_purchase_completed" } });
      if (updateError) throw updateError;
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
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 text-ringo-ink">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.07</p>
          <h1 className="font-logo text-4xl font-bold">確認中です</h1>
          <p className="text-sm text-ringo-ink/70">AI と管理者がスクリーンショットを確認しています。完了までしばらくお待ちください。</p>
        </header>

        <section className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 text-sm leading-relaxed shadow-ringo-card">
          <p>通常は数時間以内に完了します。状況によっては 24 時間程度かかる場合があります。</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>承認されると欲しいものリスト登録フォームへ進めます。</li>
            <li>却下された場合は再度スクリーンショット提出（Step.06）へ戻ります。</li>
            <li>毒りんごによる救済措置は管理者が個別に連絡します。</li>
          </ul>
        </section>

        <div className="rounded-3xl border border-dashed border-ringo-purple/40 bg-white/70 p-6 text-sm text-ringo-ink/70">
          <p>モック環境では下のボタンで承認済み状態に進めます。</p>
          <button
            type="button"
            onClick={markApproved}
            className="mt-4 w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdating}
          >
            {isUpdating ? "更新中..." : "承認されたとして進む"}
          </button>
          {error && <p className="mt-2 text-sm text-ringo-red">{error}</p>}
        </div>
      </main>
    </UserFlowGuard>
  );
}
