import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitFromEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Host yang diizinkan untuk di-proxy. Daftar ketat untuk cegah SSRF / abuse.
const ALLOW_SUFFIX = [
  ".tiktokcdn.com",
  ".tiktokcdn-us.com",
  ".tiktokv.com",
  ".tiktok.com",
  ".muscdn.com",
  ".tiktokcdn-eu.com",
  ".ibytedtos.com",
];
const ALLOW_EXACT = new Set([
  "www.tikwm.com",
  "tikwm.com",
  "api.tikwm.com",
  "v16-webapp-prime.tiktok.com",
]);

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (ALLOW_EXACT.has(h)) return true;
  return ALLOW_SUFFIX.some((s) => h === s.slice(1) || h.endsWith(s));
}

function safeFilename(name: string, fallback: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return clean || fallback;
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { limit, windowMs } = rateLimitFromEnv();
  const rl = checkRateLimit(
    `proxy:${ip}`,
    Math.max(4, Math.min(limit * 2, 30)),
    windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak unduhan. Tunggu sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url") ?? "";
  const filename = safeFilename(
    searchParams.get("filename") ?? "",
    `kiraadown-${Date.now()}`,
  );

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Parameter url tidak valid." }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Hanya URL https yang diizinkan." }, { status: 400 });
  }
  if (!hostAllowed(parsed.hostname)) {
    return NextResponse.json({ error: "Host media tidak diizinkan." }, { status: 403 });
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25000);
  try {
    const upstream = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KiraaDown/1.0",
        Referer: "https://www.tiktok.com/",
      },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Media upstream merespons ${upstream.status}.` },
        { status: 502 },
      );
    }
    const len = Number(upstream.headers.get("content-length") ?? 0);
    if (len > 120 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file melebihi batas 120 MB." }, { status: 413 });
    }
    const ct =
      upstream.headers.get("content-type") || "application/octet-stream";
    if (!/^(video|audio|image)\//.test(ct) && !ct.includes("octet-stream")) {
      return NextResponse.json({ error: "Tipe konten tidak didukung." }, { status: 415 });
    }

    const headers = new Headers();
    headers.set("Content-Type", ct);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    if (len) headers.set("Content-Length", String(len));

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    const aborted =
      e instanceof Error && (e.name === "AbortError" || /abort/i.test(e.message));
    return NextResponse.json(
      { error: aborted ? "Timeout saat mengambil media." : "Gagal mengambil media." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
