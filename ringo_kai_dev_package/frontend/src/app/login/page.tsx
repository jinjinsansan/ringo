"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const supabase = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return createSupabaseClient();
  }, []);
  const [isSubmitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = (formData.get("password") as string) ?? "";

    if (!supabase) {
      setServerError("Supabase クライアントを初期化できませんでした。ページを再読み込みしてください。");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push(redirectTo);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ringo-bg px-4 py-12 text-ringo-ink">
      <div className="w-full max-w-lg space-y-8 p-8 sm:p-12 card-apple">
        <div className="space-y-4 text-center">
          <Link href="/" className="inline-block text-4xl mb-2 hover:scale-110 transition-transform">
            🍎
          </Link>
          <h1 className="font-logo text-3xl font-bold text-ringo-ink">おかえりなさい♪</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            登録時のメールアドレスとパスワードで<br/>ログインしてくださいね。
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-bold text-ringo-ink ml-1">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-full border-2 border-ringo-pink-soft bg-white/50 px-6 py-3 text-base outline-none focus:border-ringo-rose focus:bg-white transition-colors"
              placeholder="apple@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-bold text-ringo-ink ml-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-full border-2 border-ringo-pink-soft bg-white/50 px-6 py-3 text-base outline-none focus:border-ringo-rose focus:bg-white transition-colors"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {serverError && (
            <div className="rounded-2xl bg-ringo-red/10 border border-ringo-red/20 px-4 py-3 text-sm text-ringo-red text-center">
              {serverError}
            </div>
          )}

          <button type="submit" className="btn-primary w-full shadow-lg" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログインする"}
          </button>
        </form>

        <div className="space-y-4 text-center text-sm text-gray-500 pt-4 border-t border-ringo-pink-soft/50">
          <p>
            はじめての方は{" "}
            <Link href="/register" className="text-ringo-rose font-bold hover:underline">
              新規登録へ
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            パスワードをお忘れの場合は管理者までお問い合わせください。
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ringo-bg" />}> 
      <LoginContent />
    </Suspense>
  );
}
