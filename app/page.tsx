"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowClockwise,
  CheckCircle,
  ClipboardText,
  FilmStrip,
  Image as ImageIcon,
  MusicNote,
  Trash,
  WarningCircle,
  DownloadSimple,
  Play,
  Pause,
  Clock,
  Link as LinkIcon,
  List,
  X,
  GithubLogo,
  TiktokLogo,
  WhatsappLogo,
  InstagramLogo,
} from "@phosphor-icons/react";
import {
  baseFilename,
  clearHistory,
  formatCount,
  formatDuration,
  loadHistory,
  proxyUrl,
  removeHistoryItem,
  saveHistoryItem,
  type HistoryItem,
  type ResolveData,
} from "@/lib/client";

type Status = "idle" | "loading" | "success" | "error";

function looksTikTok(v: string): boolean {
  return /tiktok\.com|tiktokv\.com|vt\.tiktok|vm\.tiktok/i.test(v);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [hd, setHd] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ResolveData | null>(null);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [busyKey, setBusyKey] = useState<string>("");
  const [zipBusy, setZipBusy] = useState(false);
  const autoDone = useRef(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Paste otomatis dari clipboard saat pertama dibuka.
  useEffect(() => {
    if (autoDone.current) return;
    autoDone.current = true;
    const nav = navigator as Navigator & {
      clipboard?: { readText?: () => Promise<string> };
    };
    if (!nav.clipboard?.readText) return;
    nav.clipboard
      .readText()
      .then((t) => {
        if (t && looksTikTok(t.trim()) && !url) setUrl(t.trim().slice(0, 2048));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = useCallback(
    async (target?: string) => {
      const value = (target ?? url).trim();
      if (!value) {
        setError("Tempel link TikTok dulu.");
        setStatus("error");
        return;
      }
      if (!looksTikTok(value)) {
        setError("URL tidak valid. Gunakan link tiktok.com atau vm/vt.tiktok.com.");
        setStatus("error");
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus("loading");
      setError("");
      setWarning("");
      setResult(null);
      setPlaying(false);
      try {
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value, hd }),
          signal: ctrl.signal,
        });
        const json = (await res.json()) as {
          data?: ResolveData;
          warning?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `Gagal (${res.status})`);
        if (!json.data) throw new Error("Respons kosong dari server.");
        setResult(json.data);
        setWarning(json.warning || "");
        setStatus("success");
        const item: HistoryItem = {
          key: `${json.data.id}-${Date.now()}`,
          url: value,
          id: json.data.id,
          type: json.data.type,
          title: json.data.title,
          author: json.data.author,
          username: json.data.username,
          cover: json.data.cover,
          time: Date.now(),
        };
        setHistory(saveHistoryItem(item));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memproses. Coba lagi.");
        setStatus("error");
      }
    },
    [url, hd],
  );

  const pasteFromClipboard = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setUrl(t.trim().slice(0, 2048));
      else setError("Clipboard kosong.");
    } catch {
      setError("Izin clipboard ditolak. Tempel manual dengan Ctrl+V.");
      setStatus((s) => (result ? s : "error"));
    }
  }, [result]);

  const downloadFile = useCallback(async (mediaUrl: string, filename: string, key: string) => {
    if (!mediaUrl) return;
    setBusyKey(key);
    try {
      const a = document.createElement("a");
      a.href = proxyUrl(mediaUrl, filename);
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => setBusyKey(""), 1200);
    }
  }, []);

  const downloadAllImages = useCallback(async () => {
    if (!result || result.images.length === 0) return;
    setZipBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      let i = 0;
      for (const src of result.images) {
        i += 1;
        const r = await fetch(
          proxyUrl(src, baseFilename("kiraadown-foto", `${result.id}-${i}`, "jpg")),
        );
        if (!r.ok) continue;
        const blob = await r.blob();
        zip.file(`foto-${String(i).padStart(2, "0")}.jpg`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = baseFilename("kiraadown-semua-foto", result.id, "zip");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch {
      setError("Gagal membuat ZIP. Unduh foto satu per satu.");
    } finally {
      setZipBusy(false);
    }
  }, [result]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const [splashDone, setSplashDone] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Status API live untuk badge header.
  useEffect(() => {
    let alive = true;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => {
        if (alive) setApiOk(r.ok);
      })
      .catch(() => {
        if (alive) setApiOk(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Bayangan header hanya setelah konten tergulir (tanpa scroll listener).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const focusInput = useCallback(() => {
    setMenuOpen(false);
    const el = inputRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus({ preventScroll: true }), 400);
  }, []);

  const noWm = result?.video.noWatermark || "";
  const wm = result?.video.watermark || "";
  const hdUrl = result?.video.hd || "";
  const audio = result?.audio || "";
  const isImages = result?.type === "images";

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      <header
        className={`sticky top-0 z-50 backdrop-blur-md transition-colors ${
          scrolled
            ? "bg-[#f2f0e8]/90 dark:bg-[#0d0f0c]/90 border-b border-black/10 dark:border-white/10"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="#unduh" className="flex items-center gap-2.5 min-w-0" aria-label="KiraaDown ke atas">
            <span className="w-9 h-9 rounded-[12px] bg-lime-500 grid place-items-center font-mono font-bold text-lg text-lime-950 shrink-0 -rotate-3">
              K
            </span>
            <span className="leading-tight min-w-0">
              <span className="block font-bold tracking-tight">KiraaDown</span>
              <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] opacity-70">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    apiOk === null
                      ? "bg-neutral-400 animate-pulse"
                      : apiOk
                        ? "bg-lime-500"
                        : "bg-amber-500"
                  }`}
                />
                {apiOk === null ? "Menghubungi API" : apiOk ? "API aktif . Rp0" : "API lambat"}
              </span>
            </span>
          </a>

          {/* Nav desktop: pil tersegmentasi satu baris */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-1 text-sm rounded-full border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/5 p-1"
          >
            {[
              ["#unduh", "Unduh"],
              ["#riwayat", "Riwayat"],
              ["#batas", "Batas gratis"],
              ["#faq", "FAQ"],
              ["#kontak", "Kontak"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="px-3.5 py-1.5 rounded-full font-medium opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                {label}
              </a>
            ))}
            <button
              type="button"
              onClick={focusInput}
              className="btn-pill ml-1 px-4 py-1.5 bg-lime-500 hover:bg-lime-400 text-lime-950 font-bold inline-flex items-center gap-1.5"
            >
              <DownloadSimple size={15} weight="bold" /> Mulai
            </button>
          </nav>

          {/* Aksi mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={focusInput}
              className="btn-pill px-4 py-2 bg-lime-500 text-lime-950 text-sm font-bold inline-flex items-center gap-1.5"
            >
              <DownloadSimple size={15} weight="bold" /> Mulai
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              className="w-10 h-10 grid place-items-center rounded-full border border-black/15 dark:border-white/20"
            >
              {menuOpen ? <X size={19} /> : <List size={19} />}
            </button>
          </div>
        </div>

        {/* Panel menu mobile */}
        {menuOpen && (
          <nav
            aria-label="Navigasi seluler"
            className="md:hidden border-t border-black/10 dark:border-white/10 bg-[#f2f0e8] dark:bg-[#0d0f0c] px-4 py-3 grid gap-1 text-[15px] font-medium"
          >
            {[
              ["#unduh", "Unduh"],
              ["#riwayat", "Riwayat"],
              ["#batas", "Batas gratis"],
              ["#faq", "FAQ"],
              ["#kontak", "Kontak"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        {/* Hero split: kiri form, kanan panel status */}
        <section id="unduh" className="max-w-6xl mx-auto px-4 pt-10 md:pt-14 pb-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-lime-700 dark:text-lime-300">
              Downloader TikTok gratis
            </p>
            <h1 className="mt-3 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.02]">
              Tempel link, <span className="italic">pratinjau</span>, unduh.
            </h1>
            <p className="mt-4 text-base opacity-70 leading-relaxed max-w-[52ch]">
              Video tanpa watermark, slideshow foto, dan audio MP3. Riwayat hanya tersimpan di
              perangkat kamu. Tidak ada akun, tidak ada biaya.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void resolve();
              }}
            >
              <label htmlFor="tiktok-url" className="block text-sm font-semibold mb-2">
                Link TikTok
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" size={18} />
                  <input
                    id="tiktok-url"
                    ref={inputRef}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://www.tiktok.com/@user/video/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="field-input w-full pl-10 pr-4 py-3.5 bg-white dark:bg-[#141714] border border-black/15 dark:border-white/15 text-[15px] placeholder:text-neutral-400"
                    aria-describedby="url-help"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void pasteFromClipboard()}
                    className="btn-pill px-4 py-3 border border-black/15 dark:border-white/20 font-semibold text-sm flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <ClipboardText size={17} /> Tempel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-pill px-6 py-3 bg-lime-500 hover:bg-lime-400 text-lime-950 font-bold text-sm flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {status === "loading" ? (
                      <ArrowClockwise size={17} className="animate-spin" />
                    ) : (
                      <ArrowDown size={17} weight="bold" />
                    )}
                    {status === "loading" ? "Proses" : "Ambil"}
                  </button>
                </div>
              </div>
              <p id="url-help" className="mt-2 text-xs opacity-60">
                Mendukung tiktok.com, vm.tiktok.com, vt.tiktok.com, dan m.tiktok.com. Salin
                link lewat tombol Bagikan di aplikasi TikTok.
              </p>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <input
                  id="hd-toggle"
                  type="checkbox"
                  checked={hd}
                  onChange={(e) => setHd(e.target.checked)}
                  className="w-4 h-4 accent-lime-600"
                />
                <label htmlFor="hd-toggle">Minta kualitas HD bila tersedia</label>
              </div>
            </form>

            {/* Status */}
            <div className="mt-5" role="status" aria-live="polite">
              {status === "loading" && (
                <div className="dark-card p-4 grid grid-cols-[96px_1fr] gap-4">
                  <div className="skeleton rounded-xl h-28" />
                  <div className="space-y-2 py-1">
                    <div className="skeleton h-4 rounded w-2/3" />
                    <div className="skeleton h-4 rounded w-1/2" />
                    <div className="skeleton h-9 rounded-full w-44 mt-3" />
                  </div>
                </div>
              )}
              {status === "error" && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex gap-3 items-start">
                  <WarningCircle size={22} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Gagal memproses</p>
                    <p className="text-sm opacity-80 mt-0.5">{error}</p>
                    <button
                      onClick={() => void resolve()}
                      className="btn-pill mt-3 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-semibold inline-flex items-center gap-1.5"
                    >
                      <ArrowClockwise size={15} /> Coba lagi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel kanan: pratinjau cepat atau panduan */}
          <aside className="dark-card min-w-0 p-5 h-fit lg:sticky lg:top-4">
            {!result ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-50">
                  Cara pakai
                </p>
                <ol className="mt-3 space-y-3 text-sm">
                  {[
                    "Salin link dari aplikasi TikTok lewat tombol Bagikan.",
                    "Tempel di kolom kiri. Izin clipboard membuat ini otomatis.",
                    "Tekan Ambil, cek pratinjau, pilih format unduhan.",
                  ].map((s, i) => (
                    <li key={s} className="flex gap-3">
                      <span className="mono-num w-6 h-6 rounded-full bg-lime-500/20 text-lime-700 dark:text-lime-300 grid place-items-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="opacity-80">{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-3 text-xs leading-relaxed opacity-80">
                  Live Photo TikTok pada dasarnya adalah pasangan foto plus klip video pendek.
                  KiraaDown menampilkan keduanya bila penyedia mengembalikannya, jadi tidak ada
                  yang hilang.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                  <span className="tick" /> SUMBER: {result.source.toUpperCase()} : {result.type.toUpperCase()}
                </div>
                <div className="mt-3 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.cover || "/favicon.ico"}
                    alt="Thumbnail konten TikTok"
                    className="w-20 h-28 object-cover rounded-xl border border-black/10 dark:border-white/10"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="font-bold leading-snug line-clamp-2">{result.title}</p>
                    <p className="text-sm opacity-70 mt-1 truncate">
                      {result.author} {result.username ? `(@${result.username})` : ""}
                    </p>
                    <div className="mono-num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-70">
                      <span>Suka {formatCount(result.likes)}</span>
                      <span>Komen {formatCount(result.comments)}</span>
                      <span>Bagikan {formatCount(result.shares)}</span>
                      <span>Durasi {formatDuration(result.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>

        {/* Hasil lengkap */}
        {result && (
          <section className="max-w-6xl mx-auto px-4 pb-10">
            <div className="dark-card p-4 md:p-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Media player */}
              <div className="min-w-0">
                {!isImages && (noWm || wm) ? (
                  <div className="rounded-xl overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      src={noWm || wm}
                      poster={result.cover || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[520px]"
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                    />
                  </div>
                ) : isImages && result.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {result.images.slice(0, 4).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${src}-${i}`}
                        src={src}
                        alt={`Foto ${i + 1} dari slideshow`}
                        className="rounded-xl object-cover aspect-[3/4] w-full border border-black/10 dark:border-white/10"
                        loading="lazy"
                      />
                    ))}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.cover}
                    alt="Thumbnail"
                    className="rounded-xl w-full object-cover max-h-[420px] border border-black/10 dark:border-white/10"
                  />
                )}
                <button
                  onClick={togglePlay}
                  className="btn-pill mt-3 px-4 py-2 border border-black/15 dark:border-white/20 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                  {playing ? "Jeda pratinjau" : "Putar pratinjau"}
                </button>
                {warning && (
                  <p className="mt-3 text-xs leading-relaxed rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                    {warning}
                  </p>
                )}
              </div>

              {/* Opsi unduhan */}
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <CheckCircle size={20} className="text-lime-600" /> Siap diunduh
                </h2>
                <p className="text-sm opacity-70 mt-1 line-clamp-3">{result.title}</p>

                <div className="mt-4 grid gap-2">
                  {!isImages ? (
                    <>
                      <DownloadRow
                        icon={<FilmStrip size={18} />}
                        label="Video tanpa watermark"
                        hint="MP4. Prioritas utama."
                        busy={busyKey === "nowm"}
                        disabled={!noWm}
                        onClick={() =>
                          void downloadFile(noWm, baseFilename("kiraadown-nowm", result.id, "mp4"), "nowm")
                        }
                      />
                      {hdUrl && hdUrl !== noWm && (
                        <DownloadRow
                          icon={<FilmStrip size={18} />}
                          label="Video HD"
                          hint="MP4 resolusi tertinggi bila ada."
                          busy={busyKey === "hd"}
                          onClick={() =>
                            void downloadFile(hdUrl, baseFilename("kiraadown-hd", result.id, "mp4"), "hd")
                          }
                        />
                      )}
                      <DownloadRow
                        icon={<FilmStrip size={18} />}
                        label="Video dengan watermark"
                        hint="MP4 versi watermark resmi."
                        busy={busyKey === "wm"}
                        disabled={!wm}
                        onClick={() =>
                          void downloadFile(wm, baseFilename("kiraadown-wm", result.id, "mp4"), "wm")
                        }
                      />
                      <DownloadRow
                        icon={<MusicNote size={18} />}
                        label="Audio MP3"
                        hint="Suara latar konten."
                        busy={busyKey === "mp3"}
                        disabled={!audio}
                        onClick={() =>
                          void downloadFile(audio, baseFilename("kiraadown-audio", result.id, "mp3"), "mp3")
                        }
                      />
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <ImageIcon size={18} /> {result.images.length} foto slideshow
                        </div>
                        <button
                          onClick={() => void downloadAllImages()}
                          disabled={zipBusy || result.images.length === 0}
                          className="btn-pill px-4 py-2 bg-lime-500 text-lime-950 text-sm font-bold disabled:opacity-60 inline-flex items-center gap-1.5"
                        >
                          <DownloadSimple size={16} weight="bold" />
                          {zipBusy ? "Membuat ZIP" : "Unduh semua ZIP"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {result.images.map((src, i) => (
                          <div key={`${src}-${i}`} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Slideshow foto ${i + 1}`}
                              loading="lazy"
                              className="rounded-xl aspect-[3/4] object-cover w-full border border-black/10 dark:border-white/10"
                            />
                            <button
                              onClick={() =>
                                void downloadFile(
                                  src,
                                  baseFilename("kiraadown-foto", `${result.id}-${i + 1}`, "jpg"),
                                  `img-${i}`,
                                )
                              }
                              className="absolute bottom-2 left-2 right-2 btn-pill py-1.5 text-xs font-bold bg-black/70 text-white backdrop-blur opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                            >
                              {busyKey === `img-${i}` ? "Siap" : `Foto ${i + 1}`}
                            </button>
                          </div>
                        ))}
                      </div>
                      {(noWm || audio) && (
                        <p className="text-xs opacity-70 flex items-center gap-1.5">
                          <Clock size={14} /> Slideshow ini juga punya pasangan
                          {noWm ? " video" : ""}
                          {noWm && audio ? " dan" : ""} {audio ? " audio" : ""}. Unduh di bawah bila perlu.
                        </p>
                      )}
                      {noWm && (
                        <DownloadRow
                          icon={<FilmStrip size={18} />}
                          label="Klip video slideshow"
                          hint="Versi gerak dari slideshow."
                          busy={busyKey === "slide-video"}
                          onClick={() =>
                            void downloadFile(
                              noWm,
                              baseFilename("kiraadown-slideshow", result.id, "mp4"),
                              "slide-video",
                            )
                          }
                        />
                      )}
                      {audio && (
                        <DownloadRow
                          icon={<MusicNote size={18} />}
                          label="Audio MP3"
                          hint="Suara latar slideshow."
                          busy={busyKey === "slide-mp3"}
                          onClick={() =>
                            void downloadFile(
                              audio,
                              baseFilename("kiraadown-audio", result.id, "mp3"),
                              "slide-mp3",
                            )
                          }
                        />
                      )}
                    </>
                  )}
                </div>
                <p className="mt-3 text-[11px] opacity-60 leading-relaxed">
                  File disalurkan lewat proxy KiraaDown agar tombol unduh bekerja di semua browser.
                  KiraaDown tidak menyimpan file di server.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Strip format horizontal, bukan 3 kartu generik */}
        <section className="border-y border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
          <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-[0.9fr_1.1fr] items-start">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">Satu link, semua format.</h2>
              <p className="text-sm opacity-70 mt-2 max-w-[46ch]">
                Geser daftar format. Semua tombol unduh muncul setelah link berhasil dibaca, jadi
                kamu tidak perlu menebak.
              </p>
            </div>
            <div className="no-scrollbar min-w-0 flex gap-2 overflow-x-auto pb-2 snap-x">
              {[
                { t: "MP4 tanpa watermark", d: "Bersih, siap repost dengan izin." },
                { t: "MP4 watermark", d: "Cadangan bila versi bersih gagal." },
                { t: "MP4 HD", d: "Resolusi tertinggi bila tersedia." },
                { t: "Foto satuan", d: "Tiap frame slideshow." },
                { t: "ZIP semua foto", d: "Dibuat di browser, hemat server." },
                { t: "MP3 audio", d: "Suara untuk nada dering atau edit." },
              ].map((f) => (
                <div
                  key={f.t}
                  className="snap-start shrink-0 w-52 dark-card p-4"
                >
                  <p className="font-bold text-sm">{f.t}</p>
                  <p className="text-xs opacity-70 mt-1 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Riwayat + batas: dua kolom asimetris */}
        <section id="riwayat" className="max-w-6xl mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Riwayat perangkat</h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                  className="btn-pill shrink-0 px-3.5 py-1.5 text-xs font-semibold border border-black/15 dark:border-white/20 inline-flex items-center gap-1.5"
                >
                  <Trash size={14} /> Hapus semua
                </button>
              )}
            </div>
            <p className="text-sm opacity-60 mt-1">
              Tersimpan di localStorage browser. Maksimal {30} entri. Tanpa database, tanpa akun.
            </p>
            {history.length === 0 ? (
              <div className="dark-card mt-4 p-6 text-sm opacity-70">
                Belum ada riwayat. Setiap unduhan sukses tercatat di sini dan bisa dibuka ulang
                dengan satu klik.
              </div>
            ) : (
              <ul className="mt-4 grid gap-2">
                {history.map((h) => (
                  <li key={h.key} className="dark-card min-w-0 overflow-hidden p-3 flex gap-3 items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={h.cover || "/favicon.ico"}
                      alt=""
                      className="w-11 h-14 rounded-lg object-cover border border-black/10 dark:border-white/10 shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{h.title}</p>
                      <p className="text-xs opacity-60 truncate">
                        {h.author} : {new Date(h.time).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUrl(h.url);
                        void resolve(h.url);
                      }}
                      className="btn-pill px-3.5 py-1.5 text-xs font-bold bg-neutral-900 text-white dark:bg-lime-400 dark:text-lime-950 shrink-0"
                    >
                      Buka
                    </button>
                    <button
                      aria-label="Hapus entri riwayat"
                      onClick={() => setHistory(removeHistoryItem(h.key))}
                      className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div id="batas" className="dark-card min-w-0 p-5 h-fit">
            <h2 className="text-xl font-bold tracking-tight">Batas paket gratis</h2>
            <p className="text-sm opacity-70 mt-1">Jujur soal limit agar tidak kaget.</p>
            <dl className="mt-4 text-sm divide-y divide-black/10 dark:divide-white/10">
              <LimitRow k="TikWM API" v="1 req/detik, tanpa kunci, tanpa kartu kredit" />
              <LimitRow k="Worker cadangan" v="Instance publik gratis, dipakai bila TikWM sibuk" />
              <LimitRow k="TikTok oEmbed" v="Metadata dasar, nyaris tanpa limit" />
              <LimitRow k="Rate limit app" v="12 resolve per menit per IP" />
              <LimitRow k="Vercel Hobby" v="100 GB bandwidth, fungsi maks 60 dtk" />
              <LimitRow k="Proxy file" v="Maks 120 MB per file, tanpa simpan permanen" />
              <LimitRow k="Riwayat" v="30 entri di localStorage" />
            </dl>
            <p className="mt-3 text-xs opacity-60 leading-relaxed">
              Bila TikWM sedang sibuk, app otomatis menampilkan metadata oEmbed plus tombol coba
              lagi. Fitur tanpa watermark bergantung pada penyedia gratis, jadi tidak dijamin 100
              persen setiap saat.
            </p>
          </div>
        </section>

        {/* Kontak developer: teks kiri, daftar kanal kanan */}
        <section id="kontak" className="max-w-6xl mx-auto px-4 pb-12 grid gap-6 md:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight">Nemu bug atau punya ide?</h2>
            <p className="text-sm opacity-70 mt-2 max-w-[46ch] leading-relaxed">
              KiraaDown dirawat oleh kiraadityaa. Kirim link yang gagal, tangkapan layar, dan
              pesan error bila ada. Makin lengkap laporanmu, makin cepat diperbaiki.
            </p>
            <p className="mono-num mt-3 text-xs opacity-60">
              WhatsApp aktif di jam wajar WIB. Kanal lain dibalas saat sempat.
            </p>
          </div>
          <div className="min-w-0 grid gap-2">
            <ContactRow
              icon={<GithubLogo size={18} />}
              label="GitHub"
              handle="@kiraadityaa"
              hint="Buka issue untuk bug atau usulan fitur."
              href="https://github.com/kiraadityaa"
            />
            <ContactRow
              icon={<WhatsappLogo size={18} />}
              label="WhatsApp"
              handle="+62 815-5336-2795"
              hint="Chat langsung untuk bug mendesak."
              href="https://wa.me/6281553362795?text=Halo%20KiraaDown%2C%20saya%20menemukan%20bug%20di%20aplikasi."
            />
            <ContactRow
              icon={<InstagramLogo size={18} />}
              label="Instagram"
              handle="@aaaditz_"
              hint="DM terbuka untuk saran santai."
              href="https://instagram.com/aaaditz_"
            />
            <ContactRow
              icon={<TiktokLogo size={18} />}
              label="TikTok"
              handle="@kiraadityaa"
              hint="Komentar atau pesan di akun kreator."
              href="https://www.tiktok.com/@kiraadityaa"
            />
          </div>
        </section>

        {/* FAQ: daftar vertikal, bukan kartu */}
        <section id="faq" className="max-w-6xl mx-auto px-4 pb-14">
          <h2 className="text-2xl font-bold tracking-tight">Pertanyaan umum</h2>
          <div className="mt-4 divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
            {[
              {
                q: "Apakah benar gratis total?",
                a: "Ya. Hosting Vercel Hobby, framework Next.js, API TikWM gratis, oEmbed resmi, dan localStorage. Tidak ada database, storage, domain, atau API berbayar.",
              },
              {
                q: "Apakah perlu API key atau kartu kredit?",
                a: "Tidak. Semua provider yang dipakai tidak meminta kunci maupun kartu. Bila suatu saat TikWM meminta kunci, app tetap menampilkan metadata oEmbed.",
              },
              {
                q: "Bagaimana dengan Live Photo?",
                a: "Live Photo TikTok adalah foto plus klip gerak. Bila penyedia mengembalikan keduanya, KiraaDown menampilkan tombol unduh untuk tiap bagiannya.",
              },
              {
                q: "Apakah file saya disimpan?",
                a: "Tidak. Proxy hanya meneruskan byte dari CDN ke browser kamu lalu dilupakan. Riwayat hanya ada di browser kamu.",
              },
              {
                q: "Bolehkah mengunduh konten orang lain?",
                a: "Unduh untuk arsip pribadi atau konten milikmu sendiri. Hormati hak cipta dan ketentuan TikTok sebelum membagikan ulang.",
              },
            ].map((f) => (
              <details key={f.q} className="py-4 group">
                <summary className="font-semibold cursor-pointer list-none flex justify-between gap-4">
                  {f.q}
                  <span className="opacity-40 group-open:rotate-45 transition text-lg leading-none">+</span>
                </summary>
                <p className="text-sm opacity-70 mt-2 max-w-[70ch] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-xs opacity-70">
          <p className="font-mono">KiraaDown : Rp0 / $0 : Vercel Hobby : .vercel.app</p>
          <p>Gunakan dengan bijak. Hormati kreator dan hak cipta.</p>
        </div>
      </footer>
    </div>
  );
}

function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showMs = reduce ? 60 : 1250;
    const fadeMs = reduce ? 0 : 350;
    document.body.style.overflow = "hidden";
    const t1 = setTimeout(() => setLeaving(true), showMs);
    const t2 = setTimeout(() => {
      document.body.style.overflow = "";
      doneRef.current();
    }, showMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = "";
    };
    // Sengaja sekali jalan: splash hanya muncul saat aplikasi dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-label="Memuat KiraaDown"
      className={`fixed inset-0 z-[70] grid place-items-center bg-[#f2f0e8] dark:bg-[#0d0f0c] ${leaving ? "splash-leave" : ""}`}
      style={{ colorScheme: "light dark" }}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <span className="splash-pop w-14 h-14 rounded-[16px] bg-lime-500 grid place-items-center font-mono font-bold text-2xl text-lime-950">
          K
        </span>
        <p className="splash-rise splash-rise-1 mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          KiraaDown
        </p>
        <p className="splash-rise splash-rise-2 mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          Menyiapkan unduhan
        </p>
        <div
          aria-hidden="true"
          className="mt-5 h-1 w-44 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
        >
          <div className="splash-bar h-full w-full rounded-full bg-lime-500" />
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  handle,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  handle: string;
  hint: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full rounded-xl border border-black/10 dark:border-white/10 p-3 flex items-center gap-3 hover:border-lime-600/60 transition"
    >
      <span className="w-9 h-9 rounded-full bg-lime-500/15 text-lime-700 dark:text-lime-300 grid place-items-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">
          {label} <span className="mono-num font-medium opacity-60">{handle}</span>
        </span>
        <span className="block text-xs opacity-60">{hint}</span>
      </span>
      <span className="btn-pill px-3.5 py-1.5 text-xs font-bold bg-neutral-900 text-white dark:bg-lime-400 dark:text-lime-950 shrink-0">
        Hubungi
      </span>
    </a>
  );
}

function LimitRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="py-2.5 grid grid-cols-[130px_1fr] gap-3">
      <dt className="font-mono text-xs uppercase tracking-wide opacity-60 pt-0.5">{k}</dt>
      <dd className="min-w-0 break-words text-[13px] leading-relaxed">{v}</dd>
    </div>
  );
}

function DownloadRow({
  icon,
  label,
  hint,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full text-left rounded-xl border border-black/10 dark:border-white/10 p-3 flex items-center gap-3 hover:border-lime-600/60 disabled:opacity-45 transition"
    >
      <span className="w-9 h-9 rounded-full bg-lime-500/15 text-lime-700 dark:text-lime-300 grid place-items-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs opacity-60">{hint}</span>
      </span>
      <span className="btn-pill px-3.5 py-1.5 text-xs font-bold bg-neutral-900 text-white dark:bg-lime-400 dark:text-lime-950 shrink-0 inline-flex items-center gap-1">
        <DownloadSimple size={14} weight="bold" /> {busy ? "Siap" : "Unduh"}
      </span>
    </button>
  );
}
