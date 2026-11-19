import { defineConfig, devices } from "@playwright/test";

// Test workers inherit this, so direct DB helpers (tests/e2e/db.ts) use the e2e database.
process.loadEnvFile(".env.e2e");

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  // NFREQ15: Chromium always; Firefox and WebKit (Safari engine) when E2E_ALL_BROWSERS=1 (CI).
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
          { name: "desktop-edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
        ]
      : []),
  ],
  webServer: {
    // Migrated e2e database (tests use unique users, no reset needed), production build (NFREQ5 desktop experience is what we test).
    command:
      `dotenv -e .env.e2e -o -- sh -c "rm -rf .mail-outbox/e2e && prisma migrate deploy && ` +
      `next build && next start -p ${PORT}"`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
