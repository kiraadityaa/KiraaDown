import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "KiraaDown",
    time: new Date().toISOString(),
    providers: {
      tikwm: "https://www.tikwm.com/api/ (gratis, tanpa kunci, limit 1 req/detik)",
      worker: "Cloudflare Workers publik tdownv4 (gratis, tanpa kunci, cadangan)",
      oembed: "https://www.tiktok.com/oembed (resmi, gratis, metadata dasar)",
    },
  });
}
