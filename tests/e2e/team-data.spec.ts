// Phase 4: FREQ61 (stat setup), FREQ29/31 (VOD + coach note), FREQ30/43/46 (stats), FREQ62 (reply), team isolation.
import { expect, test } from "@playwright/test";
import { db, seedUser, uid } from "./db";
import { loginAs, main } from "./helpers";

test("stats and VODs flow from GM to players; other teams are denied", async ({ page }) => {
  const admin = await seedUser({ admin: true, prefix: "Ad" });
  const gm = await seedUser({ prefix: "Gm" });
  const player = await seedUser({ prefix: "Pl" });
  const rival = await seedUser({ prefix: "Rv" });
  const game = await db.game.create({ data: { name: `Shooter ${uid()}`, slug: `shooter-${uid()}` } });
  const team = await db.team.create({ data: { gameId: game.id, name: `Alpha ${uid()}`, status: "ACTIVE" } });
  const other = await db.team.create({ data: { gameId: game.id, name: `Beta ${uid()}`, status: "ACTIVE" } });
  await db.gameManagerAssignment.create({ data: { userId: gm.id, gameId: game.id } });
  await db.communityMembership.createMany({ data: [gm, player, rival].map((u) => ({ userId: u.id, gameId: game.id })) });
  await db.teamMembership.createMany({ data: [{ teamId: team.id, userId: player.id }, { teamId: other.id, userId: rival.id }] });

  // Admin adds the starter stat set.
  await loginAs(page, admin.email);
  await page.goto(`/admin/games/${game.id}/stats`);
  await main(page).getByRole("button", { name: "Add starter stats" }).click();
  await expect(main(page).getByText("(kills + assists) / deaths")).toBeVisible();

  // GM adds a VOD and a coach note.
  await loginAs(page, gm.email);
  await page.goto(`/teams/${team.id}/vods`);
  await main(page).getByLabel("Title").fill("Finals map 1");
  await main(page).getByLabel("Link").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await main(page).getByRole("button", { name: "Add VOD" }).click();
  await main(page).getByRole("link", { name: "Finals map 1" }).click();
  await expect(main(page).locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  await main(page).getByLabel("New note for the team").fill("Rotate earlier on B.");
  await main(page).getByRole("button", { name: "Add note" }).click();
  await expect(main(page).getByText("Rotate earlier on B.")).toBeVisible();
  const vodUrl = page.url();

  // GM enters match stats.
  await page.goto(`/teams/${team.id}/stats`);
  await main(page).getByRole("link", { name: "Enter match stats" }).click();
  await main(page).getByLabel("Title").fill("vs State");
  await main(page).getByLabel("Date played").fill("2026-10-01T19:00");
  await main(page).getByLabel("Team Won (1/0)").fill("1");
  await main(page).getByLabel(`${player.username} Kills`).fill("20");
  await main(page).getByLabel(`${player.username} Deaths`).fill("abc");
  await main(page).getByRole("button", { name: "Record stats" }).click();
  await expect(main(page).getByRole("alert")).toHaveText("Some values aren't numbers.");
  await expect(main(page).getByLabel(`${player.username} Kills`)).toHaveValue("20"); // input kept after error
  await main(page).getByLabel(`${player.username} Deaths`).fill("8");
  await main(page).getByLabel(`${player.username} Assists`).fill("4");
  await main(page).getByRole("button", { name: "Record stats" }).click();
  await expect(main(page).getByRole("heading", { name: /vs State/ })).toBeVisible();

  // Player sees calculated KDA (20+4)/8 = 3.00 and replies to the note.
  await loginAs(page, player.email);
  await page.goto(`/teams/${team.id}/stats`);
  const row = main(page).getByRole("row", { name: new RegExp(player.username) }).first();
  await expect(row).toContainText("3.00");
  await page.goto(vodUrl);
  await main(page).getByText("Reply").first().click();
  await main(page).getByLabel("Reply", { exact: true }).fill("Will do.");
  await main(page).getByRole("button", { name: "Reply" }).click();
  await expect(main(page).getByText("Will do.")).toBeVisible();
  await expect(main(page).getByLabel("New note for the team")).toHaveCount(0); // players can't start threads

  // A player on another team is denied.
  await loginAs(page, rival.email);
  for (const url of [`/teams/${team.id}/stats`, `/teams/${team.id}/vods`, vodUrl]) {
    await page.goto(url);
    await expect(main(page).getByRole("heading", { name: "No access" })).toBeVisible();
  }
});
