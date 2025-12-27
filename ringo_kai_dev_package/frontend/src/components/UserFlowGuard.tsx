"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { RingoUser, UserStatus, statusOrder, useUser } from "@/lib/user";

const statusRedirectMap: Record<UserStatus, string> = {
  registered: "/terms",
  terms_agreed: "/tutorial",
  tutorial_completed: "/purchase",
  ready_to_purchase: "/purchase",
  verifying: "/verification-pending",
  first_purchase_completed: "/register-wishlist",
  ready_to_draw: "/draw",
  active: "/dashboard",
};

type Props = {
  requiredStatus: UserStatus;
  children: React.ReactNode;
};

const getFallbackRoute = (user: RingoUser | null) => {
  if (!user) return "/login";
  return statusRedirectMap[user.status] ?? "/dashboard";
};

export function UserFlowGuard({ requiredStatus, children }: Props) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const canAccess = useMemo(() => {
    if (!user) return false;
    const current = statusOrder.indexOf(user.status);
    const required = statusOrder.indexOf(requiredStatus);
    if (current === -1 || required === -1) return false;
    return current >= required;
  }, [requiredStatus, user]);

  useEffect(() => {
    if (isLoading) return;
    if (user && canAccess) return;
    router.replace(getFallbackRoute(user));
  }, [canAccess, isLoading, router, user]);

  if (isLoading || !canAccess) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center text-sm text-ringo-ink/70">
        ページを読み込み中です…
      </div>
    );
  }

  return <>{children}</>;
}
