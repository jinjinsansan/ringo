import type { UserStatus } from "@/lib/user";

import { buildBackendUrl } from "@/lib/backend";

type UpdateResult = {
  error: { message: string } | null;
};

const buildUrl = (path: string) => buildBackendUrl(path);

export type ApiError = Error & {
  status?: number;
  payload?: unknown;
};

const createApiError = (message: string, status: number, payload: unknown): ApiError => {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.payload = payload;
  return error;
};

export const authorizedFetch = async (path: string, userId: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("X-User-Id", userId);
  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.detail ?? payload?.message ?? response.statusText;
    throw createApiError(message, response.status, payload);
  }
  return response;
};

export const fetchDashboard = async (userId: string) => {
  const response = await authorizedFetch("/api/dashboard", userId, {
    method: "GET",
  });
  return response.json() as Promise<{ user: Record<string, unknown>; apples: Record<string, number>; stats: Record<string, unknown> }>;
};

export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  extra: Record<string, unknown> = {}
): Promise<UpdateResult> => {
  if (!userId) {
    return { error: { message: "ユーザーIDが見つかりません。" } };
  }

  try {
    await authorizedFetch("/api/user/status", userId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, metadata: extra }),
    });

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "ステータス更新に失敗しました。";
    return { error: { message } };
  }
};
