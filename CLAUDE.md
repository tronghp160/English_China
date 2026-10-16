@AGENTS.md

# Sổ Từ — vocabulary notebook (English / Chinese)

Full product spec and phased plan: [docs/PLAN.md](docs/PLAN.md). Work phase by phase (§14); commit after each phase.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript strict, React 19. **`cacheComponents` is disabled on purpose** (almost every route reads the Supabase session cookie). `middleware` is now `proxy.ts` in Next 16.
- Tailwind CSS v4 (CSS-first config in `app/globals.css`) + shadcn/ui (`radix-nova`, components in `components/ui`, `cn` from `@/lib/utils`).
- Supabase (Postgres + Auth + Storage + RLS) via `@supabase/ssr`. Dev uses a **Supabase Cloud** project (no Docker on the dev machine); migrations in `supabase/migrations`, applied with `pnpm db:push`.
- AI: Vercel AI SDK (`ai` v7) + `@ai-sdk/anthropic`, zod schemas. Model from env `AI_MODEL`.
- SRS: `ts-fsrs`. Chinese: `pinyin-pro`, `hanzi-writer`, `opencc-js`.
- Tests: vitest (`tests/unit`), Playwright (`tests/e2e`).

## Commands
- `pnpm dev` (port 3000 may be taken on this machine → `pnpm dev --port 3100`)
- `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` (builds and serves prod on :3200 next to `pnpm dev`; uses the Supabase project in `.env.local`, creates/deletes its own users; AI and image search are mocked in the browser unless `E2E_REAL_AI=1`)
- `node scripts/gen-icons.mjs` regenerates the PWA icons and favicon
- `pnpm db:push [--dry-run]` (apply migrations to the Cloud project in `SUPABASE_DB_URL`, no `supabase link`) · `pnpm db:types:local` (regenerate `lib/supabase/database.types.ts` from the migrations via PGlite; matches the live schema)
- UI screenshots at 390px and 1280px: `MSYS_NO_PATHCONV=1 BASE_URL=http://localhost:3100 node scripts/screenshot.mjs /path name [--dark]`

## Conventions
- UI text in Vietnamese; code, identifiers and comments in English.
- Mobile-first. Touch targets ≥ 44px, icon buttons need `aria-label`.
- Design system "trang vở" (PLAN §12): use palette tokens (`bg-paper`, `bg-surface`, `text-ink`, `text-ink-soft`, `text-ink-blue`, `bg-margin-red`, `text-danger`, `bg-highlight`, `text-jade-text`, `border-rule`, `bg-wash-*`, `text-tone-1..5`), never raw hex in components. Helpers: `.notebook-card` (red margin line), `.ruled-word`, `.ruled-list`, `.highlighter`. Fonts: `font-sans` (Be Vietnam Pro), `font-hanzi` / `font-hanzi-sans`, `font-ipa`. Radius: button 10px, card 12px, sheet 20px. No uppercase labels, no decorative animations beyond card flip + highlighter sweep.
- Secrets only via env (`lib/env.ts` validates). Third-party APIs (AI, images) are called server-side only; `service_role` only in `server-only` modules.
- Language-specific behavior goes through `lib/lang/registry.ts`, not scattered `if (lang === "zh")`.
- Validate every Server Action / route input with zod.

## Layout
- `app/(marketing)`, `app/(auth)`, `app/(app)` route groups; API routes in `app/api`.
- `lib/supabase` (clients), `lib/ai`, `lib/images`, `lib/srs`, `lib/lang`, `lib/actions` (server actions).
- `components/{ui,word,review,practice,zh,deck,group,stats}`.

## Deviations from the plan (keep this list updated)
- Light-mode text colors darkened for WCAG AA: `--danger #C4373D`, `--jade-text #137A5D`, tones 1–3 (see `app/globals.css`).
- `words.created_by` is nullable (plan had `not null` + `on delete set null`, which conflict).
- `review_mode` enum also contains `cloze` (the plan lists cloze as a practice mode).
- AI enrichment uses `effort: "low"` instead of temperature 0.2–0.3 (current Haiku rejects non-default sampling params); see `lib/ai/enrich.ts`.
- Reviews carry a client-generated `client_id` (unique per user) so the offline outbox (`lib/srs/outbox.ts`) can resend safely; the server recomputes FSRS from the stored card and skips stale (older-than-last-review) results.
- Practice answers also count in `daily_stats.reviews` (streak/goal); XP is +1 only when correct. Review/practice pages live in the `app/(study)` route group (full-screen, no nav).
- `frontend-design` skill is not installed here; §12 is followed manually and verified with screenshots.
- Groups (migration 000007): deleting a group or leaving it turns the affected group decks back into private decks of their owners (the decks check constraint would otherwise fail); groups cap at 100 members. Activity feed streaks are computed in TS from group mates' `daily_stats`; the group owner toggles "thành viên được sửa" per deck they own in group settings.
- Language flags are SVGs (`components/lang-flag.tsx`, `public/flags/*.svg`), not emoji: Windows has no flag glyphs (showed "GB"/"CN"). `<option>` labels carry no flag. Flag emoji inside user content still render on Windows through a flag-only webfont (`public/fonts/TwemojiCountryFlags.woff2`, Twemoji CC-BY 4.0) first in `--font-sans`, limited by `unicode-range`.
- Fonts (Lighthouse): the Chinese webfonts are variable and only loaded by the `(app)`, `(study)` and `(public)` layouts (`lib/fonts.ts`); `globals.css` names them by family so portals get them too. The landing page uses a 2-glyph subset for its 坚强 sample (`public/fonts/hero-hanzi.woff2`), and IPA uses an ~11 KB Noto Sans subset (`public/fonts/ipa.woff2`) instead of next/font Noto Sans (~200 KB). Logo letter and avatar initials are CSS `content` so they don't clash with link/button labels (WCAG 2.5.3).
- Phase 6: photo import already shipped in Phase 3. PWA = `app/manifest.ts` + `public/sw.js` (cache-first static assets, network-first pages with `/offline` fallback; pages are never cached so data can't leak between accounts on one device; registered only in production). Account export is `/api/export?format=json|csv`; account deletion removes the user's Storage files, then the auth user (everything else cascades). A valid JWT whose account is gone goes through `/auth/signout` (clears cookies only if the auth server confirms the user is gone) instead of looping between `/today` and `/login`. Server TTS and Web Push (optional) are not built.
- Auth also has email + password (`/signup`, `/forgot-password`, `/reset-password`, "Mật khẩu" in Settings) next to Google and the email link. Auth calls run in the browser (`components/auth/auth-shared.tsx`) because Supabase rate-limits per IP; Supabase errors map to Vietnamese in `authErrorMessage`. Sign-up handles both "Confirm email" on (shows "check your email") and off (signed in at once).
- Service worker: no navigation preload. It re-requested every navigation, so `/auth/callback` ran twice and the second run failed on the used one-time token (sw.js v2 disables it on installed v1 workers).
