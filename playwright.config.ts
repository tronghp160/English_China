import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./tests/e2e/env";

// Same env as the app (.env.local): Supabase keys for the admin helpers.
loadEnvLocal();

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * E2E runs against a production build (service worker on, like real users) on
 * port 3200, so it can run next to `pnpm dev`. Uses the Supabase project in
 * .env.local; test users are created through the admin API and deleted after.
 * The AI endpoint is mocked in the browser unless E2E_REAL_AI=1.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 300_000,
        // The "Gợi ý" button only renders when a key is configured; the mock covers the call itself.
        env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "e2e-mock-key" },
      },
});
