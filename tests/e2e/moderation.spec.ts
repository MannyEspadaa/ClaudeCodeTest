// Phase 5: FREQ40/65 calendar feed, FREQ36/59 suspend + lift, FREQ42 Discord not configured state.
import { expect, test } from "@playwright/test";
import { db, PASSWORD, seedUser, uid } from "./db";
import { loginAs, main } from "./helpers";

test("calendar feed works until the admin suspends the account; lifting restores login", async ({ page, request }) => {
  const admin = await seedUser({ admin: true, prefix: "Ad" });
  const player = await seedUser({ prefix: "Pl" });
  const game = await db.game.create({ data: { name: `Fighter ${uid()}`, slug: `fighter-${uid()}` } });
  const team = await db.team.create({ data: { gameId: game.id, name: `Crew ${uid()}`, status: "ACTIVE" } });
  await db.communityMembership.create({ data: { userId: player.id, gameId: game.id } });
  await db.teamMembership.create({ data: { teamId: team.id, userId: player.id } });
  await db.scheduleEntry.create({
    data: { gameId: game.id, teamId: team.id, type: "PRACTICE", title: "", visibility: "TEAM", startsAt: new Date(Date.now() + 86_400_000), endsAt: new Date(Date.now() + 90_000_000) },
  });

  await loginAs(page, player.email);
  await page.goto("/profile");
  await expect(main(page).getByText("hasn't been configured")).toBeVisible(); // Discord without credentials
  await main(page).getByRole("button", { name: "Create calendar link" }).click();
  const feedUrl = await main(page).getByLabel(/Your calendar link/).inputValue();
  expect(feedUrl).toMatch(/\/api\/calendar\/[\w-]{43}\.ics$/);
  const ics = await request.get(feedUrl);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain(`SUMMARY:${team.name} practice (${game.name})`);

  await loginAs(page, admin.email);
  await page.goto(`/admin/users/${player.id}`);
  const suspend = main(page).getByRole("group").filter({ hasText: "Suspend account" });
  await suspend.getByText("Suspend account").click();
  await suspend.getByLabel("Reason").fill("Missed code of conduct training");
  await suspend.getByRole("button", { name: "Suspend" }).click();
  await expect(main(page).getByRole("button", { name: "Lift suspension" })).toBeVisible();
  await expect(main(page).getByText(/Suspended indefinitely/)).toBeVisible();
  expect((await request.get(feedUrl)).status()).toBe(404);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(player.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(main(page).getByRole("alert")).toContainText("suspended");

  await loginAs(page, admin.email);
  await page.goto(`/admin/users/${player.id}`);
  await main(page).getByRole("button", { name: "Lift suspension" }).click();
  await expect(main(page).getByText("Suspend account")).toBeVisible();
  await loginAs(page, player.email);
});
