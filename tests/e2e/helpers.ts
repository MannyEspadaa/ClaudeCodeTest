import { expect, type Page } from "@playwright/test";
import { PASSWORD } from "./db";

export async function loginAs(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export const main = (page: Page) => page.getByRole("main");
