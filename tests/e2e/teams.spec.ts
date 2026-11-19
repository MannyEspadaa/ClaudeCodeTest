// Phase 2 journey: UC-9 (assign GM), FREQ50/51, UC-6 request + approval, UC-7, team visibility (C6).
import { expect, test } from "@playwright/test";
import { seedUser, uid } from "./db";
import { loginAs, main } from "./helpers";

test("admin sets up a game, member requests a roster spot, GM approves, outsiders are denied", async ({ page }) => {
  const admin = await seedUser({ admin: true, prefix: "Admin" });
  const gm = await seedUser({ prefix: "Manager" });
  const player = await seedUser({ prefix: "Player" });
  const outsider = await seedUser({ prefix: "Outsider" });
  const gameName = `Arena ${uid()}`;
  const teamName = `Varsity ${uid()}`;

  // Admin creates the game and assigns the Game Manager.
  await loginAs(page, admin.email);
  await page.goto("/admin/games");
  await main(page).getByLabel("Game name").fill(gameName);
  await main(page).getByRole("button", { name: "Add game" }).click();
  await expect(main(page).getByRole("status")).toHaveText(`Created ${gameName}.`);
  await page.goto(`/admin/users?q=${gm.username}`);
  await main(page).getByRole("link", { name: gm.username }).click();
  await main(page).getByRole("listitem").filter({ hasText: gameName }).getByRole("button", { name: "Make manager" }).click();
  await expect(main(page).getByRole("listitem").filter({ hasText: gameName }).getByText("Manager", { exact: true })).toBeVisible();

  // GM creates a team with capacity 1.
  await loginAs(page, gm.email);
  await page.getByRole("link", { name: "Manage", exact: true }).click();
  const section = main(page).locator("section").filter({ hasText: gameName });
  await section.getByText("New team").click();
  await section.getByLabel("Team name").fill(teamName);
  await section.getByLabel("Max roster size").fill("1");
  await section.getByRole("button", { name: "Create team" }).click();
  await expect(section.getByRole("link", { name: teamName })).toBeVisible();

  // Player joins the community and requests a spot.
  await loginAs(page, player.email);
  await page.getByRole("link", { name: "Games", exact: true }).click();
  await main(page).getByRole("listitem").filter({ hasText: gameName }).getByRole("button", { name: "Join community" }).click();
  await main(page).getByRole("link", { name: gameName }).click();
  await main(page).getByRole("button", { name: "Request to join" }).click();
  await expect(main(page).getByText("Request pending")).toBeVisible();

  // GM approves.
  await loginAs(page, gm.email);
  await page.goto("/manage");
  await expect(main(page).getByText("1 pending")).toBeVisible();
  await main(page).getByRole("link", { name: teamName }).click();
  await main(page).getByRole("button", { name: "Approve" }).click();
  await expect(main(page).getByText("No pending requests.")).toBeVisible();
  const teamUrl = page.url().replace("/manage/teams/", "/teams/");

  // Player now sees the team page and it shows on their profile.
  await loginAs(page, player.email);
  await page.goto(teamUrl);
  await expect(main(page).getByRole("heading", { name: teamName })).toBeVisible();
  await expect(main(page).getByRole("link", { name: new RegExp(player.username) })).toBeVisible();
  await page.goto("/profile");
  await expect(main(page).getByText(teamName)).toBeVisible();

  // Outsider joins the community: sees the team listed as full, but cannot open it.
  await loginAs(page, outsider.email);
  await page.goto("/games");
  await main(page).getByRole("listitem").filter({ hasText: gameName }).getByRole("button", { name: "Join community" }).click();
  await main(page).getByRole("link", { name: gameName }).click();
  await expect(main(page).getByText("Roster full")).toBeVisible();
  await page.goto(teamUrl);
  await expect(main(page).getByRole("heading", { name: "No access" })).toBeVisible();
  await page.goto("/manage");
  await expect(main(page).getByRole("heading", { name: "No access" })).toBeVisible();
  await page.goto("/admin");
  await expect(main(page).getByRole("heading", { name: "No access" })).toBeVisible();
});
