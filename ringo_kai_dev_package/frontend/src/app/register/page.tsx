"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getBackendBaseUrl } from "@/lib/backend";

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
        if (profileError.code === "23505" || profileError.message?.includes("duplicate key value")) {
          setServerError("このメールアドレスは既に登録されています。ログインページからサインインしてください。");
        } else {
          setServerError("ユーザープロフィールの作成に失敗しました: " + profileError.message);
        }
        return;
      }

      if (referralCode) {
        try {
          const backendBase = getBackendBaseUrl();
          const response = await fetch(`${backendBase}/api/referral/claim`, {
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
      <div className="w-full max-w-lg space-y-8 p-8 sm:p-12 card-apple">
        <div className="space-y-4 text-center">
          <Link href="/" className="inline-block text-4xl mb-2 hover:scale-110 transition-transform">
            🎁
          </Link>
          <h1 className="font-logo text-3xl font-bold text-ringo-ink">はじめまして♪</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            アカウントを作成して、<br/>りんご会を楽しみましょう！
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
            {formErrors.email && <p className="text-sm text-ringo-red ml-2">{formErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-bold text-ringo-ink ml-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-full border-2 border-ringo-pink-soft bg-white/50 px-6 py-3 text-base outline-none focus:border-ringo-rose focus:bg-white transition-colors"
              placeholder="8文字以上の英数字"
              required
              minLength={8}
            />
            {formErrors.password && <p className="text-sm text-ringo-red ml-2">{formErrors.password}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-bold text-ringo-ink ml-1">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-full border-2 border-ringo-pink-soft bg-white/50 px-6 py-3 text-base outline-none focus:border-ringo-rose focus:bg-white transition-colors"
              placeholder="もう一度入力"
              required
              minLength={8}
            />
            {formErrors.confirmPassword && <p className="text-sm text-ringo-red ml-2">{formErrors.confirmPassword}</p>}
          </div>

          <label className="flex items-center gap-3 text-sm p-2 cursor-pointer hover:bg-white/50 rounded-lg transition-colors">
            <input
              type="checkbox"
              name="terms"
              className="h-5 w-5 rounded border-ringo-pink-soft text-ringo-rose focus:ring-ringo-rose"
              required
            />
            <span>
              <Link href="/terms" className="text-ringo-rose font-bold hover:underline" target="_blank">
                利用規約
              </Link>
              に同意します
            </span>
          </label>
          {formErrors.terms && <p className="text-sm text-ringo-red ml-2">{formErrors.terms}</p>}

          {serverError && (
            <div className="rounded-2xl bg-ringo-red/10 border border-ringo-red/20 px-4 py-3 text-sm text-ringo-red text-center">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl bg-ringo-gold/10 border border-ringo-gold/20 px-4 py-3 text-sm text-ringo-gold text-center">
              {successMessage}
            </div>
          )}

          <button type="submit" className="btn-primary w-full shadow-lg" disabled={isSubmitting}>
            {isSubmitting ? "登録処理中..." : "登録してはじめる"}
          </button>
        </form>

        <div className="space-y-4 text-center text-sm text-gray-500 pt-4 border-t border-ringo-pink-soft/50">
          <p>
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="text-ringo-rose font-bold hover:underline">
              こちら
            </Link>
            から
          </p>
        </div>
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
