// End-to-end coverage of UC-1 (with extensions), FREQ4, FREQ47/48, UC-2/FREQ6/49 and FREQ9.
import { expect, test, type Page } from "@playwright/test";
import { latestLink } from "./mail";

const PASSWORD = "correct-horse-battery";
const unique = () => Math.random().toString(36).slice(2, 8);

async function register(page: Page, user: { email: string; fullName: string; username: string }) {
  await page.goto("/register");
  await page.getByLabel("School email").fill(user.email);
  await page.getByLabel("Full name").fill(user.fullName);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function onboard(page: Page) {
  const id = unique();
  const user = { email: `p${id}@example.edu`, fullName: `Pat ${id}`, username: `pat_${id}` };
  await register(page, user);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(await latestLink(user.email, "verify-email"));
  await expect(page.getByText("Email verified")).toBeVisible();
  await login(page, user.email);
  await expect(page.getByRole("heading", { name: /Welcome back, Pat/ })).toBeVisible();
  return user;
}

test("new student registers, verifies email, logs in and lands on the dashboard", async ({ page }) => {
  const started = Date.now();
  await onboard(page);
  // NFREQ7: onboarding must fit in 5 minutes; automated it should take seconds.
  expect(Date.now() - started).toBeLessThan(5 * 60 * 1000);
});

test("login is refused until the email is verified", async ({ page }) => {
  const id = unique();
  const email = `u${id}@example.edu`;
  await register(page, { email, fullName: "Una Verified", username: `una_${id}` });
  await login(page, email);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(/Verify your email/);
  await expect(page.getByRole("link", { name: "Resend the verification email" })).toBeVisible();
});

test("registration shows validation, domain and duplicate-email errors", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Password must be at least 10 characters.")).toBeVisible();

  await register(page, { email: "x@gmail.com", fullName: "X", username: `x_${unique()}` });
  await expect(page.getByText(/Use your school email/).first()).toBeVisible();

  const user = await onboard(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await register(page, { email: user.email, fullName: "Dup", username: `dup_${unique()}` });
  await expect(page.getByText(/already exists/).first()).toBeVisible();
});

test("wrong password shows a generic error", async ({ page }) => {
  const user = await onboard(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await login(page, user.email, "not-the-password");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
});

test("protected pages redirect to login when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
});

test("user edits their profile; others see only first name and username", async ({ page, browser }) => {
  const user = await onboard(page);
  await page.getByRole("link", { name: user.username }).click();
  await expect(page.getByText(user.email)).toBeVisible();
  const newUsername = `${user.username}_x`;
  await page.getByLabel("Full name").fill("Patricia Example");
  await page.getByLabel("Username").fill(newUsername);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Profile saved.");
  await expect(page.getByRole("link", { name: newUsername })).toBeVisible();

  const other = await browser.newPage();
  await onboard(other);
  await other.goto(`/users/${newUsername}`);
  await expect(other.getByRole("heading", { name: newUsername })).toBeVisible();
  await expect(other.getByText("Patricia", { exact: true })).toBeVisible();
  await expect(other.getByText("Patricia Example")).toHaveCount(0);
  await expect(other.getByText(user.email)).toHaveCount(0);
  await other.close();
});

test("forgot password resets it and old password stops working", async ({ page }) => {
  const user = await onboard(page);
  await page.getByRole("button", { name: "Log out" }).click();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("sent a reset link");

  await page.goto(await latestLink(user.email, "reset-password"));
  await page.getByLabel("New password").fill("a-brand-new-password");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated")).toBeVisible();

  await login(page, user.email);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
  await login(page, user.email, "a-brand-new-password");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});
