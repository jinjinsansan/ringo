"use client";

import { useEffect, useState } from "react";

type Props = {
  target: string;
};

const formatTimeLeft = (ms: number) => {
  if (ms <= 0) {
    return { hours: "00", minutes: "00", seconds: "00" };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return { hours, minutes, seconds };
};

export function Countdown({ target }: Props) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(new Date(target).getTime() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(new Date(target).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-ringo-red">
      <span>残り時間</span>
      <span className="rounded-full bg-ringo-purple/30 px-3 py-1 text-base text-ringo-ink">
        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
      </span>
    </div>
  );
}
