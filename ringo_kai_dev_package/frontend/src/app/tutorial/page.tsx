"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/user";

const checklist = [
  "Amazonの欲しいものリストURLを用意し、3000〜4000円のアイテムを登録する",
  "誰かのリストから購入し、スクリーンショットを提出する",
  "AI＋管理者による確認が終わるまでは次のステップへ進まない",
  "毒りんごを引いた場合は再度誰かのリストを購入する",
];

export default function TutorialPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { user } = useUser();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { status: "tutorial_completed" },
      });
      if (updateError) throw updateError;
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
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 text-ringo-ink">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.04</p>
          <h1 className="font-logo text-4xl font-bold">りんご会♪の使い方</h1>
          <p className="text-sm text-ringo-ink/70">Detailed User Flow に基づく全ステップを確認し、チェックを終えてから次へ進みましょう。</p>
        </header>

        <section className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm leading-relaxed">
          <h2 className="text-xl font-semibold text-ringo-red">利用フロー</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>ログイン後、利用規約・使い方を順に確認</li>
            <li>マッチした誰かのリストを購入し、スクリーンショットをアップロード</li>
            <li>AIと管理者の承認後、自分の欲しいものリストを登録</li>
            <li>りんごを引き、24時間後に結果を確認</li>
          </ol>
        </section>

        <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm">
          <h2 className="text-xl font-semibold text-ringo-red">チェックリスト</h2>
          <ul className="mt-3 space-y-3">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ringo-pink text-xs text-white">✓</span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ringo-ink/60">
            詳細は <Link href="/terms" className="text-ringo-pink underline">利用規約</Link> と README の「ユーザーフロー」を参照してください。
          </p>
        </section>

        {user && user.status !== "terms_agreed" ? (
          <div className="rounded-3xl border border-ringo-gold/40 bg-ringo-gold/10 p-6 text-sm text-ringo-ink">
            すでに確認済みです。<button className="text-ringo-pink underline" onClick={() => router.push("/purchase")}>
              購入ステップへ進む
            </button>
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl bg-white/80 p-6 text-center shadow-ringo-card">
            <p className="text-sm text-ringo-ink/70">チェックを終えたら下のボタンで次のステップへ。</p>
            <button
              type="button"
              onClick={handleComplete}
              className="w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "更新中..." : "理解しました"}
            </button>
            {error && <p className="text-sm text-ringo-red">{error}</p>}
          </div>
        )}
      </main>
    </UserFlowGuard>
  );
}
