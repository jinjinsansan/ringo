import type { NextRequest } from "next/server";

const getBackendBase = () => {
  const raw = (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
  if (!raw) {
    throw new Error("BACKEND_URL または NEXT_PUBLIC_BACKEND_URL が設定されていません。");
  }
  return raw.replace(/\/$/, "");
};

type RouteParams = { path?: string[] };
type RouteContext = { params: RouteParams } | { params: Promise<RouteParams> };

const resolveParams = async (context: RouteContext): Promise<RouteParams> => {
  const { params } = context;
  if (typeof (params as Promise<RouteParams>).then === "function") {
    return params as Promise<RouteParams>;
  }
  return params as RouteParams;
};

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "host",
]);

const buildTargetUrl = (base: string, segments: string[] | undefined, search: string) => {
  const joined = segments?.length ? `/${segments.map((part) => encodeURIComponent(part)).join("/")}` : "";
  const target = new URL(`${base}${joined}`);
  target.search = search;
  return target.toString();
};

type ProxyRequestInit = RequestInit & { duplex?: "half" };

const buildInit = (request: NextRequest): ProxyRequestInit => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const init: ProxyRequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
    init.duplex = "half";
  }

  return init;
};

const forward = async (request: NextRequest, context: RouteContext) => {
  const params = await resolveParams(context);
  const backendBase = getBackendBase();
  const targetUrl = buildTargetUrl(backendBase, params.path, request.nextUrl.search);
  try {
    const response = await fetch(targetUrl, buildInit(request));
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[backend-proxy]", error);
    return new Response(JSON.stringify({ message: "バックエンドへの接続に失敗しました。" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
export const PATCH = forward;
export const OPTIONS = forward;
