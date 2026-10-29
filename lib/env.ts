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
  /** Free tier option for word suggestions (Google AI Studio key). */
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  /** Comma-separated: main model first, then fallbacks (Gemini's free tier limits each model separately). */
  AI_MODEL_GOOGLE: z.string().default("gemini-3.8-flash"),
  /** Optional model for the AI tutor chat, so it does not use the word-suggestion quota. */
  AI_MODEL_CHAT_GOOGLE: z.string().optional(),
  /** Requests per minute the app lets through to the AI provider (stay under the free-tier limit). */
  AI_RPM_LIMIT: z.coerce.number().int().positive().default(10),
  /** Which provider word suggestions use when both keys are set (default: anthropic). */
  AI_PROVIDER: z.enum(["anthropic", "google"]).optional(),
  AI_VISION_MODEL: z.string().default("claude-sonnet-5-5"),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(300),
  AI_GLOBAL_DAILY_LIMIT: z.coerce.number().int().positive().default(3000),
  /** Sign-ups (and pending-account confirms) per client IP per hour. */
  SIGNUP_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(8),
  /** Web Push reminders (npx web-push generate-vapid-keys); off when the keys are missing. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:sotu@example.com"),
  /** Bearer token Vercel Cron sends to /api/cron/reminders. */
  CRON_SECRET: z.string().optional(),
  /** Comma-separated emails that are always admins of /admin (more can be granted there or with pnpm admin:grant). */
  ADMIN_EMAILS: z.string().optional(),
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

export type AiProvider = { provider: "anthropic" | "google"; apiKey: string; model: string; fallbacks: string[] };

/** "main, fallback" → ["main", "fallback"]. */
export function modelList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Provider for word suggestions: the one named in AI_PROVIDER, else whichever key is set. */
export function aiProvider(): AiProvider | null {
  const env = serverEnv();
  const anthropic = env.ANTHROPIC_API_KEY
    ? { provider: "anthropic" as const, apiKey: env.ANTHROPIC_API_KEY, model: env.AI_MODEL, fallbacks: [] }
    : null;
  const [main = "gemini-3.8-flash", ...fallbacks] = modelList(env.AI_MODEL_GOOGLE);
  const google = env.GOOGLE_GENERATIVE_AI_API_KEY
    ? { provider: "google" as const, apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY, model: main, fallbacks }
    : null;
  if (env.AI_PROVIDER === "google") return google ?? anthropic;
  return anthropic ?? google;
}

export function requireAnthropicKey() {
  const key = serverEnv().ANTHROPIC_API_KEY;
  if (!key) throw new Error("Thiếu ANTHROPIC_API_KEY — tính năng Gợi ý (AI) đang tắt.");
  return key;
}
