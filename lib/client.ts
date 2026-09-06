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
}

const KEY = "kiraadown_history_v1";
const MAX = 30;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): HistoryItem[] {
  const list = loadHistory().filter((h) => h.url !== item.url);
  list.unshift(item);
  const trimmed = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* abaikan */
  }
  return trimmed;
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
