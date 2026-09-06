# KiraaDown

Downloader TikTok gratis: video tanpa watermark, video watermark, HD, slideshow foto (satuan dan ZIP), dan audio MP3. Pratinjau sebelum unduh, riwayat di perangkat, tanpa akun, tanpa database, tanpa biaya.

Prinsip: **ZERO BUDGET Rp0**. Tidak ada layanan berbayar, tidak ada kartu kredit, tidak ada domain beli. Deploy di Vercel Hobby dengan domain `.vercel.app`.

## Arsitektur gratis

| Kebutuhan | Solusi | Biaya | Limit gratis |
|---|---|---|---|
| Hosting | Vercel Hobby | Rp0, tanpa kartu kredit | 100 GB bandwidth/bulan, function 10 dtk (hobby) sd 60 dtk, 100 ribu eksekusi |
| Framework | Next.js 16 + TypeScript + Tailwind v4 | open source | tidak ada |
| API unduhan utama | TikWM `https://www.tikwm.com/api/?url=` | Rp0, tanpa kunci | 1 request/detik per IP publik |
| API cadangan | Worker publik `tdownv4.sl-bjs.workers.dev/?down=` (open source, Cloudflare Workers) | Rp0, tanpa kunci | instansi publik, bisa berubah, dipakai hanya bila utama gagal |
| Metadata cadangan resmi | TikTok oEmbed `https://www.tiktok.com/oembed` | Rp0, tanpa kunci | nyaris tanpa limit untuk pemakaian wajar |
| Database riwayat | localStorage browser (`kiraadown_history_v1`, 30 entri) | Rp0 | 5-10 MB per browser |
| ZIP semua foto | JSZip di browser (client-side) | Rp0 | tergantung RAM perangkat |
| Ikon | Phosphor Icons | open source | tidak ada |

Tidak ada API key yang diekspos ke browser. Semua panggilan upstream (TikWM, worker cadangan, oEmbed) dilakukan dari Route Handler server (`/api/resolve`) dengan rantai fallback otomatis.

### Keterbatasan jujur

- Tanpa watermark bergantung pada TikWM. Bila TikWM sibuk atau memblokir, app menampilkan metadata oEmbed plus tombol coba lagi. Tidak ada jalan gratis dan legal yang 100 persen selalu berhasil.
- Live Photo TikTok adalah pasangan foto plus klip gerak. Bila penyedia mengembalikan keduanya, keduanya bisa diunduh. Tidak ada file `.livephoto` tunggal.
- Rate limit in-memory bersifat per instance serverless, jadi ini proteksi lapis pertama, bukan penghitung global.
- Proxy file dibatasi 120 MB dan host allowlist ketat untuk cegah SSRF.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local   # opsional, semua variabel punya default
npm run dev                  # http://localhost:3000
```

Perintah wajib lulus:

```bash
npm install
npm run build
npm run start
```

Cek lain:

```bash
npx tsc --noEmit
npm run lint
```

## Deploy ke Vercel (gratis)

1. Push repo ke GitHub.
2. Buka vercel.com, login, pilih New Project, import repo. Tanpa kartu kredit.
3. Framework terdeteksi Next.js. Biarkan build command `npm run build`.
4. Environment variable opsional: `TIKWM_API_BASE`, `RATE_LIMIT_PER_MIN`. Bisa dikosongkan.
5. Deploy. Domain otomatis `kiraadown.vercel.app` atau sejenisnya. Jangan beli domain.

## Endpoint

- `POST /api/resolve` body `{ "url": string, "hd"?: boolean }` -> `{ data, warning? }`
- `GET /api/resolve` -> info pemakaian dan limit
- `GET /api/proxy?url=<https>&filename=<nama>` -> stream file sebagai attachment
- `GET /api/health` -> status dan daftar provider

## Struktur

```
app/
  page.tsx            # UI utama (client)
  layout.tsx          # metadata + font
  globals.css         # design tokens
  icon.svg
  api/
    resolve/route.ts  # validasi, rate limit, TikWM + fallback oEmbed
    proxy/route.ts    # proxy unduhan aman (allowlist host)
    health/route.ts   # status
lib/
  tiktok.ts           # validasi URL TikTok
  rate-limit.ts       # rate limit in-memory + antrean 1 req/detik
  client.ts           # riwayat localStorage, helper unduhan
```

## Kontak developer

Lapor bug atau usulkan fitur ke kiraadityaa: GitHub [@kiraadityaa](https://github.com/kiraadityaa), TikTok [@kiraadityaa](https://www.tiktok.com/@kiraadityaa), WhatsApp [+62 815-5336-2795](https://wa.me/6281553362795), Instagram [@aaaditz_](https://instagram.com/aaaditz_).

## Troubleshooting

- `Terlalu banyak permintaan`: tunggu sesuai detik di respons `Retry-After`. Limit default 12 resolve per menit per IP.
- `Konten tidak ditemukan di TikWM`: link privat, dihapus, atau region dibatasi. Coba link publik lain.
- Tombol unduh 502/504: CDN TikTok lambat. Coba lagi, lalu coba format lain (watermark vs tanpa watermark).
- Tombol unduh membuka tab baru: file di atas 120 MB (misal 4K 120fps) tidak bisa lewat proxy serverless, jadi dibuka langsung dari CDN. Simpan lewat menu titik tiga pada pemutar video.
- Clipboard tidak terbaca: browser memblokir izin. Klik Tempel sekali lagi atau gunakan Ctrl+V manual. Perlu HTTPS atau localhost.
- Build gagal di Windows karena nama package kapital: nama package sudah `kiraadown` lowercase.
- Video tidak bisa preview: gunakan tombol unduh langsung, file tetap bisa diunduh via proxy.

## Keamanan

- Validasi URL di klien dan server. Hanya host TikTok yang diterima di resolve.
- Proxy hanya mengizinkan host CDN TikTok dan TikWM, hanya skema https, maks 120 MB, timeout 25 detik.
- Header keamanan: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- Tidak menyimpan konten pengguna di server. Tidak ada secret di browser.
