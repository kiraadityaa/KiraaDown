// Validasi URL TikTok. Diterima: tiktok.com, vm/vt/m short link, dengan atau tanpa skema.

const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "vm.tiktok.org",
  "vt.tiktok.org",
]);

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (TIKTOK_HOSTS.has(host.toLowerCase()) || TIKTOK_HOSTS.has(h)) return true;
  return (
    h === "tiktok.com" ||
    h.endsWith(".tiktok.com") ||
    h === "tiktokv.com" ||
    h.endsWith(".tiktokv.com")
  );
}

export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw) || raw.startsWith("//")
      ? raw.replace(/^\/\//, "https://")
      : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!hostAllowed(u.hostname)) return null;
    if (withScheme.length > 2048) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function isTikTokUrl(input: string): boolean {
  return normalizeUrl(input) !== null;
}

export function shortId(input: string): string {
  const m = input.match(/\/video\/(\d+)/);
  return m ? m[1] : input.slice(0, 48);
}
