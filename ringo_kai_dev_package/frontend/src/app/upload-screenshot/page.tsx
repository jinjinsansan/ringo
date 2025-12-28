"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UserFlowGuard } from "@/components/UserFlowGuard";
import { FlowLayout } from "@/components/FlowLayout";
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
      setSuccess("アップロードが完了しました！最後に「提出する」ボタンを押してください。");
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
      <FlowLayout 
        currentStepIndex={3} 
        title="報告する" 
        subtitle="購入の証明として、注文完了画面のスクリーンショットを送ってください。"
        showBack
      >
        <div className="space-y-6">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-400">購入情報を読み込み中...</div>
          ) : (
            <>
              {/* Purchase Summary */}
              {purchase && (
                <div className="bg-ringo-bg/50 rounded-xl p-4 border border-ringo-pink-soft/50 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">購入した商品</span>
                    <span className="font-bold text-ringo-ink">{purchase.itemName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 text-xs block">金額</span>
                    <span className="font-bold text-ringo-red">¥{purchase.price.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {error && <p className="bg-ringo-red/10 text-ringo-red p-3 rounded-xl text-sm text-center">{error}</p>}
              {success && <p className="bg-ringo-green/10 text-ringo-green p-3 rounded-xl text-sm text-center font-bold">{success}</p>}

              <div className="space-y-4">
                <div className="border-2 border-dashed border-ringo-pink-soft hover:border-ringo-rose bg-white/50 rounded-2xl p-6 transition-colors text-center cursor-pointer relative">
                   <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {previewUrl ? (
                     <div className="relative h-64 w-full">
                        <Image
                          src={previewUrl}
                          alt="プレビュー"
                          fill
                          sizes="(max-width: 768px) 100vw, 480px"
                          className="object-contain rounded-lg"
                          unoptimized
                        />
                     </div>
                  ) : (
                    <div className="py-8">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="font-bold text-ringo-rose">写真をアップロード</p>
                      <p className="text-xs text-gray-400 mt-1">タップして画像を選択</p>
                      <p className="text-[10px] text-gray-400 mt-2">※ 注文番号が写っていることを確認してね</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {file && !uploadedUrl && (
                     <button
                      type="button"
                      onClick={uploadFile}
                      disabled={isUploading}
                      className="btn-secondary w-full"
                    >
                      {isUploading ? "アップロード中..." : "1. 画像をアップロード"}
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!uploadedUrl || isSubmitting}
                    className={`w-full py-4 rounded-full font-bold shadow-lg transition-all ${
                      uploadedUrl && !isSubmitting 
                        ? "bg-gradient-to-r from-ringo-red to-ringo-rose text-white hover:scale-105" 
                        : "bg-gray-300 text-white cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? "送信中..." : "2. 確認へ送信する"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </FlowLayout>
    </UserFlowGuard>
  );
}
