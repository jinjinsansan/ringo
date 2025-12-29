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
      <p className="text-[10px] font-bold uppercase tracking-widest text-ringo-rose/80 mb-2">残り時間</p>
      <div className="grid grid-cols-3 gap-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex flex-col items-center justify-center rounded-2xl border border-white bg-white/60 backdrop-blur-sm py-3 shadow-sm ring-1 ring-white/40"
          >
            <div className="font-numeric text-2xl font-bold tracking-wider text-ringo-ink">
              {segment.value}
            </div>
            <div className="text-[9px] font-bold text-gray-400 mt-1">{segment.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
