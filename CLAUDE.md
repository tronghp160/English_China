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
- `pnpm db:seed` recreates the demo accounts (`demo@example.com`, `minh@example.com`, `lan@example.com`, password `sotu1234`) with sample decks, cards due today, a streak, a group and a public deck. Sample decks live in `lib/sample-data.ts` (also used by the in-app "Thêm bộ từ mẫu" button, `lib/actions/sample.ts`)
- `pnpm db:push [--dry-run]` (apply migrations to the Cloud project in `SUPABASE_DB_URL`, no `supabase link`) · `pnpm db:types:local` (regenerate `lib/supabase/database.types.ts` from the migrations via PGlite; matches the live schema)
- UI screenshots at 390px and 1280px: `MSYS_NO_PATHCONV=1 BASE_URL=http://localhost:3100 node scripts/screenshot.mjs /path name [--dark]`

## Conventions
- UI text in Vietnamese; code, identifiers and comments in English.
- Mobile-first. Touch targets ≥ 44px, icon buttons need `aria-label`.
- Design system "Vở màu" (a livelier take on PLAN §12, tokens in `app/globals.css`): use palette tokens (`bg-paper`, `bg-surface`, `text-ink`, `text-ink-soft`, `text-ink-blue` = primary violet, `text-brand` for violet text on white buttons inside `.hero-gradient`, `bg-margin-red`, `text-danger`, `bg-highlight`, `text-jade-text`, candy accents `sun` / `sky` / `grape` / `pink` with `text-*-text` and `bg-wash-*`, `border-rule`, `text-tone-1..5`), never raw hex in components. Helpers: `.notebook-card` (white card + soft shadow), `.btn-3d` (chunky press; set `[--edge-color:...]`), `.icon-tile`, `.hero-gradient`, `.brand-tile`, `.ruled-word`, `.ruled-list`, `.highlighter`; `shadow-card` / `shadow-pop`; `animate-pop-in` / `animate-float` / `animate-wiggle`; `<Confetti>`, `<ProgressRing>`, `<DeckCover>` + `deckTone(id)` (`lib/deck-colors.ts`). Fonts: `font-sans` (Be Vietnam Pro), `font-heading` (Nunito 800/900, applied to h1–h3 by default, so don't add `font-bold` to headings), `font-hanzi` / `font-hanzi-sans`, `font-ipa`. Radius tokens: `rounded-btn` 14px, `rounded-card` 20px, `rounded-sheet` 28px (no raw `rounded-[Npx]`). No uppercase labels; keep motion small, it is cut by `prefers-reduced-motion`.
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
- `frontend-design` skill is not installed here; the design is checked manually with screenshots.
- UI redesign "Vở màu": the owner asked for a livelier, game-like look. Violet primary, candy accents per section, chunky 3D buttons, Nunito headings, emoji, confetti and small playful animations replace the quiet notebook style of §12 (cards no longer have the red margin line).
- Desktop width: content is centered and up to `max-w-6xl` (plan §12.4 said max 960px, left-aligned, which left half of a laptop screen empty). Today has a right column on `lg` (streak, goal, decks); form pages center their own `max-w-xl/2xl`.
- No email confirmation: sign-up is name + email + password through the server action `signUpWithPassword` (`lib/actions/auth.ts`: service-role `createUser` with `email_confirm: true`, per-IP limit `SIGNUP_LIMIT_PER_HOUR` kept in Postgres by `hitIpRateLimit` (migration 000008, hashed IPs, fails closed; E2E raises it to 200)), then the browser signs in. The Supabase project still has "Confirm email" on; this bypasses it. Accounts left unconfirmed from before get confirmed on their next correct-password sign-in (`confirmPendingAccount`). Google and email-link sign-in were removed from the UI (Google is not enabled on the project); `/auth/callback` stays for password-reset links. Onboarding has a "Thêm bộ từ mẫu" switch (on by default).
- Groups (migration 000007): deleting a group or leaving it turns the affected group decks back into private decks of their owners (the decks check constraint would otherwise fail); groups cap at 100 members. Activity feed streaks are computed in TS from group mates' `daily_stats`; the group owner toggles "thành viên được sửa" per deck they own in group settings.
- Language flags are SVGs (`components/lang-flag.tsx`, `public/flags/*.svg`), not emoji: Windows has no flag glyphs (showed "GB"/"CN"). `<option>` labels carry no flag. Flag emoji inside user content still render on Windows through a flag-only webfont (`public/fonts/TwemojiCountryFlags.woff2`, Twemoji CC-BY 4.0) first in `--font-sans`, limited by `unicode-range`.
- Fonts (Lighthouse): the Chinese webfonts are variable and only loaded by the `(app)`, `(study)` and `(public)` layouts (`lib/fonts.ts`); `globals.css` names them by family so portals get them too. The landing page uses a 2-glyph subset for its 坚强 sample (`public/fonts/hero-hanzi.woff2`), and IPA uses an ~11 KB Noto Sans subset (`public/fonts/ipa.woff2`) instead of next/font Noto Sans (~200 KB). Logo letter and avatar initials are CSS `content` so they don't clash with link/button labels (WCAG 2.5.3).
- Phase 6: photo import already shipped in Phase 3. PWA = `app/manifest.ts` + `public/sw.js` (cache-first static assets, network-first pages with `/offline` fallback; pages are never cached so data can't leak between accounts on one device; registered only in production). Account export is `/api/export?format=json|csv`; account deletion removes the user's Storage files, then the auth user (everything else cascades). A valid JWT whose account is gone goes through `/auth/signout` (clears cookies only if the auth server confirms the user is gone) instead of looping between `/today` and `/login`. Server TTS and Web Push (optional) are not built.
- Auth is email + password (`/signup`, `/forgot-password`, `/reset-password`, "Mật khẩu" in Settings); see the sign-up entry above. Sign-in and password reset run in the browser (`components/auth/auth-shared.tsx`) because Supabase rate-limits per IP; Supabase errors map to Vietnamese in `authErrorMessage`.
- Service worker: no navigation preload. It re-requested every navigation, so `/auth/callback` ran twice and the second run failed on the used one-time token (sw.js v2 disables it on installed v1 workers).
- Free flashcards: practice mode `flashcard` ("Lật thẻ", `components/practice/flashcard-deck.tsx`, also linked from the deck page with `n=200&from=deck`): flip back and forth, swipe/arrow keys to move, mark "đã thuộc / chưa thuộc", repeat only the unknown cards. It logs `mode = 'flashcard'` reviews that change the FSRS card only with "Tính vào ôn tập" (`submitReviews` now trusts `updateCard` for every mode; the SRS review sends `true`).
- AI enrichment v2 (`PROMPT_VERSION = 2`): up to 6 senses, each with its own `image_query`; the form lets the user tick several senses (meanings joined with "; ", 2 examples each) and shows one photo chip per sense, 16 photos per page with "Xem thêm ảnh". Auto-suggest after a 900 ms pause or on blur is on by default (pref renamed `ai_autofill`, because `updatePrefs` used to store every default and old rows hold `ai_auto_suggest: false`; it now stores only keys the user set). Off in edit mode.
- Free suggestions next to the AI (`lib/dict`, `/api/dict`): the word form asks the free dictionary and the AI together; the dictionary fills the form first, the AI answer replaces it, and the dictionary answer stays when there is no AI key or quota. English = Vietnamese Wiktionary (raw wikitext, English section only) + dictionaryapi.dev; Chinese = CVDICT (`data/cvdict.u8.gz`, CC BY-SA 4.0, parsed in memory, listed in `outputFileTracingIncludes`). The panel credits the source. AI can be Claude or Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`, free tier; `AI_PROVIDER` picks when both keys are set; `aiProvider()` in `lib/env.ts`). Photo import (OCR) still needs Claude.
- Word form (add/edit) is minimal: word + "Gợi ý", then a card with reading and Vietnamese meaning only. Everything else sits in collapsed rows with a one-line summary ("Thêm chi tiết (không bắt buộc)": examples, image, POS & topic, related words, more info, note); a validation error opens its row. Auto-filled fields are no longer ringed one by one; one line under the word says what was filled and from where. Senses are picked as chips.
