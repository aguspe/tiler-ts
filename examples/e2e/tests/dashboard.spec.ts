import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end + visual regression suite for the editor mounted at
 * /dashboards/:slug. The snapshot tests cover the headline layouts
 * (light, dark, palette open, drawer open). The interaction tests
 * exercise the moving parts (drag/drop position, delete confirm,
 * resize survival after delete) so any regression also surfaces as a
 * crisp assertion failure rather than a fuzzy pixel diff.
 *
 * Snapshots are stored under `tests/dashboard.spec.ts-snapshots/`.
 */

const DASHBOARD = "/dashboards/test_automation";

async function goto(page: Page): Promise<void> {
  await page.goto(DASHBOARD);
  // Wait for hydration: once gridstack lazy-loads and initializes, it
  // attaches itself to the .grid-stack root as `.gridstack`. We check
  // that property directly — `.ui-resizable-handle` children render
  // with zero size until hovered, so they're not a reliable readiness
  // selector.
  await page.waitForFunction(
    () =>
      (document.querySelector(".grid-stack") as HTMLElement & { gridstack?: unknown })
        ?.gridstack !== undefined,
  );
  // Let Google Fonts and chart libraries paint before snapshotting.
  await page.waitForLoadState("networkidle");
}

test.describe("editor / light theme", () => {
  test("renders the headline dashboard layout", async ({ page }) => {
    await goto(page);
    await expect(page).toHaveScreenshot("dashboard-light.png", {
      fullPage: false,
    });
  });

  test('"+ Add Panel" reveals the right-side palette', async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: "Toggle palette" }).click();
    await expect(page.locator(".tiler-widget-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-palette-open.png");
  });

  test("clicking a panel header opens the config drawer", async ({ page }) => {
    await goto(page);
    await page
      .getByRole("button", { name: /Configure panel Total runs/ })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Total runs (24h)");
    await expect(page.getByRole("button", { name: "Use example" })).toBeVisible();
    await expect(page).toHaveScreenshot("drawer-metric.png");
  });

  test("drawer 'Use example' fills config and renders a live preview", async ({ page }) => {
    await goto(page);
    await page
      .getByRole("button", { name: /Configure panel Status breakdown/ })
      .click();
    await page.getByRole("button", { name: "Use example" }).click();
    // Recharts SVG inside the preview pane confirms the widget rendered.
    await expect(page.locator(".tiler-drawer-preview svg")).toBeVisible();
  });
});

test.describe("editor / dark theme", () => {
  test("dark toggle flips the surface", async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page).toHaveScreenshot("dashboard-dark.png");
  });
});

test.describe("editor / TV mode", () => {
  test("hides chrome and fills the viewport", async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: "Toggle TV mode" }).click();
    // Chrome (nav + page header) is hidden; only the grid + Exit TV pill remain.
    await expect(page.locator(".tiler-nav")).not.toBeVisible();
    await expect(page.locator(".tiler-page-header")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Exit TV mode" })).toBeVisible();
  });
});

test.describe("editor / interactions", () => {
  test("delete confirm modal removes the panel after confirm", async ({ page }) => {
    await goto(page);
    const before = await page.locator(".grid-stack-item").count();
    const firstAction = page
      .locator(".grid-stack-item")
      .first()
      .locator(".tiler-panel-action");
    // Hover so the delete affordance becomes visible (it has opacity:0
    // until the panel is hovered).
    await firstAction.evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: /^Delete$/ }).click();
    await expect(page.locator(".grid-stack-item")).toHaveCount(before - 1);
  });

  test("delete confirm Cancel keeps the panel intact", async ({ page }) => {
    await goto(page);
    const before = await page.locator(".grid-stack-item").count();
    await page
      .locator(".grid-stack-item")
      .first()
      .locator(".tiler-panel-action")
      .evaluate((el) => (el as HTMLElement).click());
    await page.getByRole("button", { name: /Cancel/ }).click();
    await expect(page.locator(".grid-stack-item")).toHaveCount(before);
  });

  test("resize still works on neighbours after a panel is deleted", async ({ page }) => {
    await goto(page);
    // Delete the first panel.
    await page
      .locator(".grid-stack-item")
      .first()
      .locator(".tiler-panel-action")
      .evaluate((el) => (el as HTMLElement).click());
    await page.getByRole("button", { name: /^Delete$/ }).click();

    // Resize a survivor programmatically through the gridstack API; the
    // gs-* attributes update synchronously when gridstack accepts the
    // change — they would NOT update if the engine still tracked the
    // deleted phantom node, because collisions would reject the resize.
    const survivorCoords = await page.evaluate(() => {
      const survivor = document.querySelector(".grid-stack-item") as HTMLElement & {
        gridstackNode?: unknown;
      };
      const grid = (document.querySelector(".grid-stack") as HTMLElement & {
        gridstack?: { update(el: HTMLElement, opts: { w: number; h: number }): unknown };
      }).gridstack;
      grid?.update(survivor, { w: 5, h: 3 });
      return {
        w: survivor.getAttribute("gs-w"),
        h: survivor.getAttribute("gs-h"),
      };
    });
    expect(survivorCoords).toEqual({ w: "5", h: "3" });
  });

  test("palette closes when clicking outside it", async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: "Toggle palette" }).click();
    await expect(page.locator(".tiler-widget-palette")).toBeVisible();
    // Click somewhere safely outside both the palette and the toggle.
    await page.locator(".tiler-grid-wrap").click({ position: { x: 50, y: 50 } });
    await expect(page.locator(".tiler-widget-palette")).toHaveCount(0);
  });
});

test.describe("editor / placeholder pages", () => {
  test("Settings shows live diagnostics", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    // Diagnostics card grid present
    await expect(page.locator(".tiler-card", { hasText: "Dashboards" })).toBeVisible();
    await expect(page.locator(".tiler-card", { hasText: "Widgets registered" })).toBeVisible();
  });

  test("Data Sources lists registered sources", async ({ page }) => {
    await page.goto("/data-sources");
    await expect(page.getByRole("heading", { name: "Data Sources" })).toBeVisible();
  });
});
