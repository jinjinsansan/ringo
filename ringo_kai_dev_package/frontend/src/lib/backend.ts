export const getBackendBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
  if (!raw) return "";
  const base = raw.replace(/\/$/, "");

  if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
    return `https://${base.slice("http://".length)}`;
  }

  return base;
};

export const buildBackendUrl = (path: string) => `${getBackendBaseUrl()}${path}`;
