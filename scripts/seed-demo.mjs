// Creates demo accounts with sample decks, study history, a group and a public deck,
// so every screen has something to show. Safe to re-run: it deletes and recreates
// only the accounts listed in ACCOUNTS (all @example.com).
// Usage: pnpm db:seed
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FRIEND_DECKS, SAMPLE_DECKS, sampleWordRows } from "../lib/sample-data.ts";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "sotu1234";
const ACCOUNTS = {
  demo: { email: "demo@example.com", name: "Bạn Demo", username: "demo_sotu" },
  minh: { email: "minh@example.com", name: "Minh Anh", username: "minhanh_demo" },
  lan: { email: "lan@example.com", name: "Lan Chi", username: "lanchi_demo" },
};
const TZ = "Asia/Ho_Chi_Minh";
const DAY = 86_400_000;

// Deterministic randomness so every run looks the same.
let seed = 20261017;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/** Study day (04:00 rollover, lib/srs/streak.ts) `offset` days from today. */
function studyDay(offset = 0) {
  const shifted = new Date(Date.now() - 4 * 3_600_000 + offset * DAY);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function findUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit || data.users.length < 1000) return hit ?? null;
  }
}

async function createAccount({ email, name, username }) {
  const old = await findUser(email);
  if (old) await must(sb.auth.admin.deleteUser(old.id), `delete ${email}`);
  const { user } = await must(
    sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name } }),
    `create ${email}`,
  );
  const { error } = await sb.from("profiles").update({ display_name: name, username }).eq("id", user.id);
  if (error) console.warn(`  username @${username} is taken, keeping the generated one`);
  await must(
    sb
      .from("user_settings")
      .update({ onboarded: true, study_langs: ["en", "zh"], daily_goal: 20, daily_new_limit: 10 })
      .eq("user_id", user.id),
    "settings",
  );
  return user.id;
}

async function createDeck(ownerId, sample, extra = {}) {
  const deck = await must(
    sb
      .from("decks")
      .insert({ owner_id: ownerId, name: sample.name, description: sample.description, language: sample.language, ...extra })
      .select("id")
      .single(),
    `deck ${sample.name}`,
  );
  const rows = sampleWordRows(sample).map((r) => ({ ...r, deck_id: deck.id, created_by: ownerId }));
  const words = await must(sb.from("words").insert(rows).select("id"), `words ${sample.name}`);
  return { id: deck.id, wordIds: words.map((w) => w.id) };
}

/** Cards in every state, a review log and daily stats for the last few weeks. */
async function seedProgress(userId, wordIds) {
  const now = Date.now();
  const shuffled = [...wordIds].sort(() => rand() - 0.5);
  const cards = [];
  const studied = [];
  // PostgREST sends null for keys missing from some rows of a bulk insert, so every card gets every key.
  const card = (wordId, fields) => ({
    user_id: userId, word_id: wordId, direction: "recognize", state: "new", due: new Date(now).toISOString(),
    stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0,
    last_review: null, ...fields,
  });
  shuffled.forEach((wordId, i) => {
    if (i < 18) {
      // Review cards: half due today, half later.
      const interval = between(2, 20);
      const due = i < 9 ? now - between(1, 30) * 3_600_000 : now + between(1, 9) * DAY;
      cards.push(card(wordId, {
        state: "review", due: new Date(due).toISOString(), stability: interval + rand() * 3, difficulty: 3 + rand() * 4,
        elapsed_days: interval, scheduled_days: interval, reps: between(3, 7), lapses: rand() < 0.25 ? 1 : 0,
        last_review: new Date(due - interval * DAY).toISOString(),
      }));
      studied.push(wordId);
    } else if (i < 24) {
      cards.push(card(wordId, {
        state: "learning", due: new Date(now - between(5, 60) * 60_000).toISOString(), stability: 0.4 + rand(),
        difficulty: 5 + rand() * 2, learning_steps: 1, reps: 1, last_review: new Date(now - DAY).toISOString(),
      }));
      studied.push(wordId);
    } else {
      cards.push(card(wordId, {}));
    }
  });
  await must(sb.from("user_cards").insert(cards), "user_cards");

  // History: a 9-day streak up to yesterday, some older days, one gap.
  const logs = [];
  const stats = [];
  for (let offset = -24; offset <= -1; offset++) {
    if (offset < -9 && rand() < 0.35) continue;
    if (offset === -10) continue; // breaks the older run so the streak is exactly 9
    const day = studyDay(offset);
    const n = between(8, 32);
    let correct = 0;
    for (let k = 0; k < n; k++) {
      const rating = rand() < 0.12 ? 1 : rand() < 0.2 ? 2 : rand() < 0.8 ? 3 : 4;
      if (rating >= 3) correct++;
      logs.push({
        user_id: userId, word_id: pick(studied), direction: "recognize",
        mode: pick(["flashcard", "flashcard", "quiz", "typing", "listening"]), rating, was_correct: rating >= 3,
        duration_ms: between(2500, 14000), state_before: rand() < 0.3 ? "learning" : "review",
        reviewed_at: new Date(Date.parse(`${day}T12:00:00+07:00`) + between(-3, 8) * 3_600_000).toISOString(),
      });
    }
    const goal = n >= 20;
    stats.push({
      user_id: userId, day, reviews: n, correct, new_learned: between(0, 6),
      words_added: offset === -24 || offset === -15 ? 22 : 0, xp: correct + (goal ? 10 : 0), goal_reached: goal,
    });
  }
  await must(sb.from("review_logs").insert(logs), "review_logs");
  await must(sb.from("daily_stats").upsert(stats), "daily_stats");
}

/** Some XP this week so the group leaderboard has a race. */
async function seedWeek(userId, days, perDay) {
  const rows = [];
  for (let offset = -days; offset <= -1; offset++) {
    const reviews = between(perDay - 6, perDay + 6);
    const correct = Math.round(reviews * 0.85);
    rows.push({ user_id: userId, day: studyDay(offset), reviews, correct, new_learned: 5, words_added: 0, xp: correct + 10, goal_reached: true });
  }
  rows.push({ user_id: userId, day: studyDay(0), reviews: perDay, correct: perDay - 2, new_learned: 5, words_added: 0, xp: perDay + 8, goal_reached: true });
  await must(sb.from("daily_stats").upsert(rows), "friend stats");
}

console.log("Creating accounts…");
const demo = await createAccount(ACCOUNTS.demo);
const minh = await createAccount(ACCOUNTS.minh);
const lan = await createAccount(ACCOUNTS.lan);

console.log("Decks and words…");
const wordIds = [];
for (const sample of SAMPLE_DECKS) wordIds.push(...(await createDeck(demo, sample)).wordIds);

await createDeck(minh, FRIEND_DECKS[0], { visibility: "public" });
const group = await must(
  sb.from("groups").insert({ name: "Nhóm học buổi tối", description: "Mỗi tối 15 phút, cuối tuần thi xem ai nhiều XP nhất 🔥", owner_id: minh }).select("id, invite_code").single(),
  "group",
);
await must(sb.from("group_members").insert([{ group_id: group.id, user_id: demo }, { group_id: group.id, user_id: lan }]), "members");
await createDeck(minh, FRIEND_DECKS[1], { visibility: "group", group_id: group.id });

console.log("Study history…");
await seedProgress(demo, wordIds);
await seedWeek(minh, 5, 30);
await seedWeek(lan, 3, 18);

console.log("Pet room & trips…");
async function seedPet(userId) {
  const day3 = studyDay(-3);
  const day2 = studyDay(-2);
  const t3 = new Date(Date.now() - 3 * DAY).toISOString();
  const t2 = new Date(Date.now() - 2 * DAY).toISOString();

  await must(
    sb.from("bin_items").upsert([
      { user_id: userId, item_id: "bed_cushion", qty: 1 },
      { user_id: userId, item_id: "wall_sun", qty: 1 },
    ]),
    "bin_items",
  );

  await must(
    sb.from("bin_room").upsert([
      { user_id: userId, slot: "bed", item_id: "bed_cushion" },
      { user_id: userId, slot: "wall", item_id: "wall_sun" },
    ]),
    "bin_room",
  );

  await must(
    sb.from("bin_trips").upsert(
      [
        {
          user_id: userId,
          study_day: day3,
          lang: "en",
          place_id: "london",
          word_term: "umbrella",
          bones: 5,
          item_id: null,
          started_at: t3,
          returns_at: t3,
          collected_at: t3,
          story: {
            source: "template",
            lines: [
              { target: "In London, I saw a big umbrella near Big Ben!", vi: "Ở Luân Đôn, Bin thấy một chiếc ô lớn gần Big Ben!" },
              { target: "It was raining so I stayed dry.", vi: "Trời mưa nên Bin tìm chỗ trú." },
            ],
          },
        },
        {
          user_id: userId,
          study_day: day2,
          lang: "zh",
          place_id: "beijing",
          word_term: "熊猫",
          bones: 6,
          item_id: null,
          started_at: t2,
          returns_at: t2,
          collected_at: t2,
          story: {
            source: "template",
            lines: [
              { target: "在天坛，我看到了可爱的熊猫！", vi: "Ở Thiên Đàn, Bin đã thấy một chú gấu trúc đáng yêu!" },
              { target: "天气很好，我玩得很开心。", vi: "Thời tiết rất đẹp, Bin chơi rất vui." },
            ],
            pinyin: [
              "Zài tiāntán, wǒ kàndàole kě'ài de xióngmāo!",
              "Tiānqì hěn hǎo, wǒ wán de hěn kāixīn.",
            ],
          },
        },
      ],
      { onConflict: "user_id, study_day" },
    ),
    "bin_trips",
  );

  await must(
    sb.from("bin_ledger").insert([
      { user_id: userId, kind: "buy", amount: -12, ref: "bed_cushion", study_day: day3 },
      { user_id: userId, kind: "buy", amount: -10, ref: "wall_sun", study_day: day3 },
      { user_id: userId, kind: "trip", amount: 5, ref: "london", study_day: day3 },
      { user_id: userId, kind: "trip", amount: 6, ref: "beijing", study_day: day2 },
    ]),
    "bin_ledger",
  );
}
await seedPet(demo);

console.log(`
Done. Sign in with any of these (password: ${PASSWORD}):
  ${ACCOUNTS.demo.email}   ← main demo account: 4 decks, cards due today, 9-day streak
  ${ACCOUNTS.minh.email}   ← friend, owns the group and a public deck
  ${ACCOUNTS.lan.email}
Group invite code: ${group.invite_code}`);
