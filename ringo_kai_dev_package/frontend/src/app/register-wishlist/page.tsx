"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { createSupabaseClient } from "@/lib/supabase/client";
import { updateUserStatus } from "@/lib/status";
import { useUser } from "@/lib/user";

const validateAmazonUrl = (url: string) => /amazon\.(co\.jp|com)/i.test(url);

export default function RegisterWishlistPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { user, refresh } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const url = (formData.get("url") as string)?.trim();

    if (!validateAmazonUrl(url)) {
      setError("Amazonの欲しいものリストURLを入力してください。");
      return;
    }

    if (!user) {
      setError("ユーザー情報の取得に失敗しました。ログインを確認してください。");
      return;
    }

    try {
      setSubmitting(true);
      const { error: updateError } = await updateUserStatus(supabase, user.id, "ready_to_draw", {
        wishlist_url: url,
        wishlist_registered_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
      await refresh();
      setSuccess("登録しました！ りんご抽選ページへ移動します。");
      setTimeout(() => router.push("/draw"), 1500);
    } catch (err) {
      console.error(err);
      setError("リスト登録処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="first_purchase_completed">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 text-ringo-ink">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.08</p>
          <h1 className="font-logo text-4xl font-bold">あなたの欲しいものリストを登録</h1>
          <p className="text-sm text-ringo-ink/70">承認済みのユーザーのみ、自身の Amazon 欲しいものリストを登録できます。</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 text-sm shadow-ringo-card"
        >
          <label className="space-y-1">
            <span className="text-sm font-semibold">Amazon 欲しいものリスト URL</span>
            <input
              type="url"
              name="url"
              required
              placeholder="https://www.amazon.co.jp/hz/wishlist/..."
              className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-base outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
            />
          </label>
          <p className="text-xs text-ringo-ink/60">
            ※ 公開設定のリストで、3000円〜4000円の商品を登録してください。登録後の変更はできません。
          </p>
          <button
            type="submit"
            className="w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "登録中..." : "リストを登録"}
          </button>
        </form>

        {error && <p className="text-sm text-ringo-red">{error}</p>}
        {success && <p className="text-sm text-ringo-gold">{success}</p>}
      </main>
    </UserFlowGuard>
  );
}
