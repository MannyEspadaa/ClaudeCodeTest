// Phase 3: UC-5 with conflict warning, visibility on the public landing page (NFREQ8), FREQ38, FREQ63.
import { expect, test } from "@playwright/test";
import { db, seedUser, uid } from "./db";
import { loginAs, main } from "./helpers";

function localInput(daysAhead: number, hour: number) {
  // Interpreted in APP_TIMEZONE by the app; exact zone doesn't matter for this test.
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
}

test("GM schedules a public match and a team practice; visibility is enforced", async ({ page }) => {
  const gm = await seedUser({ prefix: "Gm" });
  const player = await seedUser({ prefix: "Pl" });
  const game = await db.game.create({ data: { name: `League ${uid()}`, slug: `league-${uid()}` } });
  const team = await db.team.create({ data: { gameId: game.id, name: `Squad ${uid()}`, status: "ACTIVE" } });
  await db.gameManagerAssignment.create({ data: { userId: gm.id, gameId: game.id } });
  await db.communityMembership.createMany({ data: [{ userId: gm.id, gameId: game.id }, { userId: player.id, gameId: game.id }] });
  await db.teamMembership.create({ data: { teamId: team.id, userId: player.id } });
  const opponent = `Rival ${uid()}`;

  await loginAs(page, gm.email);
  await page.goto("/manage/schedule");
  const section = main(page).locator("section").filter({ hasText: game.name });
  const addEntry = async (type: string, hourStart: number, extra?: () => Promise<void>) => {
    await section.locator("summary", { hasText: "Add to schedule" }).click();
    const form = section.locator("form").filter({ has: page.getByRole("button", { name: "Add to schedule" }) });
    await form.getByLabel("Type").selectOption(type);
    await form.getByLabel("Team", { exact: true }).selectOption(team.id);
    await form.getByLabel("Starts").fill(localInput(2, hourStart));
    await form.getByLabel("Ends").fill(localInput(2, hourStart + 2));
    if (extra) await extra();
    await form.getByRole("button", { name: "Add to schedule" }).click();
    return form;
  };

  const matchForm = await addEntry("MATCH", 18, async () => {
    await section.getByLabel("Opponent").fill(opponent);
  });
  await expect(matchForm.getByRole("status")).toHaveText("Added to the schedule.");

  await page.reload();
  const practiceForm = await addEntry("PRACTICE", 19);
  await expect(practiceForm.getByRole("alert")).toContainText("overlaps");
  await practiceForm.getByLabel(/Save even if it overlaps/).check();
  await practiceForm.getByRole("button", { name: "Add to schedule" }).click();
  await expect(practiceForm.getByRole("status")).toHaveText("Added to the schedule.");

  // Logged-out visitors: public match only, page loads within 3 seconds (NFREQ8).
  await page.context().clearCookies();
  const started = Date.now();
  await page.goto("/");
  await expect(main(page).getByText(`${team.name} match vs ${opponent}`)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(3000);
  await expect(main(page).getByText(`${team.name} practice`)).toHaveCount(0);

  // The player sees both on their personal calendar and team schedule.
  await loginAs(page, player.email);
  await expect(main(page).getByText(`${team.name} practice`)).toBeVisible(); // dashboard "next 14 days"
  await page.goto(`/teams/${team.id}/schedule`);
  await expect(main(page).getByText(`${team.name} match vs ${opponent}`)).toBeVisible();
  await main(page).getByText(`${team.name} practice`).click();
  await expect(main(page).getByRole("heading", { name: `${team.name} practice` })).toBeVisible();
  await expect(main(page).getByText("Team only")).toBeVisible();
});

test("GM posts an announcement that community members see on their dashboard", async ({ page }) => {
  const gm = await seedUser({ prefix: "Gm" });
  const member = await seedUser({ prefix: "Mem" });
  const game = await db.game.create({ data: { name: `Racer ${uid()}`, slug: `racer-${uid()}` } });
  await db.gameManagerAssignment.create({ data: { userId: gm.id, gameId: game.id } });
  await db.communityMembership.create({ data: { userId: member.id, gameId: game.id } });
  const title = `Tryouts ${uid()}`;

  await loginAs(page, gm.email);
  await page.goto("/announcements");
  await main(page).getByLabel("Title").fill(title);
  await main(page).getByLabel("Message").fill("Bring your own headset.");
  await main(page).getByRole("button", { name: "Post" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Announcement posted.");

  await loginAs(page, member.email);
  await expect(main(page).getByText(title)).toBeVisible();
});
