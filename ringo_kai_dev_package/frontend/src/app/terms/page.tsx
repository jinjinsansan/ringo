"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
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
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 text-ringo-ink">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.03</p>
          <h1 className="font-logo text-4xl font-bold">利用規約</h1>
          <p className="text-sm text-ringo-ink/70">すべてのユーザーが安全に楽しむため、以下のルールへの同意が必須です。</p>
        </header>

        <section className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm leading-relaxed">
          <h2 className="text-xl font-semibold text-ringo-red">抜粋</h2>
          <ul className="list-disc space-y-3 pl-6">
            <li>登録情報は本人のみ使用可能であり、第三者へ譲渡・貸与してはなりません。</li>
            <li>Amazonでの購入は必ず本人決済で行い、スクリーンショットを提出する義務があります。</li>
            <li>虚偽の購入報告、スクリーンショット改ざん、その他の不正が発覚した場合は即時退会となります。</li>
            <li>コミュニティ内で知り得た情報を外部に公開しないでください。</li>
            <li>詳細は ZIP に含まれる正式な利用規約全文に従います。</li>
          </ul>
        </section>

        {user && user.status !== "registered" ? (
          <div className="rounded-3xl border border-ringo-gold/40 bg-ringo-gold/10 p-6 text-sm text-ringo-ink">
            すでに同意済みです。<button className="text-ringo-pink underline" onClick={() => router.push("/tutorial")}>
              使い方ページへ進む
            </button>
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl bg-white/80 p-6 text-center shadow-ringo-card">
            <p className="text-sm text-ringo-ink/70">同意すると次のステップ（使い方）へ進みます。</p>
            <button
              type="button"
              onClick={handleAgree}
              className="w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "更新中..." : "利用規約に同意する"}
            </button>
            {error && <p className="text-sm text-ringo-red">{error}</p>}
          </div>
        )}
      </main>
    </UserFlowGuard>
  );
}
