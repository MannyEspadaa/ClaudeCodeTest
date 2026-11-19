// NFREQ14: automated WCAG 2.1 AA checks (axe-core) on the main pages, light and dark themes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { db, seedUser, uid } from "./db";
import { loginAs } from "./helpers";

async function audit(page: Page, url: string) {
  await page.goto(url);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${url} ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("public pages", async ({ page }) => {
      for (const url of ["/", "/login", "/register", "/forgot-password", "/check-email"]) await audit(page, url);
    });

    test("signed-in pages for a manager and admin", async ({ page }) => {
      const admin = await seedUser({ admin: true, prefix: "Ax" });
      const game = await db.game.create({ data: { name: `Axe ${uid()}`, slug: `axe-${uid()}` } });
      const team = await db.team.create({ data: { gameId: game.id, name: `Team ${uid()}`, status: "ACTIVE" } });
      await db.gameManagerAssignment.create({ data: { userId: admin.id, gameId: game.id } });
      await db.communityMembership.create({ data: { userId: admin.id, gameId: game.id } });
      await db.teamMembership.create({ data: { teamId: team.id, userId: admin.id } });
      await db.scheduleEntry.create({
        data: { gameId: game.id, teamId: team.id, type: "MATCH", title: "", opponent: "Rival", visibility: "PUBLIC", startsAt: new Date(Date.now() + 86_400_000), endsAt: new Date(Date.now() + 90_000_000) },
      });
      await loginAs(page, admin.email);
      for (const url of [
        "/dashboard",
        "/calendar",
        "/games",
        `/games/${game.slug}`,
        `/teams/${team.id}`,
        `/teams/${team.id}/schedule`,
        `/teams/${team.id}/vods`,
        `/teams/${team.id}/stats`,
        "/manage",
        `/manage/teams/${team.id}`,
        "/manage/schedule",
        "/announcements",
        "/profile",
        "/admin/users",
        "/admin/games",
        `/admin/users/${admin.id}`,
      ]) {
        await audit(page, url);
      }
    });
  });
}
