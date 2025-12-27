"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase/client";

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

const defaultErrors: FormErrors = {};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [isSubmitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>(defaultErrors);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const referralCode = searchParams.get("ref")?.trim().toUpperCase() ?? "";

  const validate = (email: string, password: string, confirmPassword: string, agreed: boolean) => {
    const errors: FormErrors = {};

    if (!email) {
      errors.email = "メールアドレスを入力してください";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.email = "正しいメールアドレス形式で入力してください";
    }

    if (!password || password.length < 8) {
      errors.password = "8文字以上のパスワードを入力してください";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "パスワードが一致しません";
    }

    if (!agreed) {
      errors.terms = "利用規約への同意が必要です";
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = (formData.get("password") as string) ?? "";
    const confirmPassword = (formData.get("confirmPassword") as string) ?? "";
    const agreed = Boolean(formData.get("terms"));

    const errors = validate(email, password, confirmPassword, agreed);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email,
          status: "registered",
          terms_agreed_at: null,
          tutorial_completed_at: null,
          wishlist_url: null,
          wishlist_registered_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        setServerError("ユーザープロフィールの作成に失敗しました: " + profileError.message);
        return;
      }

      if (referralCode) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? ""}/api/referral/claim`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": data.user.id,
            },
            body: JSON.stringify({ code: referralCode }),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            console.warn("referral claim failed", payload?.detail ?? response.statusText);
          }
        } catch (err) {
          console.warn("referral claim error", err);
        }
      }
    }

    setSuccessMessage("登録が完了しました。ログインしてください。数秒後にログインページへ移動します。");
    setTimeout(() => router.push("/login"), 1500);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ringo-bg px-4 py-12 text-ringo-ink">
      <div className="w-full max-w-lg space-y-8 rounded-3xl bg-white/90 px-8 py-10 shadow-ringo-card">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-ringo-red">STEP.01</p>
          <h1 className="font-logo text-3xl font-bold">りんご会♪ 新規登録</h1>
          <p className="text-sm text-ringo-ink/70">
            メールとパスワードを入力して、りんご会♪の世界へ。登録後は利用規約ページへ進んでいただきます。
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
            {formErrors.email && <p className="text-sm text-ringo-red">{formErrors.email}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-semibold">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-base outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
              placeholder="8文字以上の英数字"
              required
              minLength={8}
            />
            {formErrors.password && <p className="text-sm text-ringo-red">{formErrors.password}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-semibold">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-base outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
              placeholder="もう一度入力"
              required
              minLength={8}
            />
            {formErrors.confirmPassword && <p className="text-sm text-ringo-red">{formErrors.confirmPassword}</p>}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="terms"
              className="h-5 w-5 rounded border border-ringo-purple/40 text-ringo-pink focus:ring-ringo-pink"
              required
            />
            <span>
              <Link href="/terms" className="text-ringo-pink underline">
                利用規約
              </Link>
              に同意します
            </span>
          </label>
          {formErrors.terms && <p className="text-sm text-ringo-red">{formErrors.terms}</p>}

          {serverError && (
            <div className="rounded-2xl bg-ringo-red/10 px-4 py-3 text-sm text-ringo-red">{serverError}</div>
          )}

          {successMessage && (
            <div className="rounded-2xl bg-ringo-gold/10 px-4 py-3 text-sm text-ringo-gold">{successMessage}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "登録処理中..." : "登録する"}
          </button>
        </form>

        <p className="text-center text-sm text-ringo-ink/70">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-ringo-pink underline">
            こちら
          </Link>
          からログイン
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ringo-bg" />}> 
      <RegisterContent />
    </Suspense>
  );
}
