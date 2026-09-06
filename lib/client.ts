export interface ResolveData {
  id: string;
  type: "video" | "images";
  title: string;
  author: string;
  username: string;
  avatar: string;
  cover: string;
  duration: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  video: { noWatermark: string; watermark: string; hd: string };
  audio: string;
  images: string[];
  source: string;
}

export interface HistoryItem {
  key: string;
  url: string;
  id: string;
  type: string;
  title: string;
  author: string;
  username: string;
  cover: string;
  time: number;
  pinned?: boolean;
}

const KEY = "kiraadown_history_v1";
const MAX = 30;
export const HISTORY_MAX = MAX;

function sortHistory(list: HistoryItem[]): HistoryItem[] {
  return [...list].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.time - a.time;
  });
}

function persistHistory(list: HistoryItem[]): HistoryItem[] {
  const sorted = sortHistory(list).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(sorted));
  } catch {
    /* abaikan */
  }
  return sorted;
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(arr)) return [];
    const cleaned = arr
      .filter((h) => h && typeof h.url === "string")
      .map((h) => ({ ...h, pinned: !!h.pinned }));
    return sortHistory(cleaned).slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const prev = loadHistory();
  const keptPin = prev.find((h) => h.url === item.url)?.pinned ?? !!item.pinned;
  const list = prev.filter((h) => h.url !== item.url);
  list.unshift({ ...item, pinned: keptPin });
  return persistHistory(list);
}

export function togglePinItem(key: string): HistoryItem[] {
  const list = loadHistory().map((h) =>
    h.key === key ? { ...h, pinned: !h.pinned } : h,
  );
  return persistHistory(list);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

export function removeHistoryItem(key: string): HistoryItem[] {
  const list = loadHistory().filter((h) => h.key !== key);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* abaikan */
  }
  return list;
}

// Cache hasil resolve di sessionStorage agar "unduh ulang" tidak
// memanggil TikWM lagi selama tab masih terbuka. Hemat quota 1 req/detik.
// URL CDN TikTok bertanda tangan dan cepat kedaluwarsa, jadi TTL pendek.
const CACHE_KEY = "kiraadown_resolve_cache_v1";
const CACHE_MAX = 20;
export const RESOLVE_CACHE_TTL_MS = 30 * 60 * 1000;

interface ResolveCacheEntry {
  url: string;
  data: ResolveData;
  time: number;
}

function readCache(): ResolveCacheEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ResolveCacheEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveResolveCache(url: string, data: ResolveData): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const target = url.trim();
    const list = readCache().filter(
      (e) =>
        e.url !== target &&
        e.data?.id !== data.id &&
        now - e.time < RESOLVE_CACHE_TTL_MS,
    );
    list.unshift({ url: target, data, time: now });
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify(list.slice(0, CACHE_MAX)),
    );
  } catch {
    /* abaikan: sessionStorage penuh atau diblokir */
  }
}

export function loadResolveCache(url: string, id?: string): ResolveData | null {
  const now = Date.now();
  const target = url.trim();
  const list = readCache();
  let changed = false;
  let hit: ResolveData | null = null;
  const kept: ResolveCacheEntry[] = [];
  for (const e of list) {
    if (now - e.time >= RESOLVE_CACHE_TTL_MS || !e.data) {
      changed = true;
      continue;
    }
    if (!hit && (e.url === target || (id && e.data.id === id))) {
      hit = e.data;
    }
    kept.push(e);
  }
  if (changed) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(kept));
    } catch {
      /* abaikan */
    }
  }
  return hit;
}

export function proxyUrl(mediaUrl: string, filename: string): string {
  return `/api/proxy?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
}

export function baseFilename(prefix: string, id: string, ext: string): string {
  const safe = `${prefix}-${id}`.replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 60);
  return `${safe}.${ext}`;
}

export function formatCount(n: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} rb`;
  return String(n);
}

export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
