const ADMIN_TOKEN_STORAGE_KEY = "adminToken";
export const ADMIN_TOKEN_EVENT = "ringo-admin-token-changed";

const isBrowser = () => typeof window !== "undefined";

export const readAdminToken = () => {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
};

export const persistAdminToken = (token: string) => {
  if (!isBrowser()) return;
  if (token) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(ADMIN_TOKEN_EVENT, { detail: { hasToken: Boolean(token) } }));
};

export const hasAdminToken = () => Boolean(readAdminToken());
