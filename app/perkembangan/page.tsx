import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Perkembangan KiraaDown - Changelog",
  description:
    "Catatan pembaruan KiraaDown: fitur baru, perbaikan bug, dan rencana berikutnya.",
};

interface Release {
  version: string;
  date: string;
  title: string;
  items: string[];
}

const RELEASES: Release[] = [
  {
    version: "v1.6.0",
    date: "6 Sep 2026",
    title: "Toggle tema manual",
    items: [
      "Tombol tema terang dan gelap di header, dengan tema gelap sebagai default aplikasi.",
      "Pilihan tersimpan di browser dan diterapkan sebelum paint agar tidak berkedip.",
      "Ikon matahari dan bulan bertransisi crossfade mengikuti gaya menu mobile.",
    ],
  },
  {
    version: "v1.5.0",
    date: "6 Sep 2026",
    title: "Pratinjau tautan yang keren",
    items: [
      "Gambar Open Graph 1200x630 bergaya merek untuk WhatsApp, Telegram, X, dan lainnya.",
      "Metadata Twitter summary large image, theme color terang dan gelap, plus metadataBase lewat env.",
    ],
  },
  {
    version: "v1.4.0",
    date: "6 Sep 2026",
    title: "Halaman perkembangan",
    items: [
      "Halaman changelog ini agar pengguna bisa melihat apa yang berubah di tiap pembaruan.",
      "Tautan Update ditambahkan ke navigasi desktop dan menu mobile.",
    ],
  },
  {
    version: "v1.3.2",
    date: "6 Sep 2026",
    title: "Animasi menu mobile",
    items: [
      "Panel menu meluncur turun dengan fade plus efek stagger per link.",
      "Ikon hamburger bertransisi menjadi X secara crossfade.",
      "Panel tertutup tidak bisa difokuskan keyboard dan animasi nonaktif saat prefers-reduced-motion.",
    ],
  },
  {
    version: "v1.3.1",
    date: "6 Sep 2026",
    title: "Transparansi kualitas",
    items: [
      "Label resolusi terkirim di bawah pratinjau video, dibaca dari metadata yang benar-benar diterima browser.",
      "FAQ baru yang jujur soal batas kualitas dari penyedia gratis.",
      "Catatan kualitas di README: tanpa encode ulang, tapi varian tertinggi ditentukan penyedia.",
    ],
  },
  {
    version: "v1.3.0",
    date: "6 Sep 2026",
    title: "Unduhan file besar",
    items: [
      "Endpoint proxy mendapat method HEAD untuk preflight ukuran file.",
      "Video raksasa seperti 4K 120fps di atas 120 MB otomatis dibuka langsung dari CDN di tab baru plus pesan penjelasan.",
      "Respons 413 diperkaya info ukuran agar bisa ditangani klien.",
    ],
  },
  {
    version: "v1.2.1",
    date: "6 Sep 2026",
    title: "Perbaikan hydration React #418",
    items: [
      "Riwayat localStorage dibaca setelah mount agar HTML server dan klien identik.",
      "Error minified React di console production hilang.",
    ],
  },
  {
    version: "v1.2.0",
    date: "6 Sep 2026",
    title: "Kontak developer",
    items: [
      "Bagian kontak: GitHub, WhatsApp dengan pesan terisi otomatis, Instagram, dan TikTok.",
      "Tautan Kontak di navigasi dan catatan kontak di README.",
    ],
  },
  {
    version: "v1.1.1",
    date: "6 Sep 2026",
    title: "Perbaikan overflow mobile",
    items: [
      "Kartu riwayat tidak lagi meluber di layar HP berkat min-w-0 di anak grid dan overflow hidden.",
      "Jaring pengaman overflow-x clip di level halaman.",
    ],
  },
  {
    version: "v1.1.0",
    date: "6 Sep 2026",
    title: "Identitas dan header",
    items: [
      "Splash loading saat aplikasi dibuka dengan progress bar dan dukungan reduced motion.",
      "Scrollbar visual disembunyikan tanpa mematikan fungsi scroll.",
      "Header sticky dengan blur, badge status API live, nav pil tersegmentasi, tombol Mulai, dan menu hamburger di mobile.",
    ],
  },
  {
    version: "v1.0.0",
    date: "6 Sep 2026",
    title: "Rilis awal",
    items: [
      "Unduh video tanpa watermark, watermark, HD, slideshow foto satuan dan ZIP, serta audio MP3.",
      "Pratinjau media, metadata kreator, validasi URL, paste otomatis clipboard, dan riwayat localStorage.",
      "Rantai resolve TikWM, worker cadangan, dan oEmbed resmi. Rate limit, proxy aman, dan siap deploy Vercel Hobby Rp0.",
    ],
  },
];

const ROADMAP = [
  "Provider cadangan tambahan agar ketahanan resolve makin tinggi.",
  "Ekspor dan impor riwayat sebagai file JSON.",
  "Dukungan PWA agar bisa dipasang ke layar utama HP.",
];

export default function Perkembangan() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#f2f0e8]/90 dark:bg-[#0d0f0c]/90 border-b border-black/10 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 min-h-16 py-2 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0"
            aria-label="KiraaDown ke beranda"
          >
            <span className="w-9 h-9 rounded-[12px] bg-lime-500 grid place-items-center font-mono font-bold text-lg text-lime-950 -rotate-3 shrink-0">
              K
            </span>
            <span className="font-bold tracking-tight truncate">KiraaDown</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="btn-pill px-4 py-2 bg-lime-500 hover:bg-lime-400 text-lime-950 text-sm font-bold whitespace-nowrap"
            >
              Beranda
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 pt-10 md:pt-14 pb-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-lime-700 dark:text-lime-300">
            Changelog
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tighter leading-[1.02]">
            Perkembangan aplikasi.
          </h1>
          <p className="mt-4 text-base opacity-70 leading-relaxed max-w-[56ch]">
            Semua yang berubah di KiraaDown tercatat di sini, dari fitur besar sampai
            perbaikan kecil. Prinsipnya tetap: gratis total, tanpa kartu kredit.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-10">
          <ol className="relative border-l border-black/15 dark:border-white/15 ml-2 space-y-8">
            {RELEASES.map((r) => (
              <li key={r.version} className="pl-6 relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full bg-lime-500 border-2 border-[#f2f0e8] dark:border-[#0d0f0c]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono-num text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-900 text-white dark:bg-lime-400 dark:text-lime-950">
                    {r.version}
                  </span>
                  <span className="mono-num text-xs opacity-60">{r.date}</span>
                </div>
                <h2 className="mt-2 text-lg font-bold tracking-tight">{r.title}</h2>
                <ul className="mt-2 space-y-1.5 text-sm opacity-80 leading-relaxed list-disc pl-5">
                  {r.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-black/10 dark:border-white/10">
          <div className="max-w-3xl mx-auto px-4 py-10">
            <h2 className="text-2xl font-bold tracking-tight">Rencana berikutnya</h2>
            <p className="text-sm opacity-60 mt-1">
              Arah pengembangan, tanpa janji tanggal. Urutan bisa berubah mengikuti laporan bug.
            </p>
            <ul className="mt-4 grid gap-2">
              {ROADMAP.map((item, i) => (
                <li key={item} className="dark-card p-4 flex gap-3 items-start">
                  <span className="mono-num w-6 h-6 rounded-full bg-lime-500/20 text-lime-700 dark:text-lime-300 grid place-items-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between text-xs opacity-70">
          <p className="font-mono">KiraaDown : Rp0 / $0 : Vercel Hobby</p>
          <Link href="/" className="underline underline-offset-2">
            Kembali ke beranda
          </Link>
        </div>
      </footer>
    </div>
  );
}
