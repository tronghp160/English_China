// Scores the study tutor's answers (/api/chat) with rules. Quality counterpart of scripts/bench-tutor.mjs.
// Usage: pnpm eval:tutor
//   env: BASE_URL (default http://localhost:3100), BENCH_EMAIL, BENCH_PASSWORD, BENCH_COOKIE,
//        ONLY=en_word_apple,fix_en (case ids or kinds), LABEL=baseline (tag in the output file),
//        JUDGE=1 (also grade every answer 1-5 with the configured AI model; costs extra quota)
// Needs a running app and the demo account from pnpm db:seed. Each case is one first message in a
// fresh thread, 6 s apart (rate limit 12/min). Uses real AI quota: about one unit per case.
// Cases: scripts/eval/tutor-cases.json, rules: scripts/eval/checks.mjs (tests/unit/eval-checks.test.ts).
// Results go to bench-results/eval-<timestamp>.json (git-ignored, answers included); the threads are deleted.

import fs from "node:fs";
import { runChecks, tally } from "./eval/checks.mjs";
import { connect, loadEnv, pct, sleep } from "./lib/tutor-client.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const EMAIL = process.env.BENCH_EMAIL ?? "demo@example.com";
const PASSWORD = process.env.BENCH_PASSWORD ?? "sotu1234";
const GAP_MS = 6000;
const ONLY = process.env.ONLY?.split(",").map((s) => s.trim());
const LABEL = process.env.LABEL ?? "";
const JUDGE = process.env.JUDGE === "1";

const spec = JSON.parse(fs.readFileSync(new URL("./eval/tutor-cases.json", import.meta.url), "utf8"));
const cases = spec.cases.filter((c) => !ONLY || ONLY.includes(c.id) || ONLY.includes(c.kind));
if (!cases.length) {
  console.error(`No case matches ONLY=${process.env.ONLY}`);
  process.exit(1);
}

const env = loadEnv();
let client;
try {
  client = await connect({ baseUrl: BASE_URL, email: EMAIL, password: PASSWORD, cookie: process.env.BENCH_COOKIE, env });
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}

/** Asks the configured AI model to grade one answer 1-5 (correct, natural, level). Null when it cannot. */
async function judge(c, answer) {
  const prompt = [
    "Bạn là giám khảo chấm câu trả lời của một gia sư ngoại ngữ (tiếng Anh/tiếng Trung) cho người Việt.",
    `Người học hỏi: ${c.text}`,
    "Câu trả lời của gia sư:",
    "<<<",
    answer,
    ">>>",
    "Chấm từ 1 (rất tệ) đến 5 (rất tốt) ba tiêu chí: correct (đúng nghĩa, đúng phiên âm, đúng ngữ pháp), natural (tự nhiên, đúng yêu cầu, không dài dòng),",
    "level (hợp với người học tiếng Việt mới học, dễ hiểu).",
    'Chỉ trả về một đối tượng JSON một dòng: {"correct":n,"natural":n,"level":n,"note":"một câu tiếng Việt"}',
  ].join("\n");
  try {
    let text;
    const useGoogle = env.AI_PROVIDER === "google" || !env.ANTHROPIC_API_KEY;
    if (useGoogle) {
      const model = (env.AI_MODEL_GOOGLE ?? "gemini-3.8-flash").split(",")[0].trim();
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GOOGLE_GENERATIVE_AI_API_KEY ?? "" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`google ${res.status}`);
      text = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: env.AI_MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      text = (await res.json()).content?.map((p) => p.text ?? "").join("");
    }
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    const n = (v) => (Number.isFinite(v) ? Math.min(5, Math.max(1, Math.round(v))) : null);
    return { correct: n(json.correct), natural: n(json.natural), level: n(json.level), note: String(json.note ?? "").slice(0, 200) };
  } catch (e) {
    return { error: String(e.message ?? e).slice(0, 100) };
  }
}

const done = [];
try {
  let first = true;
  for (const c of cases) {
    let run;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (!first) await sleep(attempt === 1 ? GAP_MS : 15000); // a retry waits longer (busy model, rate limit)
      first = false;
      try {
        run = await client.send(await client.newThread(c.language), c.text);
      } catch (e) {
        run = { error: String(e).slice(0, 200) };
      }
      if (!run.error && run.answer?.trim()) break;
    }
    if (run.error || !run.answer?.trim()) {
      const error = run.error ?? "empty answer";
      console.log(`ERROR ${c.id}: ${error}`);
      done.push({ id: c.id, kind: c.kind, text: c.text, error, results: [] });
      continue;
    }
    const results = runChecks({ checks: c.checks, defaults: spec.defaults, omit: c.omit }, run.answer, { userText: c.text });
    const counted = results.filter((r) => !r.skipped);
    const failed = counted.filter((r) => !r.pass);
    const entry = { id: c.id, kind: c.kind, text: c.text, ttft: run.ttft, total: run.total, tools: run.tools, answer: run.answer, results };
    if (JUDGE) entry.judge = await judge(c, run.answer);
    done.push(entry);
    console.log(
      `${failed.length ? "FAIL " : "ok   "} ${c.id.padEnd(30)} ttft ${String(run.ttft).padStart(5)} ms  checks ${counted.length - failed.length}/${counted.length}` +
        (entry.judge && !entry.judge.error ? `  judge ${entry.judge.correct}/${entry.judge.natural}/${entry.judge.level}` : ""),
    );
    for (const r of failed) console.log(`        - ${r.name}${r.arg === undefined ? "" : ` ${JSON.stringify(r.arg)}`}: ${r.detail ?? "failed"}`);
  }
} finally {
  await client.cleanup();
}

const answered = done.filter((d) => !d.error);
const score = tally(answered);
console.log("");
console.table(
  Object.entries(score.byCheck)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([check, s]) => ({ check, pass: `${s.pass}/${s.total}`, rate: `${Math.round((100 * s.pass) / s.total)}%` })),
);
const kinds = [...new Set(answered.map((d) => d.kind))].map((kind) => {
  const t = tally(answered.filter((d) => d.kind === kind));
  return { kind, cases: t.cases, casesPassed: t.casesPassed, checks: `${t.passed}/${t.total}`, rate: `${Math.round(100 * t.rate)}%` };
});
console.table(kinds);

const ttfts = answered.map((d) => d.ttft);
const judged = answered.filter((d) => d.judge && !d.judge.error);
const avg = (key) => (judged.length ? +(judged.reduce((a, d) => a + (d.judge[key] ?? 0), 0) / judged.length).toFixed(2) : null);
const totals = {
  label: LABEL || null,
  baseUrl: BASE_URL,
  date: new Date().toISOString(),
  casesRun: done.length,
  casesWithError: done.length - answered.length,
  casesPassed: score.casesPassed,
  checksPassed: score.passed,
  checksTotal: score.total,
  checkRate: +score.rate.toFixed(4),
  ttft_p50: pct(ttfts, 50),
  ttft_p90: pct(ttfts, 90),
  ...(JUDGE ? { judge: { graded: judged.length, correct: avg("correct"), natural: avg("natural"), level: avg("level") } } : {}),
};
console.log(JSON.stringify(totals, null, 2));

fs.mkdirSync("bench-results", { recursive: true });
const file = `bench-results/eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(file, JSON.stringify({ totals, byCheck: score.byCheck, cases: done }, null, 2));
console.log(`Saved ${file}`);
