"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { label: "マイページ", path: "/dashboard", icon: "🏠" },
    { label: "りんごを引く", path: "/draw", icon: "🍎" },
    { label: "友達紹介", path: "/friends", icon: "👯‍♀️" },
    { label: "購入状況", path: "/purchase", icon: "🎁" },
    { label: "利用規約", path: "/terms", icon: "📄" },
  ];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col justify-center gap-1.5 w-10 h-10 p-2 rounded-full hover:bg-ringo-pink/10 transition-colors focus:outline-none"
        aria-label="メニューを開く"
      >
        <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-transform duration-300 ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-opacity duration-300 ${isOpen ? "opacity-0" : ""}`} />
        <span className={`block w-full h-0.5 bg-ringo-rose rounded-full transition-transform duration-300 ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-64 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-ringo-pink-soft/30 pt-20 px-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-ringo-pink/10 text-ringo-rose font-bold" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-ringo-ink"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="my-4 border-t border-gray-100" />
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors w-full text-left"
          >
            <span className="text-xl">🚪</span>
            <span>ログアウト</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
