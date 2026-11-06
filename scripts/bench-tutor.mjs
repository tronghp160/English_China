// Measures how fast the study tutor answers (/api/chat): time to first byte, first text and the end.
// Usage: pnpm bench:tutor   (env: BASE_URL, BENCH_EMAIL, BENCH_PASSWORD, RUNS, ONLY=simple_en,correct, BENCH_COOKIE)
// Needs a running app (pnpm dev --port 3100, or pnpm build && pnpm start --port 3200) and the demo
// account from pnpm db:seed. Each scenario runs in a fresh thread, 6 s apart (rate limit 12/min).
// For real numbers run it against a Vercel preview (BASE_URL=https://<preview>): the demo account's
// session works on any deployment that uses the same Supabase project; BENCH_COOKIE is only for a
// deployment behind protection. See docs/PERF-gia-su.md.
// Results go to bench-results/tutor-<timestamp>.json; the threads are deleted at the end.
// "marks" are the Server-Timing marks of the prelude (auth, limits, thread_created, context, prelude):
// milliseconds since the request reached the route (cumulative, not per step), median per scenario.

import fs from "node:fs";
import crypto from "node:crypto";
import { connect, median, parseServerTiming, pct, sleep } from "./lib/tutor-client.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const EMAIL = process.env.BENCH_EMAIL ?? "demo@example.com";
const PASSWORD = process.env.BENCH_PASSWORD ?? "sotu1234";
const RUNS = Number(process.env.RUNS ?? 5);
const GAP_MS = 6000;
const ONLY = process.env.ONLY?.split(",").map((s) => s.trim());

const SCENARIOS = [
  { name: "simple_en", language: "en", texts: ["apple nghĩa là gì?"] },
  { name: "simple_zh", language: "zh", texts: ["你好 đọc thế nào?"] },
  { name: "correct", language: "en", texts: ["Sửa giúp mình: I goes to school yesterday."] },
  { name: "tool_mywords", language: "en", texts: ["Trong sổ của mình có từ nào về gia đình không?"] },
  { name: "tool_rare", language: "en", texts: ["Giải thích từ 'sesquipedalian'"] },
  { name: "followup", language: "en", texts: ["happy nghĩa là gì?", "Cho mình thêm 2 ví dụ nữa nhé."] },
  // First message of a new conversation, timed from "send" including creating the thread:
  // first_old creates it first (like the old server action, but cheaper: straight to Supabase),
  // first_new sends at once with newThread and lets /api/chat create it.
  { name: "first_old", language: "en", texts: ["cat nghĩa là gì?"], fresh: "old" },
  { name: "first_new", language: "en", texts: ["dog nghĩa là gì?"], fresh: "new" },
].filter((s) => !ONLY || ONLY.includes(s.name));

let client;
try {
  client = await connect({ baseUrl: BASE_URL, email: EMAIL, password: PASSWORD, cookie: process.env.BENCH_COOKIE });
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}

const results = {};
try {
  let firstCall = true;
  for (const s of SCENARIOS) {
    results[s.name] = [];
    for (let i = 0; i < RUNS; i++) {
      let run;
      try {
        if (s.fresh) {
          if (!firstCall) await sleep(GAP_MS);
          firstCall = false;
          const t0 = performance.now();
          if (s.fresh === "old") {
            run = await client.send(await client.newThread(s.language), s.texts[0], { t0 });
          } else {
            const id = crypto.randomUUID();
            client.created.push(id);
            run = await client.send(id, s.texts[0], { t0, newThread: {} });
          }
        } else {
          const threadId = await client.newThread(s.language);
          for (const text of s.texts) {
            if (!firstCall) await sleep(GAP_MS);
            firstCall = false;
            run = await client.send(threadId, text); // the last message of the scenario is the one measured
          }
        }
      } catch (e) {
        run = { error: String(e).slice(0, 200) };
      }
      results[s.name].push(run);
      const line = run.error
        ? `error ${run.error}`
        : `ttft ${run.ttft} ms, total ${run.total} ms, tools ${run.tools}, ${run.chars} chars | ${run.serverTiming ?? ""}`;
      console.log(`${s.name} #${i + 1}: ${line}`);
    }
  }
} finally {
  await client.cleanup();
}

const summary = Object.entries(results).map(([name, runs]) => {
  const ok = runs.filter((r) => !r.error);
  return {
    scenario: name,
    ok: `${ok.length}/${runs.length}`,
    ttft_p50: pct(ok.map((r) => r.ttft), 50),
    ttft_p90: pct(ok.map((r) => r.ttft), 90),
    total_p50: pct(ok.map((r) => r.total), 50),
    total_p90: pct(ok.map((r) => r.total), 90),
    tools_avg: ok.length ? +(ok.reduce((a, r) => a + r.tools, 0) / ok.length).toFixed(2) : null,
  };
});
console.table(summary);

// Median of every Server-Timing mark per scenario (a mark a run did not have, e.g. thread_created, is skipped).
const markNames = [...new Set(Object.values(results).flat().flatMap((r) => Object.keys(parseServerTiming(r.serverTiming))))];
const marks = Object.entries(results).map(([name, runs]) => {
  const parsed = runs.filter((r) => !r.error).map((r) => parseServerTiming(r.serverTiming));
  return { scenario: name, ...Object.fromEntries(markNames.map((m) => [m, median(parsed.map((p) => p[m]))])) };
});
if (markNames.length) {
  console.log("Server-Timing marks, median ms since the request reached the route:");
  console.table(marks);
}

fs.mkdirSync("bench-results", { recursive: true });
const file = `bench-results/tutor-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(
  file,
  JSON.stringify({ baseUrl: BASE_URL, runs: RUNS, date: new Date().toISOString(), summary, marks, results }, null, 2),
);
console.log(`Saved ${file}`);
