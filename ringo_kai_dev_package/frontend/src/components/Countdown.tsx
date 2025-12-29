"use client";

import { useEffect, useState } from "react";

type Props = {
  target: string;
};

const formatTimeLeft = (ms: number) => {
  if (ms <= 0) {
    return { hours: "00", minutes: "00", seconds: "00", totalSeconds: 0 };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return { hours, minutes, seconds, totalSeconds };
};

export function Countdown({ target }: Props) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(new Date(target).getTime() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(new Date(target).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const segments = [
    { label: "HRS", value: timeLeft.hours },
    { label: "MIN", value: timeLeft.minutes },
    { label: "SEC", value: timeLeft.seconds },
  ];

  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ringo-rose">残り時間</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="rounded-2xl border border-white/60 bg-white/80 px-2 py-2 text-center shadow-sm shadow-ringo-card"
          >
            <div className="font-mono text-3xl font-extrabold tracking-widest text-ringo-ink">
              {segment.value}
            </div>
            <div className="text-[11px] font-semibold text-gray-400">{segment.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
