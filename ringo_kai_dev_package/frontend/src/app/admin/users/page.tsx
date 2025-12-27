"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AdminUserRow = {
  id: string;
  email: string;
  status: string;
  referral_code?: string;
  referral_count?: number;
  silver_gold_completed_count?: number;
  apple_draw_rights?: number;
  purchase_obligation?: number;
  purchase_available?: number;
  wishlist_url?: string;
  created_at?: string;
  updated_at?: string;
};

type AdminUserResponse = {
  users: AdminUserRow[];
};

const STATUS_OPTIONS = [
  "registered",
  "terms_agreed",
  "tutorial_completed",
  "ready_to_purchase",
  "verifying",
  "first_purchase_completed",
  "ready_to_draw",
  "active",
];

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export default function AdminUsersPage() {
  const [adminToken, setAdminToken] = useState("");
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<Record<string, string>>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);

  const backendUrl = useMemo(() => backendBase, []);
  const hasBackend = Boolean(backendUrl);

  const fetchUsers = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride ?? adminToken;
      if (!token || !backendUrl) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (statusFilter) params.set("status_filter", statusFilter);
        if (searchQuery) params.set("search", searchQuery);
        const res = await fetch(`${backendUrl}/api/admin/users?${params.toString()}`, {
          headers: {
            "X-Admin-Token": token,
          },
        });
        if (!res.ok) throw new Error("ユーザー一覧の取得に失敗しました");
        const data = (await res.json()) as AdminUserResponse;
        setUsers(data.users ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "一覧取得に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [adminToken, backendUrl, searchQuery, statusFilter],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("adminToken");
    if (stored) {
      setAdminToken(stored);
      setAdminTokenInput(stored);
    }
  }, []);

  useEffect(() => {
    if (!adminToken) return;
    void fetchUsers();
  }, [adminToken, statusFilter, searchQuery, fetchUsers]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchTerm.trim());
  };

  const handleTokenSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = adminTokenInput.trim();
    setAdminTokenInput(trimmed);
    setAdminToken(trimmed);
    if (trimmed) {
      window.localStorage.setItem("adminToken", trimmed);
    } else {
      window.localStorage.removeItem("adminToken");
    }
  };

  const handleFieldChange = (userId: string, field: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const buildPayload = (user: AdminUserRow) => {
    const edit = edits[user.id];
    if (!edit) return null;
    const payload: Record<string, number | string> = {};
    if (edit.status && edit.status !== user.status) {
      payload.status = edit.status;
    }
    const numberFields: Array<keyof AdminUserRow> = [
      "apple_draw_rights",
      "purchase_obligation",
      "purchase_available",
      "referral_count",
      "silver_gold_completed_count",
    ];
    for (const field of numberFields) {
      if (edit[field] === undefined) continue;
      const rawValue = edit[field];
      if (rawValue === "") continue;
      const parsed = Number(rawValue);
      if (!Number.isNaN(parsed) && parsed !== (user[field] ?? 0)) {
        payload[field] = parsed;
      }
    }
    return Object.keys(payload).length ? payload : null;
  };

  const handleSave = async (user: AdminUserRow) => {
    const payload = buildPayload(user);
    if (!payload) {
      setMessage("変更がありません");
      return;
    }
    if (!backendUrl) return;
    setSavingUserId(user.id);
    setMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setMessage(`${user.email} を更新しました`);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleGrantRedApple = async (userId: string) => {
    if (!backendUrl) return;
    setGrantingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${userId}/grant-red-apple`, {
        method: "POST",
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
      if (!res.ok) throw new Error("赤いりんごの付与に失敗しました");
      setMessage("赤いりんごを付与しました");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "赤いりんごの付与に失敗しました");
    } finally {
      setGrantingUserId(null);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchTerm.trim());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 text-ringo-ink">
      <header className="space-y-2">
        <h1 className="font-logo text-4xl font-bold">管理者: ユーザー管理</h1>
        <p className="text-sm text-ringo-ink/70">ユーザーのステータスとカウンタを調整し、赤いりんごを付与できます。</p>
        <div className="text-xs text-ringo-ink/60 space-x-3">
          <Link href="/admin/dashboard" className="text-ringo-pink underline">
            ダッシュボード
          </Link>
          <Link href="/admin/verifications" className="text-ringo-pink underline">
            購入検証
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <h2 className="text-lg font-semibold text-ringo-red">管理者トークン</h2>
        <form className="mt-3 flex flex-col gap-3 md:flex-row" onSubmit={handleTokenSubmit}>
          <input
            type="password"
            value={adminTokenInput}
            onChange={(event) => setAdminTokenInput(event.target.value)}
            placeholder="管理者用トークンを入力"
            className="flex-1 rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-ringo-pill bg-ringo-pink px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ringo-pink/40 transition hover:-translate-y-0.5"
          >
            {isLoading ? "取得中..." : "適用"}
          </button>
        </form>
        {!hasBackend && <p className="mt-2 text-xs text-ringo-red">NEXT_PUBLIC_BACKEND_URL が設定されていません。</p>}
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <form className="grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="メール / 紹介コードで検索"
            className="rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-4 py-3 text-sm outline-none focus:border-ringo-pink focus:ring-2 focus:ring-ringo-pink/30"
          >
            <option value="">全ステータス</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-ringo-pill bg-ringo-pink px-4 py-3 text-sm font-semibold text-white shadow-ringo-pink/40"
            >
              検索
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchQuery("");
              }}
              className="rounded-ringo-pill border border-ringo-purple/40 px-4 py-3 text-sm font-semibold text-ringo-ink"
            >
              リセット
            </button>
          </div>
        </form>
      </section>

      {message && <p className="rounded-3xl border border-ringo-green/30 bg-ringo-slate-light/40 px-4 py-3 text-sm text-ringo-green">{message}</p>}
      {error && <p className="rounded-3xl border border-ringo-red/40 bg-ringo-pink/10 px-4 py-3 text-sm text-ringo-red">{error}</p>}

      <section className="rounded-3xl border border-ringo-purple/20 bg-white/80 p-6 shadow-ringo-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ringo-red">ユーザー一覧</h2>
          <button
            type="button"
            onClick={() => fetchUsers()}
            className="rounded-ringo-pill border border-ringo-pink px-4 py-2 text-xs font-semibold text-ringo-pink"
          >
            {isLoading ? "更新中..." : "再読み込み"}
          </button>
        </div>
        {users.length === 0 ? (
          <p className="mt-4 text-sm text-ringo-ink/60">該当するユーザーが見つかりません。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="border-b border-ringo-purple/20 text-xs uppercase text-ringo-ink/70">
                  <th className="p-3">メール</th>
                  <th className="p-3">ステータス</th>
                  <th className="p-3">カウンタ</th>
                  <th className="p-3">紹介</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const edit = edits[user.id] ?? {};
                  const statusValue = edit.status ?? user.status ?? "";
                  const numberValue = (field: keyof AdminUserRow) => {
                    if (edit[field] !== undefined) return edit[field] ?? "";
                    return user[field]?.toString() ?? "0";
                  };
                  return (
                    <tr key={user.id} className="border-b border-ringo-purple/10 align-top">
                      <td className="p-3">
                        <p className="font-semibold">{user.email}</p>
                        <p className="text-xs text-ringo-ink/60">{user.id}</p>
                        {user.wishlist_url && (
                          <Link href={user.wishlist_url} target="_blank" rel="noreferrer" className="text-xs text-ringo-pink underline">
                            Wishlist
                          </Link>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={statusValue}
                          onChange={(event) => handleFieldChange(user.id, "status", event.target.value)}
                          className="w-full rounded-2xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-2 text-xs outline-none focus:border-ringo-pink"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-ringo-ink/60">更新日: {user.updated_at ? new Date(user.updated_at).toLocaleString() : "-"}</p>
                      </td>
                      <td className="p-3 text-xs">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2">
                            <span className="w-32">抽選権</span>
                            <input
                              type="number"
                              min={0}
                              value={numberValue("apple_draw_rights")}
                              onChange={(event) => handleFieldChange(user.id, "apple_draw_rights", event.target.value)}
                              className="flex-1 rounded-xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-1"
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            <span className="w-32">購入義務</span>
                            <input
                              type="number"
                              min={0}
                              value={numberValue("purchase_obligation")}
                              onChange={(event) => handleFieldChange(user.id, "purchase_obligation", event.target.value)}
                              className="flex-1 rounded-xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-1"
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            <span className="w-32">免除枚数</span>
                            <input
                              type="number"
                              min={0}
                              value={numberValue("purchase_available")}
                              onChange={(event) => handleFieldChange(user.id, "purchase_available", event.target.value)}
                              className="flex-1 rounded-xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-1"
                            />
                          </label>
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <p>紹介コード: {user.referral_code || "-"}</p>
                        <label className="mt-2 flex items-center gap-2">
                          <span className="w-24">紹介人数</span>
                          <input
                            type="number"
                            min={0}
                            value={numberValue("referral_count")}
                            onChange={(event) => handleFieldChange(user.id, "referral_count", event.target.value)}
                            className="flex-1 rounded-xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-1"
                          />
                        </label>
                        <label className="mt-2 flex items-center gap-2">
                          <span className="w-24">S/G 完了</span>
                          <input
                            type="number"
                            min={0}
                            value={numberValue("silver_gold_completed_count")}
                            onChange={(event) => handleFieldChange(user.id, "silver_gold_completed_count", event.target.value)}
                            className="flex-1 rounded-xl border border-ringo-purple/30 bg-ringo-bg/40 px-3 py-1"
                          />
                        </label>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2 text-xs">
                          <button
                            type="button"
                            disabled={savingUserId === user.id}
                            onClick={() => handleSave(user)}
                            className="rounded-ringo-pill bg-ringo-pink px-3 py-1 font-semibold text-white disabled:opacity-50"
                          >
                            {savingUserId === user.id ? "保存中..." : "保存"}
                          </button>
                          <button
                            type="button"
                            disabled={grantingUserId === user.id}
                            onClick={() => handleGrantRedApple(user.id)}
                            className="rounded-ringo-pill bg-ringo-red px-3 py-1 font-semibold text-white disabled:opacity-50"
                          >
                            {grantingUserId === user.id ? "付与中..." : "赤いりんご"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
