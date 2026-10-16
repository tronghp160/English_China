import { z } from "zod";

/**
 * Environment validation (docs/PLAN.md §13).
 * Public vars are inlined at build time, so they must be referenced literally.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL phải là URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Thiếu SUPABASE_SERVICE_ROLE_KEY"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-haiku-5-5"),
  AI_VISION_MODEL: z.string().default("claude-sonnet-5-5"),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(100),
  AI_GLOBAL_DAILY_LIMIT: z.coerce.number().int().positive().default(3000),
  PEXELS_API_KEY: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
});

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

let cachedPublic: z.infer<typeof publicSchema> | undefined;
export function publicEnv() {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Biến môi trường không hợp lệ (xem .env.example):\n${formatIssues(parsed.error)}`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

let cachedServer: z.infer<typeof serverSchema> | undefined;
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() chỉ được gọi phía server");
  }
  if (cachedServer) return cachedServer;
  const raw = Object.fromEntries(
    Object.keys(serverSchema.shape).map((k) => [k, process.env[k] || undefined]),
  );
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Biến môi trường không hợp lệ (xem .env.example):\n${formatIssues(parsed.error)}`,
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}

export function requireAnthropicKey() {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) throw new Error("Thiếu ANTHROPIC_API_KEY — tính năng Gợi ý (AI) đang tắt.");
  return key;
}
