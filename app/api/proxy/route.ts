import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitFromEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Jaga tetap sinkron dengan MAX_PROXY_BYTES di app/page.tsx.
export const MAX_BYTES = 120 * 1024 * 1024;

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

function checkAbuse(req: Request): NextResponse | null {
  const ip = getClientIp(req);
  const { limit, windowMs } = rateLimitFromEnv();
  // Longgar dari limiter resolve karena tiap unduhan butuh 2 hit (HEAD + GET).
  const rl = checkRateLimit(
    `proxy:${ip}`,
    Math.max(10, Math.min(limit * 3, 60)),
    windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak unduhan. Tunggu sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  return null;
}

function parseTarget(
  req: Request,
): { target: URL; filename: string } | { error: NextResponse } {
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
    return {
      error: NextResponse.json(
        { error: "Parameter url tidak valid." },
        { status: 400 },
      ),
    };
  }
  if (parsed.protocol !== "https:") {
    return {
      error: NextResponse.json(
        { error: "Hanya URL https yang diizinkan." },
        { status: 400 },
      ),
    };
  }
  if (!hostAllowed(parsed.hostname)) {
    return {
      error: NextResponse.json(
        { error: "Host media tidak diizinkan." },
        { status: 403 },
      ),
    };
  }
  return { target: parsed, filename };
}

async function fetchUpstream(target: URL, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(target.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KiraaDown/1.0",
        Referer: "https://www.tiktok.com/",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Preflight ringan: klien cek ukuran file sebelum mengunduh.
// Dipakai agar file raksasa (misal 4K 120fps) langsung dibuka dari CDN
// daripada gagal diam-diam lewat proxy.
export async function HEAD(req: Request) {
  const blocked = checkAbuse(req);
  if (blocked) return blocked;
  const parsed = parseTarget(req);
  if ("error" in parsed) return parsed.error;

  let upstream: Response;
  try {
    upstream = await fetchUpstream(parsed.target, 15000);
  } catch {
    return NextResponse.json(
      { error: "Timeout saat memeriksa media." },
      { status: 504 },
    );
  }
  try {
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Media upstream merespons ${upstream.status}.` },
        { status: 502 },
      );
    }
    const headers = new Headers();
    headers.set(
      "X-File-Size",
      upstream.headers.get("content-length") ?? "0",
    );
    headers.set(
      "X-Content-Type",
      upstream.headers.get("content-type") ?? "application/octet-stream",
    );
    headers.set("X-Max-Bytes", String(MAX_BYTES));
    headers.set("Cache-Control", "private, max-age=300");
    return new Response(null, { status: 200, headers });
  } finally {
    try {
      await upstream.body?.cancel();
    } catch {
      /* abaikan */
    }
  }
}

export async function GET(req: Request) {
  const blocked = checkAbuse(req);
  if (blocked) return blocked;
  const parsed = parseTarget(req);
  if ("error" in parsed) return parsed.error;
  const { target: targetUrl, filename } = parsed;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25000);
  try {
    const upstream = await fetch(targetUrl.toString(), {
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
    if (len > MAX_BYTES) {
      try {
        await upstream.body.cancel();
      } catch {
        /* abaikan */
      }
      return NextResponse.json(
        {
          error: "Ukuran file melebihi batas 120 MB.",
          size: len,
          maxBytes: MAX_BYTES,
          fallback: "direct",
        },
        { status: 413 },
      );
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
