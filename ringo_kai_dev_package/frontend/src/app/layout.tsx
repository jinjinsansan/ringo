import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";

import { Chatbot } from "@/components/Chatbot";
import { AdminToolbar } from "@/components/AdminToolbar";
import "./globals.css";

const bodyFont = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const logoFont = Zen_Maru_Gothic({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "りんご会♪",
  description:
    "Amazonの欲しいものリストを交換し合う、ゲーム感覚のコミュニティ『りんご会♪』公式サイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${bodyFont.variable} ${logoFont.variable} antialiased bg-ringo-bg text-ringo-ink`}>
        {children}
        <AdminToolbar />
        <Chatbot />
      </body>
    </html>
  );
}
