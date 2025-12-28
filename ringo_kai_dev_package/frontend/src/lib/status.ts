import type { UserStatus } from "@/lib/user";

import { buildBackendUrl } from "@/lib/backend";

type UpdateResult = {
  error: { message: string } | null;
};

const buildUrl = (path: string) => buildBackendUrl(path);
const buildProxyUrl = (path: string) => `/api/backend${path.startsWith("/") ? path : `/${path}`}`;

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

const shouldRetryWithProxy = (error: unknown, targetUrl: string) => {
  if (!(error instanceof TypeError)) return false;
  if (typeof window === "undefined") return false;
  if (!targetUrl.startsWith("http")) return false;
  try {
    const url = new URL(targetUrl);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
};

export const authorizedFetch = async (path: string, userId: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set("X-User-Id", userId);

  const attempt = async (target: string) => {
    const response = await fetch(target, {
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

  const primaryUrl = buildUrl(path);
  try {
    return await attempt(primaryUrl);
  } catch (error) {
    if (shouldRetryWithProxy(error, primaryUrl)) {
      console.warn("[authorizedFetch] falling back to proxy for", path, error);
      return attempt(buildProxyUrl(path));
    }
    throw error;
  }
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
