import { NextResponse } from "next/server";
import { normalizeUrl } from "@/lib/tiktok";
import {
  checkRateLimit,
  getClientIp,
  rateLimitFromEnv,
  respectUpstreamOnePerSecond,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const TIKWM_BASE =
  process.env.TIKWM_API_BASE?.replace(/\/+$/, "") || "https://www.tikwm.com";
const WORKER_BASE =
  process.env.WORKER_API_BASE?.replace(/\/+$/, "") ||
  "https://tdownv4.sl-bjs.workers.dev";

export type MediaType = "video" | "images";

export interface ResolveResult {
  id: string;
  type: MediaType;
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
  source: "tikwm" | "worker" | "oembed";
  hdRequested: boolean;
}

interface TikWmData {
  id?: string | number;
  title?: string;
  cover?: string;
  ai_dynamic_cover?: string;
  duration?: number;
  digg_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time?: number;
  author?: { nickname?: string; unique_id?: string; avatar?: string };
  music?: string;
  play?: string;
  hdplay?: string;
  wmplay?: string;
  images?: string[];
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KiraaDown/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

async function tryTikWm(url: string, hd: boolean): Promise<ResolveResult> {
  await respectUpstreamOnePerSecond();
  const api =
    `${TIKWM_BASE}/api/?url=${encodeURIComponent(url)}` + (hd ? "&hd=1" : "");
  const raw = (await fetchJson(api, 15000)) as {
    code?: number;
    msg?: string;
    data?: TikWmData;
  };
  if (raw?.code !== 0 || !raw?.data) {
    throw new Error(raw?.msg || "Konten tidak ditemukan di TikWM");
  }
  const d = raw.data;
  const images = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
  const isImages = images.length > 0;
  return {
    id: String(d.id ?? Date.now()),
    type: isImages ? "images" : "video",
    title: (d.title ?? "").slice(0, 500) || "Tanpa judul",
    author: d.author?.nickname || d.author?.unique_id || "Kreator TikTok",
    username: d.author?.unique_id || "",
    avatar: d.author?.avatar || "",
    cover: d.cover || d.ai_dynamic_cover || images[0] || "",
    duration: Number(d.duration ?? 0) || 0,
    likes: Number(d.digg_count ?? 0) || 0,
    comments: Number(d.comment_count ?? 0) || 0,
    shares: Number(d.share_count ?? 0) || 0,
    createdAt: d.create_time
      ? new Date(Number(d.create_time) * 1000).toISOString()
      : "",
    video: {
      noWatermark: d.hdplay || d.play || "",
      watermark: d.wmplay || d.play || "",
      hd: d.hdplay || "",
    },
    audio: d.music || "",
    images,
    source: "tikwm",
    hdRequested: hd,
  };
}

async function tryWorker(url: string): Promise<ResolveResult> {
  const api = `${WORKER_BASE}/?down=${encodeURIComponent(url)}`;
  const raw = (await fetchJson(api, 15000)) as {
    error?: string;
    title?: string;
    content_type?: string;
    video_id?: string | number;
    download_url?: string;
    author?: {
      username?: string;
      nickname?: string;
      avatar?: string;
      duration?: number;
      view_count?: number;
      like_count?: number;
      audio_url?: string;
    };
  };
  if (raw?.error || !raw?.download_url) {
    throw new Error(raw?.error || "Worker cadangan gagal mengekstrak.");
  }
  const a = raw.author ?? {};
  return {
    id: String(raw.video_id ?? Date.now()),
    type: "video",
    title: (raw.title ?? "").slice(0, 500) || "Tanpa judul",
    author: a.nickname || a.username || "Kreator TikTok",
    username: a.username || "",
    avatar: a.avatar || "",
    cover: "",
    duration: Number(a.duration ?? 0) || 0,
    likes: Number(a.like_count ?? 0) || 0,
    comments: 0,
    shares: 0,
    createdAt: "",
    video: {
      noWatermark: raw.download_url || "",
      watermark: raw.download_url || "",
      hd: "",
    },
    audio: a.audio_url || "",
    images: [],
    source: "worker",
    hdRequested: false,
  };
}

async function tryOEmbed(url: string): Promise<ResolveResult> {
  const api = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const raw = (await fetchJson(api, 10000)) as {
    title?: string;
    author_name?: string;
    author_unique_id?: string;
    thumbnail_url?: string;
  };
  return {
    id: `oembed-${Date.now()}`,
    type: "video",
    title: (raw?.title ?? "").slice(0, 500) || "Tanpa judul",
    author: raw?.author_name || "Kreator TikTok",
    username: raw?.author_unique_id || "",
    avatar: "",
    cover: raw?.thumbnail_url || "",
    duration: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: "",
    video: { noWatermark: "", watermark: "", hd: "" },
    audio: "",
    images: [],
    source: "oembed",
    hdRequested: false,
  };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { limit, windowMs } = rateLimitFromEnv();
    const rl = checkRateLimit(`resolve:${ip}`, limit, windowMs);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar.", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    let body: { url?: unknown; hd?: unknown };
    try {
      body = (await req.json()) as { url?: unknown; hd?: unknown };
    } catch {
      return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    }

    if (typeof body.url !== "string") {
      return NextResponse.json({ error: "Field url wajib diisi." }, { status: 400 });
    }
    const normalized = normalizeUrl(body.url);
    if (!normalized) {
      return NextResponse.json(
        { error: "URL tidak valid. Gunakan link TikTok (tiktok.com, vm.tiktok.com, vt.tiktok.com)." },
        { status: 400 },
      );
    }
    const hd = body.hd === true;

    try {
      const result = await tryTikWm(normalized, hd);
      return NextResponse.json(
        { data: result },
        { headers: { "Cache-Control": "public, max-age=60" } },
      );
    } catch (e) {
      // Rantai cadangan gratis: worker publik lalu oEmbed resmi.
      try {
        const fallback = await tryWorker(normalized);
        return NextResponse.json(
          {
            data: fallback,
            warning:
              "Penyedia utama sibuk, hasil dari server cadangan. Kualitas sama, metadata lebih ringkas.",
          },
          { status: 200 },
        );
      } catch {
        /* lanjut ke oEmbed */
      }
      try {
        const partial = await tryOEmbed(normalized);
        return NextResponse.json(
          {
            data: partial,
            warning:
              "Unduhan langsung gagal dari penyedia gratis. Metadata dasar tetap ditampilkan. Coba lagi atau gunakan URL lain.",
          },
          { status: 200 },
        );
      } catch {
        const msg = e instanceof Error ? e.message : "Gagal memproses URL.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }
  } catch {
    return NextResponse.json({ error: "Kesalahan server." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: "POST { url, hd? }",
    limits: { perIpPerMinute: rateLimitFromEnv().limit, upstream: "1 req/detik (TikWM gratis)", chain: ["tikwm", "worker", "oembed"] },
  });
}
