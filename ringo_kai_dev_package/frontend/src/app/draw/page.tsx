"use client";

import { useEffect, useMemo, useState } from "react";

import { AppleReveal, AppleType } from "@/components/AppleReveal";
import { UserFlowGuard } from "@/components/UserFlowGuard";
import { useUser } from "@/lib/user";

type AppleStatus = "pending" | "revealed";

type AppleRevealResponse = {
  id: string;
  appleType: AppleType;
  drawTime: string;
  revealTime: string;
  status: AppleStatus;
};

const defaultProbabilities = [
  { label: "ブロンズ", value: "55%" },
  { label: "シルバー", value: "25%" },
  { label: "ゴールド", value: "12%" },
  { label: "赤いりんご", value: "5%" },
  { label: "毒りんご", value: "3%" },
];

const mockApple = (): AppleRevealResponse => {
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  const appleTypes: AppleType[] = ["bronze", "silver", "gold", "red", "poison"];
  return {
    id: "preview",
    appleType: appleTypes[Math.floor(Math.random() * appleTypes.length)],
    drawTime: new Date(now).toISOString(),
    revealTime: new Date(in24h).toISOString(),
    status: "pending",
  };
};

export default function DrawPage() {
  const { user } = useUser();
  const [currentApple, setCurrentApple] = useState<AppleRevealResponse | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentApple = useMemo(
    () =>
      async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/apple/current", { cache: "no-store" });
          if (!res.ok) throw new Error("現在のりんご情報を取得できませんでした");
          const data = (await res.json()) as AppleRevealResponse | null;
          setCurrentApple(data);
        } catch (err) {
          console.warn("apple fetch failed, fallback to mock", err);
          setCurrentApple(null);
        } finally {
          setLoading(false);
        }
      },
    []
  );

  useEffect(() => {
    fetchCurrentApple();
  }, [fetchCurrentApple]);

  const handleDraw = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/apple/draw", { method: "POST" });
      if (!res.ok) throw new Error("りんご抽選に失敗しました");
      const data = (await res.json()) as AppleRevealResponse;
      setCurrentApple(data);
    } catch (err) {
      console.error(err);
      setError("APIと接続できなかったため、プレビュー用のモックを表示します。");
      setCurrentApple(mockApple());
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserFlowGuard requiredStatus="ready_to_draw">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 text-ringo-ink md:px-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-ringo-red">STEP.09</p>
          <h1 className="font-logo text-4xl font-bold">りんごを引く</h1>
          <p className="text-sm text-ringo-ink/70">
            24時間後に結果が分かるスリル満点のりんご抽選。友達紹介や動的RTPによって勝率が変動します。
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-bold">現在のりんご確率</h2>
            <p className="text-sm text-ringo-ink/70">
              Probability Design 仕様書準拠のベース値。紹介人数やRTPによりリアルタイムで調整されます。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {defaultProbabilities.map((item) => (
                <div key={item.label} className="rounded-2xl bg-ringo-bg/70 p-4">
                  <p className="text-sm text-ringo-ink/70">{item.label}</p>
                  <p className="text-2xl font-bold text-ringo-red">{item.value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDraw}
              className="mt-6 w-full rounded-ringo-pill bg-ringo-pink py-3 text-lg font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "抽選中..." : "今すぐりんごを引く"}
            </button>
            {error && <p className="mt-3 text-sm text-ringo-red">{error}</p>}
          </div>

          <div className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
            <h2 className="text-xl font-bold">あなたのステータス</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="text-ringo-ink/70">ユーザー:</span> {user?.email ?? "-"}
              </p>
              <p>
                <span className="text-ringo-ink/70">ステータス:</span> {user?.status ?? "-"}
              </p>
              <p className="text-ringo-ink/70">
                ステータスは Supabase の user_metadata.status から取得しています。管理画面/バックエンドで更新されます。
              </p>
            </div>
          </div>
        </section>

        {currentApple ? (
          <AppleReveal
            appleType={currentApple.appleType}
            drawTime={currentApple.drawTime}
            revealTime={currentApple.revealTime}
            status={currentApple.status}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-ringo-purple/40 bg-white/70 p-10 text-center text-sm text-ringo-ink/70">
            まだ抽選していません。りんごを引くボタンを押して、初めてのりんごカードを開いてみよう！
          </div>
        )}

        <section className="space-y-4 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 text-sm shadow-ringo-card">
          <h2 className="text-xl font-bold">ルールのおさらい</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>抽選結果は24時間後に完全公開。途中経過でもドキドキ感を楽しめます。</li>
            <li>毒りんごを引いた場合、購入義務を果たした後に再挑戦できます。</li>
            <li>シルバー・ゴールド・赤りんごはチケットとして購入免除が付与され、完了時に紹介カウントが調整されます。</li>
          </ul>
        </section>
      </main>
    </UserFlowGuard>
  );
}
