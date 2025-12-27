"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { authorizedFetch } from "@/lib/status";
import { useUser } from "@/lib/user";

type CurrentPurchase = {
  purchaseId: number;
  alias: string;
  itemName: string;
  price: number;
  wishlistUrl: string;
  screenshotUrl?: string | null;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export default function UploadScreenshotPage() {
  const router = useRouter();
  const { user, refresh } = useUser();
  const [purchase, setPurchase] = useState<CurrentPurchase | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isUploading, setUploading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPurchase = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authorizedFetch("/api/purchase/current", user.id);
      const data = await response.json();
      setPurchase({
        purchaseId: data.purchase_id,
        alias: data.alias,
        itemName: data.item_name,
        price: data.price,
        wishlistUrl: data.wishlist_url,
        screenshotUrl: data.screenshot_url,
      });
      if (data.screenshot_url) {
        setUploadedUrl(data.screenshot_url);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "提出対象の購入を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("PNG または JPG 形式のファイルを選択してください。");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("ファイルサイズは 10MB 以下にしてください。");
      return;
    }
    setFile(selected);
    setUploadedUrl(null);
    const newPreview = URL.createObjectURL(selected);
    setPreviewUrl(newPreview);
  };

  const uploadFile = async () => {
    if (!user || !purchase || !file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append("purchase_id", String(purchase.purchaseId));
      formData.append("file", file);

      const response = await authorizedFetch("/api/purchase/upload", user.id, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setUploadedUrl(data.screenshot_url);
      setSuccess("アップロードが完了しました。確認ボタンを押して提出を完了してください。");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "アップロードに失敗しました。");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !purchase) {
      setError("ユーザー情報が見つかりませんでした。");
      return;
    }
    if (!uploadedUrl) {
      setError("スクリーンショットをアップロードしてください。");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await authorizedFetch("/api/purchase/verify", user.id, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchase_id: purchase.purchaseId,
          screenshot_url: uploadedUrl,
        }),
      });
      await refresh();
      router.push("/verification-pending");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "提出処理に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="ready_to_purchase">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-ringo-ink">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-ringo-red">STEP.06 / 06</p>
          <h1 className="font-logo text-4xl font-bold">スクリーンショットを提出する</h1>
          <p className="text-sm text-ringo-ink/70">購入完了画面のスクショをアップロードし、AI + 管理者の確認を受けます。</p>
        </header>

        {error && <p className="rounded-2xl border border-ringo-red/40 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}
        {success && <p className="rounded-2xl border border-ringo-green/40 bg-ringo-green/10 px-4 py-3 text-sm text-ringo-green">{success}</p>}

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-semibold text-ringo-red">提出ステップ</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {["Amazonで商品の購入を完了し、注文番号が写るようにスクリーンショットを撮影", "下のフォームからスクリーンショットをアップロード", "確認ボタンを押してAI審査へ送信"].map((text, index) => (
                <li key={text} className="flex gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ringo-pink/10 text-sm font-semibold text-ringo-pink">{index + 1}</span>
                  <p className="pt-1 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 space-y-3 rounded-2xl bg-ringo-beige/40 p-4 text-sm">
              <p className="font-semibold text-ringo-pink">注意事項</p>
              <ul className="list-disc space-y-1 pl-5 text-ringo-ink/80">
                <li>PNG または JPG 形式 / 10MB 以下</li>
                <li>注文番号・商品名・金額が読めるように撮影</li>
                <li>個人情報が写る場合はマスキングしてもOK</li>
              </ul>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-ringo-ink/80">スクリーンショットファイル</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-dashed border-ringo-pink/60 bg-white px-4 py-6 text-sm text-ringo-ink/80 shadow-inner"
              />

              {previewUrl && (
                <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-ringo-ink/10 bg-ringo-slate-light/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="スクリーンショットプレビュー" className="h-full w-full object-contain" />
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 text-sm text-ringo-ink/70">
                <button
                  type="button"
                  onClick={uploadFile}
                  disabled={!file || isUploading}
                  className="rounded-ringo-pill border border-ringo-pink bg-white py-3 font-semibold text-ringo-pink transition hover:bg-ringo-pink/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "アップロード中..." : file ? "このファイルをアップロード" : "アップロードするファイルを選択"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!uploadedUrl || isSubmitting}
                  className="rounded-ringo-pill bg-ringo-pink py-3 font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "送信中..." : "確認へ送信"}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
              <h3 className="text-lg font-semibold text-ringo-red">購入したアイテム</h3>
              {isLoading ? (
                <p className="mt-4 text-sm text-ringo-ink/60">割り当てを読み込み中...</p>
              ) : purchase ? (
                <div className="mt-4 space-y-3 text-sm">
                  <p>
                    <span className="text-ringo-ink/70">匿名ユーザー:</span> {purchase.alias}
                  </p>
                  <p>
                    <span className="text-ringo-ink/70">商品名:</span> {purchase.itemName}
                  </p>
                  <p>
                    <span className="text-ringo-ink/70">価格:</span> ¥{purchase.price.toLocaleString()}
                  </p>
                  <Link href={purchase.wishlistUrl} target="_blank" rel="noreferrer" className="text-ringo-pink underline">
                    Amazon欲しいものリストを開く
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-ringo-ink/70">提出待ちの購入が見つかりません。購入ページで割り当てを取得してください。</p>
                  <Link href="/purchase" className="text-ringo-pink underline">
                    購入ページへ戻る
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card text-sm">
              <h3 className="text-lg font-semibold text-ringo-red">AI審査について</h3>
              <p className="mt-3 text-ringo-ink/80">
                提出されたスクリーンショットは GPT-4o Vision が自動で内容をチェックし、注文番号・商品名・金額が整合しているか確認します。結果に応じて即時承認または管理者レビューへ回付されます。
              </p>
            </div>
          </aside>
        </section>
      </main>
    </UserFlowGuard>
  );
}
