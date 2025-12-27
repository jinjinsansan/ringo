"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [isSubmitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = (formData.get("password") as string) ?? "";

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
      <div className="w-full max-w-lg space-y-8 rounded-3xl bg-white/90 px-8 py-10 shadow-ringo-card">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.02</p>
          <h1 className="font-logo text-3xl font-bold">りんご会♪ ログイン</h1>
          <p className="text-sm text-ringo-ink/70">
            登録時のメールアドレスとパスワードでログインし、利用規約・使い方ページへ順番に進みましょう。
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-semibold">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-base outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-base outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {serverError && (
            <div className="rounded-2xl bg-ringo-red/10 px-4 py-3 text-sm text-ringo-red">{serverError}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="space-y-2 text-center text-sm text-ringo-ink/70">
          <p>
            アカウントをお持ちでない方は{" "}
            <Link href="/register" className="text-ringo-pink underline">
              新規登録へ
            </Link>
          </p>
          <p>パスワードをお忘れの場合は管理者までお問い合わせください。</p>
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
