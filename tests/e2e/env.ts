import fs from "node:fs";

/**
 * Loads .env.local into process.env without overriding values already set (like Next does).
 * CLONE_* (the private "bản AI" profile) is never loaded: the E2E server gets made-up values (playwright.config.ts).
 */
export function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && !m[1].startsWith("CLONE_") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}
