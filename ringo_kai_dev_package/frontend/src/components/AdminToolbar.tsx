"use client";

import Link from "next/link";

import { useUser } from "@/lib/user";

const adminLinks = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/users", label: "ユーザー" },
  { href: "/admin/verifications", label: "購入検証" },
];

export function AdminToolbar() {
  const { user } = useUser();

  if (!user?.isAdmin) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 hidden flex-col gap-2 rounded-3xl border border-ringo-purple/30 bg-white/95 px-4 py-3 text-xs text-ringo-ink shadow-lg shadow-ringo-purple/30 sm:flex">
      <p className="text-[11px] font-semibold text-ringo-red">管理者モード ({user.email})</p>
      <div className="pointer-events-auto flex flex-wrap gap-2">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className="btn-primary px-4 py-2 text-xs">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
