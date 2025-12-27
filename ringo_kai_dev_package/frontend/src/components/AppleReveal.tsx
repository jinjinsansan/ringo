"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { Countdown } from "@/components/Countdown";

export type AppleType = "bronze" | "silver" | "gold" | "red" | "poison";

const stageImages = {
  stage1: "/images/reveal_stages/reveal_stage1_common.png",
  stage2: "/images/reveal_stages/reveal_stage2_clean.png",
  stage3: "/images/reveal_stages/reveal_stage3_clean.png",
  stage4: (apple: AppleType) => `/images/reveal_stages/${apple}_stage4_clean.png`,
} as const;

const finalCards: Record<AppleType, string> = {
  bronze: "/images/cards/bronze_apple_card_v2.png",
  silver: "/images/cards/silver_apple_card_final.png",
  gold: "/images/cards/gold_apple_card_v2.png",
  red: "/images/cards/red_apple_card_premium.png",
  poison: "/images/cards/poison_apple_card_final.png",
};

const appleCopy: Record<AppleType, { title: string; reward: string }> = {
  bronze: { title: "🍎 ブロンズりんご", reward: "購入義務1 / 購入してもらえる1" },
  silver: { title: "🍎✨ シルバーりんご", reward: "購入義務1 / 購入してもらえる2" },
  gold: { title: "🍎✨✨ ゴールドりんご", reward: "購入義務1 / 購入してもらえる3" },
  red: { title: "🍎🔥 赤いりんご", reward: "購入義務1 / 購入してもらえる10" },
  poison: { title: "☠️ 毒りんご", reward: "購入義務1 / 購入免除0" },
};

const TOTAL_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const calcProgress = (drawTime: string, revealTime: string) => {
  const start = new Date(drawTime).getTime();
  const end = new Date(revealTime).getTime();
  const now = Date.now();
  const duration = Math.min(TOTAL_DURATION, Math.max(end - start, TOTAL_DURATION));
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.min(100, Math.max(0, ((now - start) / duration) * 100));
};

const imageByProgress = (apple: AppleType, progress: number) => {
  if (progress < 25) return stageImages.stage1;
  if (progress < 50) return stageImages.stage2;
  if (progress < 75) return stageImages.stage3;
  if (progress < 100) return stageImages.stage4(apple);
  return finalCards[apple];
};

type Props = {
  appleType: AppleType;
  drawTime: string;
  revealTime: string;
  status: "pending" | "revealed";
};

export function AppleReveal({ appleType, drawTime, revealTime, status }: Props) {
  const [progress, setProgress] = useState(() => calcProgress(drawTime, revealTime));
  const cardImage = useMemo(() => imageByProgress(appleType, progress), [appleType, progress]);
  const copy = appleCopy[appleType];

  useEffect(() => {
    if (status === "revealed") {
      setProgress(100);
      return;
    }
    const interval = setInterval(() => {
      setProgress(calcProgress(drawTime, revealTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [drawTime, revealTime, status]);

  return (
    <div className="space-y-6 rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ringo-red">抽選中のりんご</p>
          <h2 className="text-2xl font-bold text-ringo-ink">{copy.title}</h2>
          <p className="text-sm text-ringo-ink/70">{copy.reward}</p>
        </div>
        <Countdown target={revealTime} />
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-ringo-bg/60">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ringo-purple/10" aria-hidden />
        <Image
          src={cardImage}
          alt={`${appleType} apple reveal stage`}
          width={600}
          height={840}
          className="w-full"
          priority
        />
      </div>
      <div className="space-y-4">
        <div className="h-3 w-full rounded-full bg-ringo-purple/20">
          <div className="h-full rounded-full bg-ringo-pink transition-all" style={{ width: `${progress}%` }} />
        </div>
        {progress < 100 ? (
          <p className="text-sm text-ringo-ink/80">
            24時間かけて徐々に結果が見えてくるよ。{progress.toFixed(0)}% まで開示されました。
          </p>
        ) : (
          <p className="text-sm font-semibold text-ringo-gold">結果が公開されました！チケットを確認しよう。</p>
        )}
      </div>
    </div>
  );
}
