"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { Countdown } from "@/components/Countdown";

export type AppleType = "bronze" | "silver" | "gold" | "red" | "poison";

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
const STAGE_COUNT = 5; // teaser stages before final reveal
const TEASER_POOL: AppleType[] = ["poison", "bronze", "silver", "gold", "red"];

const calcProgress = (drawTime: string, revealTime: string) => {
  const start = new Date(drawTime).getTime();
  const end = new Date(revealTime).getTime();
  const now = Date.now();
  const duration = Math.min(TOTAL_DURATION, Math.max(end - start, TOTAL_DURATION));
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.min(100, Math.max(0, ((now - start) / duration) * 100));
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

const generateTeasers = (appleId: string, actual: AppleType): AppleType[] => {
  const sequence: AppleType[] = [];
  let state = hashString(appleId || actual);

  for (let i = 0; i < STAGE_COUNT; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    let candidate = TEASER_POOL[state % TEASER_POOL.length];
    if (i === STAGE_COUNT - 1 && candidate === actual) {
      candidate = TEASER_POOL[(state + 1) % TEASER_POOL.length];
    }
    sequence.push(candidate);
  }

  return sequence;
};

const stageVisuals = [
  { title: "白黒のシルエット", description: "影だけが浮かび上がっています", filter: "grayscale(1) blur(26px)", opacity: 0.75 },
  { title: "ぼんやりとした輪郭", description: "かすかな色が混じってきました", filter: "grayscale(0.9) blur(18px)", opacity: 0.82 },
  { title: "全貌がぼけて見える", description: "カード全体の形が見えてきました", filter: "grayscale(0.6) blur(12px)", opacity: 0.9 },
  { title: "色が戻りつつある", description: "でもまだ確定ではありません", filter: "grayscale(0.3) blur(7px)", opacity: 0.95 },
  { title: "未確定カード", description: "このカードはヒントかもしれません…", filter: "blur(4px)", opacity: 1 },
];

type Props = {
  appleId: string;
  appleType: AppleType;
  drawTime: string;
  revealTime: string;
  status: "pending" | "revealed";
};

export function AppleReveal({ appleId, appleType, drawTime, revealTime, status }: Props) {
  const [progress, setProgress] = useState(() => calcProgress(drawTime, revealTime));
  const isFinal = progress >= 100 || status === "revealed";
  const stageIndex = isFinal ? STAGE_COUNT : Math.min(STAGE_COUNT - 1, Math.floor(progress / (100 / STAGE_COUNT)));

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

  const teasers = useMemo(() => generateTeasers(appleId, appleType), [appleId, appleType]);
  const displayCardType = isFinal ? appleType : teasers[stageIndex];
  const displayImage = finalCards[displayCardType];
  const visual = stageVisuals[stageIndex] ?? null;
  const showActualMeta = isFinal;
  const copy = appleCopy[appleType];

  return (
    <div className="space-y-6 rounded-3xl border border-ringo-purple/20 bg-white/85 p-6 shadow-ringo-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ringo-red">
            {showActualMeta ? "確定したりんご" : "りんごの正体を解析中"}
          </p>
          <h2 className="text-2xl font-bold text-ringo-ink">
            {showActualMeta ? copy.title : "？？？"}
          </h2>
          <p className="text-sm text-ringo-ink/70">
            {showActualMeta ? copy.reward : "24時間の間に5段階でヒントが増えていきます"}
          </p>
        </div>
        <Countdown target={revealTime} />
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/40 to-ringo-bg/80">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ringo-purple/10" aria-hidden />
        <Image
          src={displayImage}
          alt="apple reveal teaser"
          width={600}
          height={840}
          className="w-full"
          priority
          style={
            !showActualMeta && visual
              ? { filter: visual.filter, opacity: visual.opacity }
              : undefined
          }
        />
        {!showActualMeta && visual && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/10 via-white/5 to-ringo-bg/40 text-center">
            <p className="text-base font-bold text-ringo-ink drop-shadow-sm">{visual.title}</p>
            <p className="mt-1 w-52 text-xs text-gray-600">{visual.description}</p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="h-3 w-full rounded-full bg-ringo-purple/20">
          <div className="h-full rounded-full bg-gradient-to-r from-ringo-pink to-ringo-red transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        {showActualMeta ? (
          <p className="text-sm font-semibold text-ringo-gold">結果が公開されました！カードをタップして詳細を確認しましょう。</p>
        ) : (
          <p className="text-sm text-ringo-ink/80">
            ドキドキ開封中… {Math.min(progress, 99).toFixed(0)}% / 100%
          </p>
        )}
      </div>
    </div>
  );
}
