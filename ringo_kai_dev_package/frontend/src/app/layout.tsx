import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Zen_Maru_Gothic } from "next/font/google";

import { Chatbot } from "@/components/Chatbot";
import { NavigationMenu } from "@/components/NavigationMenu";
import "./globals.css";

const bodyFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
  display: "swap",
});

const logoFont = Zen_Maru_Gothic({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["400", "500", "700", "900"],
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
        <div className="fixed top-3 right-6 z-[9999]">
          <NavigationMenu />
        </div>
        <Chatbot />
      </body>
    </html>
  );
}
