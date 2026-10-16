import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireAnthropicKey, serverEnv } from "@/lib/env";
import type { LangCode } from "@/lib/lang/types";
import { AiError } from "./enrich";

const OcrResult = z.object({
  lines: z.array(z.string()),
});

/**
 * Read a photographed notebook page into import lines (§7.7, Phase 6).
 * Output uses the same "term - meaning" format the import parser understands.
 */
export async function readNotebookPhoto(image: Uint8Array, mediaType: string, language: LangCode): Promise<string[]> {
  const anthropic = createAnthropic({ apiKey: requireAnthropicKey() });
  const target = language === "zh" ? "tiếng Trung (chữ Hán, có thể kèm pinyin)" : "tiếng Anh";
  try {
    const res = await generateText({
      model: anthropic(serverEnv().AI_VISION_MODEL),
      maxOutputTokens: 4000,
      timeout: 45_000,
      maxRetries: 1,
      output: Output.object({ schema: OcrResult }),
      providerOptions: { anthropic: { effort: "low" } },
      messages: [
        {
          role: "user",
          content: [
            { type: "file", mediaType, data: image },
            {
              type: "text",
              text: `Đây là ảnh chụp trang vở ghi từ vựng ${target} của người Việt (thường viết tay).
Hãy đọc từng từ vựng và trả về mỗi từ một dòng theo dạng "từ - nghĩa tiếng Việt" (nếu có nghĩa) hoặc chỉ "từ".
${language === "zh" ? 'Nếu có pinyin, viết "chữ Hán pinyin - nghĩa". ' : ""}Bỏ qua tiêu đề, ngày tháng, số trang, gạch xóa và chữ không đọc được. Không tự thêm từ không có trong ảnh. Giữ nguyên chính tả tiếng Việt.`,
            },
          ],
        },
      ],
    });
    console.info(`[ai] ocr input=${res.usage.inputTokens ?? "?"} output=${res.usage.outputTokens ?? "?"}`);
    return res.output.lines.map((l) => l.trim()).filter(Boolean).slice(0, 150);
  } catch (e) {
    console.error("[ai] ocr failed", e);
    throw new AiError("failed", "Không đọc được ảnh. Thử chụp rõ hơn, đủ sáng và thẳng trang.");
  }
}
