import { expect, test } from "@playwright/test";

test.describe("extended-example", () => {
  test("homepage renders the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Playwright/i }).first()).toBeVisible();
  });

  test("docs link navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Docs/i }).first().click();
    await expect(page).toHaveURL(/\/docs\//);
  });

  test("intentional fail to populate the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2").first()).toHaveText("This will not match");
  });
});
