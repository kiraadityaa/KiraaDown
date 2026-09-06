import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Ganti dengan domain produksi (.vercel.app) lewat env NEXT_PUBLIC_SITE_URL
// agar URL gambar pratinjau tautan menjadi absolut. Lihat .env.example.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://kiraa-down.vercel.app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0c" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "KiraaDown - Unduh Video, Foto, dan MP3 TikTok Gratis",
  description:
    "KiraaDown: tempel link TikTok, pratinjau, lalu unduh video tanpa watermark, slideshow foto, dan audio MP3. Gratis, tanpa daftar, riwayat tersimpan di perangkat.",
  keywords: ["tiktok downloader", "unduh video tiktok", "tiktok mp3", "tiktok slideshow", "kiraadown"],
  openGraph: {
    title: "KiraaDown - Downloader TikTok Gratis",
    description: "Video tanpa watermark, foto slideshow, dan MP3. Tempel link lalu unduh. Rp0, tanpa daftar.",
    url: "/",
    siteName: "KiraaDown",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KiraaDown: unduh video tanpa watermark, foto, dan MP3 TikTok gratis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KiraaDown - Downloader TikTok Gratis",
    description: "Video tanpa watermark, foto slideshow, dan MP3. Tempel link lalu unduh. Rp0, tanpa daftar.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

// Skrip blokir sebelum paint: terapkan tema tersimpan, default gelap.
// Harus identik logikanya dengan app/components/ThemeToggle.tsx.
const themeScript = `(function(){try{var t=localStorage.getItem("kiraadown-theme");document.documentElement.classList.toggle("dark",t?t==="dark":true);}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
