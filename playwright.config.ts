import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }],
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
