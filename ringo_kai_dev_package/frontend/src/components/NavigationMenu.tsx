"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createSupabaseClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Trap focus and handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab") {
        if (!menuRef.current) return;
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus first element when opened
    const timer = setTimeout(() => {
      const firstLink = menuRef.current?.querySelector("a");
      firstLink?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

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
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col justify-center gap-1.5 w-10 h-10 p-2 rounded-full hover:bg-ringo-pink/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ringo-pink"
        aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
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
          aria-hidden="true"
        />
      )}

      {/* Menu Panel */}
      <div 
        id="navigation-menu"
        ref={menuRef}
        className={`fixed top-0 right-0 h-full w-64 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-ringo-pink-soft/30 pt-20 px-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーションメニュー"
      >
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all outline-none focus:ring-2 focus:ring-ringo-pink ${
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
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors w-full text-left outline-none focus:ring-2 focus:ring-red-200"
          >
            <span className="text-xl">🚪</span>
            <span>ログアウト</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
