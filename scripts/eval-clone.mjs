// Privacy and safety red-team of the "bản AI" (/api/clone). Run it on the machine that holds the real profile.
// Usage: pnpm eval:clone
//   env: BASE_URL (default http://localhost:3100), BENCH_EMAIL, BENCH_PASSWORD, ONLY=01_identity,05_does_he_like_me, LABEL=
// The app at BASE_URL must run with the REAL CLONE_PROFILE (pnpm dev reads .env.local). Reads from .env.local, never printed:
//   CLONE_PROFILE            the profile, to catch an answer that repeats part of it word for word
//   CLONE_NAME               the owner's name for {name} (default Trọng)
//   CLONE_FORBIDDEN_TERMS    comma-separated names and details that must never appear in an answer
//   CLONE_EXPECT_HOBBIES, CLONE_EXPECT_GOAL, CLONE_EXPECT_PRONOUN
//                            comma-separated words the profile should make the clone say (a check is skipped when unset)
// PRIVACY: the terminal only gets ok/FAIL lines and generic reasons. The answers (which may repeat the profile) are saved
// ONLY to bench-results/eval-clone-<time>.json, which git ignores, so read them there, by hand, for the cases marked
// "read by hand". Nothing here is meant for the repo: do not paste answers or results into docs, tests or commits.
// Uses the demo account like the tutor bench, about one AI unit per case, 6 s apart (rate limit 12/min).

import fs from "node:fs";
import { fillPlaceholders, runCloneChecks } from "./eval/clone-checks.mjs";
import { tally } from "./eval/checks.mjs";
import { connect, loadEnv, sleep } from "./lib/tutor-client.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const EMAIL = process.env.BENCH_EMAIL ?? "demo@example.com";
const PASSWORD = process.env.BENCH_PASSWORD ?? "sotu1234";
const GAP_MS = 6000;
const ONLY = process.env.ONLY?.split(",").map((s) => s.trim());
const LABEL = process.env.LABEL ?? "";

const spec = JSON.parse(fs.readFileSync(new URL("./eval/clone-cases.json", import.meta.url), "utf8"));
const env = loadEnv({ include: ["CLONE_PROFILE", "CLONE_NAME", "CLONE_FORBIDDEN_TERMS", "CLONE_EXPECT_*"] });
const ctx = {
  name: env.CLONE_NAME?.trim() || "Trọng",
  forbidden: (env.CLONE_FORBIDDEN_TERMS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  profile: env.CLONE_PROFILE ?? null,
  env,
};

if (!ctx.profile) console.warn("CLONE_PROFILE is not in .env.local: the check that an answer does not repeat the profile is skipped.");
if (!ctx.forbidden.length) console.warn("CLONE_FORBIDDEN_TERMS is empty: the check for names that must never appear is skipped. Fill it in before trusting this run.");

/** The conversation of a case as [{ role, text }], placeholders filled; null when the case cannot run here. */
function conversation(c) {
  const turns = c.messages ?? [{ role: "user", text: c.repeat ? c.repeat.text.repeat(c.repeat.times) : c.text }];
  const filled = turns.map((t) => ({ role: t.role, text: fillPlaceholders(t.text, ctx) }));
  return filled.some((t) => t.text === null) ? null : filled;
}

const cases = spec.cases.filter((c) => !ONLY || ONLY.includes(c.id));
if (!cases.length) {
  console.error(`No case matches ONLY=${process.env.ONLY}`);
  process.exit(1);
}

let client;
try {
  client = await connect({ baseUrl: BASE_URL, email: EMAIL, password: PASSWORD, cookie: process.env.BENCH_COOKIE, env: loadEnv() });
} catch (e) {
  console.error(String(e.message ?? e));
  process.exit(1);
}

const done = [];
let first = true;
for (const c of cases) {
  const messages = conversation(c);
  if (!messages) {
    console.log(`skip  ${c.id}: needs CLONE_FORBIDDEN_TERMS`);
    continue;
  }
  let run;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (!first) await sleep(attempt === 1 ? GAP_MS : 15000);
    first = false;
    try {
      run = await client.sendClone(messages);
    } catch (e) {
      run = { error: String(e).slice(0, 120) };
    }
    if (!run.error && run.answer?.trim()) break;
  }
  if (run.error || !run.answer?.trim()) {
    console.log(`ERROR ${c.id}: ${run.error ?? "empty answer"}`);
    done.push({ id: c.id, error: run.error ?? "empty answer", results: [] });
    continue;
  }
  const results = runCloneChecks({ checks: c.checks, defaults: spec.defaults, omit: c.omit }, run.answer, ctx);
  const counted = results.filter((r) => !r.skipped);
  const failed = counted.filter((r) => !r.pass);
  done.push({ id: c.id, manual: c.manual, ttft: run.ttft, total: run.total, answer: run.answer, results });
  console.log(`${failed.length ? "FAIL " : "ok   "} ${c.id.padEnd(24)} checks ${counted.length - failed.length}/${counted.length}${c.manual ? "   (read by hand)" : ""}`);
  for (const r of failed) console.log(`        - ${r.name}${r.arg === undefined || typeof r.arg === "object" ? "" : ` ${r.arg}`}: ${r.detail ?? "failed"}`);
}

const answered = done.filter((d) => !d.error);
const score = tally(answered);
const failedCases = answered.filter((d) => d.results.some((r) => !r.skipped && !r.pass)).map((d) => d.id);
const errors = done.filter((d) => d.error).map((d) => d.id);
console.log("");
console.log(
  `${answered.length - failedCases.length}/${answered.length} cases pass the automatic checks` +
    (errors.length ? `; ${errors.length} could not run (${errors.join(", ")})` : "") +
    (failedCases.length ? `; failed: ${failedCases.join(", ")}` : ""),
);
const byHand = answered.filter((d) => d.manual).map((d) => d.id);
if (byHand.length) console.log(`Read by hand in the saved file (what to look for is in the file): ${byHand.join(", ")}`);

fs.mkdirSync("bench-results", { recursive: true });
const file = `bench-results/eval-clone-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(
  file,
  JSON.stringify(
    {
      note: "PRIVATE: answers may repeat the profile. Git ignores this folder. Do not paste any of it into the repo.",
      label: LABEL || null,
      date: new Date().toISOString(),
      baseUrl: BASE_URL,
      checksPassed: score.passed,
      checksTotal: score.total,
      cases: done,
    },
    null,
    2,
  ),
);
console.log(`Saved ${file}`);
if (failedCases.length || errors.length) process.exitCode = 1;
