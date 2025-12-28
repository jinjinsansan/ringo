"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
import { authorizedFetch } from "@/lib/status";
import { useUser } from "@/lib/user";

const validateAmazonUrl = (url: string) => /amazon\.(co\.jp|com|jp)/i.test(url);

export default function RegisterWishlistPage() {
  const router = useRouter();
  const { user, refresh } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [detectedPrice, setDetectedPrice] = useState<number | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setDetectedTitle(null);
    setDetectedPrice(null);

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
      const response = await authorizedFetch("/api/wishlist/register", user.id, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { title?: string; price?: number };
      setDetectedTitle(data.title ?? null);
      setDetectedPrice(typeof data.price === "number" ? data.price : null);
      await refresh();
      setSuccess("登録できました！ りんご抽選ページへ移動します🍎");
      setTimeout(() => router.push("/draw"), 2000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "リスト登録処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="first_purchase_completed">
      <FlowLayout 
        currentStepIndex={4} 
        title="リストを登録" 
        subtitle="あなたの欲しいものリストのURLを貼り付けてください。"
      >
        <div className="space-y-6">
           <section className="bg-white/80 rounded-[2rem] p-6 shadow-ringo-card border border-white">
              <h2 className="text-lg font-bold text-ringo-rose mb-4 text-center">
                🔗 欲しいものリストURL
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="https://www.amazon.co.jp/hz/wishlist/ls/..."
                    className="w-full rounded-full border-2 border-ringo-pink-soft bg-white px-6 py-4 text-base outline-none focus:border-ringo-rose focus:ring-4 focus:ring-ringo-pink/20 transition-all placeholder:text-gray-300"
                  />
                  <p className="text-xs text-center text-gray-500">
                    ※ 3,000円〜4,000円の商品を登録しておいてくださいね。
                  </p>
                </div>

                {error && (
                  <div className="bg-ringo-red/10 border border-ringo-red/20 rounded-xl p-4 text-sm text-ringo-red text-center">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-ringo-green/10 border border-ringo-green/20 rounded-xl p-4 text-sm text-ringo-green text-center space-y-2">
                    <p className="font-bold text-lg">{success}</p>
                    {detectedTitle && (
                      <div className="bg-white/50 rounded-lg p-2 text-xs">
                        <p className="font-bold text-gray-600">登録された商品</p>
                        <p>{detectedTitle}</p>
                        {detectedPrice && (
                           <p className="font-bold text-ringo-rose">¥{detectedPrice.toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary w-full shadow-lg" 
                  disabled={isSubmitting || Boolean(success)}
                >
                  {isSubmitting ? "確認・登録中..." : "リストを登録する"}
                </button>
              </form>
           </section>

           <div className="bg-ringo-purple/10 rounded-2xl p-5 border border-ringo-purple/20">
              <h3 className="text-sm font-bold text-ringo-poison mb-2">💡 リスト作成のコツ</h3>
              <ul className="text-xs space-y-2 text-gray-600">
                <li className="flex gap-2">
                  <span>・</span>
                  <span>「受取人」の設定を忘れずに！</span>
                </li>
                <li className="flex gap-2">
                  <span>・</span>
                  <span>住所は「第三者の出品者の商品の発送同意書」のチェックを外すと安心です。</span>
                </li>
                <li className="flex gap-2">
                  <span>・</span>
                  <span>3,000円〜4,000円の商品を1つ以上入れておいてください。</span>
                </li>
              </ul>
           </div>
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
