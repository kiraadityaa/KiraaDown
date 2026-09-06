// Rate limiting in-memory yang realistis untuk Vercel Free.
// Catatan: pada serverless, state ini per-instance, jadi ini proteksi
// best-effort lapis pertama, bukan penghitung global. Cukup untuk abuse ringan.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Antrean serial untuk upstream TikWM (limit gratis 1 req/detik).
let lastUpstreamAt = 0;

export function checkRateLimit(
  key: string,
  limit = 12,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0, remaining: limit - b.count };
}

export async function respectUpstreamOnePerSecond(): Promise<void> {
  const now = Date.now();
  const wait = 1100 - (now - lastUpstreamAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastUpstreamAt = Date.now();
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  const real = req.headers.get("x-real-ip");
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function rateLimitFromEnv(): { limit: number; windowMs: number } {
  const limit = Math.min(
    60,
    Math.max(1, Number(process.env.RATE_LIMIT_PER_MIN ?? 12) || 12),
  );
  return { limit, windowMs: 60_000 };
}
