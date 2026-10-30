import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * High-reliability TTS endpoint.
 * Provides real native MP3 audio streams for English and Chinese, ensuring 100%
 * compatibility on mobile browsers (iOS Safari, Android Chrome) where the Web Speech
 * API is frequently broken, silent, or lacks voice packs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const lang = (searchParams.get("lang") ?? "en").toLowerCase();

  if (!text) {
    return new NextResponse("Missing text parameter", { status: 400 });
  }

  // Cap length to avoid abuse
  const cleanText = text.slice(0, 300);

  // 1. For English:
  // If short term (<= 3 words), use Youdao Type 2 (Standard US native dictionary audio)
  // Fall back to Google Translate TTS
  if (lang === "en") {
    const isShort = cleanText.split(/\s+/).length <= 4 && !/[.!?]/.test(cleanText);
    if (isShort) {
      try {
        const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
        const res = await fetch(youdaoUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 86400 * 30 },
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("audio") || contentType.includes("mpeg")) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 100) {
              return new NextResponse(buf, {
                status: 200,
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Cache-Control": "public, max-age=31536000, immutable",
                },
              });
            }
          }
        }
      } catch {
        // Fall back to Google Translate TTS below
      }
    }

    // Google Translate TTS for English
    try {
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(googleUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new NextResponse(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (err) {
      console.error("[api/tts] English error:", err);
    }
  }

  // 2. For Chinese (or fallback):
  try {
    const googleZhUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(googleZhUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (err) {
    console.error("[api/tts] Chinese error:", err);
  }

  return new NextResponse("TTS generation failed", { status: 502 });
}
