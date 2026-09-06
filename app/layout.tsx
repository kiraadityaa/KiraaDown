import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KiraaDown - Unduh Video, Foto, dan MP3 TikTok Gratis",
  description:
    "KiraaDown: tempel link TikTok, pratinjau, lalu unduh video tanpa watermark, slideshow foto, dan audio MP3. Gratis, tanpa daftar, riwayat tersimpan di perangkat.",
  keywords: ["tiktok downloader", "unduh video tiktok", "tiktok mp3", "tiktok slideshow", "kiraadown"],
  openGraph: {
    title: "KiraaDown - Downloader TikTok Gratis",
    description: "Video tanpa watermark, foto slideshow, dan MP3. Tempel link lalu unduh.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
