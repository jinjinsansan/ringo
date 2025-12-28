import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FileLike = File;

const isFileLike = (value: FormDataEntryValue | null): value is FileLike => {
  return typeof value === "object" && value !== null && "arrayBuffer" in value;
};

const getBackendBaseUrl = () => {
  const raw = (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
  return raw ? raw.replace(/\/$/, "") : "";
};

export async function POST(request: Request) {
  try {
    const backendBase = getBackendBaseUrl();
    if (!backendBase) {
      return NextResponse.json({ detail: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const userId = request.headers.get("x-user-id") ?? request.headers.get("X-User-Id");
    if (!userId) {
      return NextResponse.json({ detail: "X-User-Id header is required" }, { status: 401 });
    }

    const incoming = await request.formData();
    const purchaseId = incoming.get("purchase_id");
    const file = incoming.get("file");
    if (!purchaseId || typeof purchaseId !== "string") {
      return NextResponse.json({ detail: "purchase_id is required" }, { status: 400 });
    }
    if (!isFileLike(file)) {
      return NextResponse.json({ detail: "file is required" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("purchase_id", purchaseId);
    formData.append("file", file, file.name ?? "screenshot.jpg");

    const upstream = await fetch(`${backendBase}/api/purchase/upload`, {
      method: "POST",
      headers: {
        "X-User-Id": userId,
      },
      body: formData,
    });

    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload ?? { detail: upstream.statusText }, { status: upstream.status });
  } catch (err) {
    console.error("purchase upload proxy error", err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
