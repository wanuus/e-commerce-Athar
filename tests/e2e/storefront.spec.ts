import { expect, test } from "@playwright/test";

test.describe("storefront basics", () => {
  test("Arabic is the default and is right-to-left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("link", { name: "آثر" }).first()).toBeVisible();
  });

  test("English is available and left-to-right; the logo stays Arabic", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("link", { name: "آثر" }).first()).toBeVisible();
  });

  test("language switcher keeps you on the same page", async ({ page }) => {
    await page.goto("/ar/shop");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/shop/);
  });

  test("shop lists products and search narrows them", async ({ page }) => {
    await page.goto("/en/shop");
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await page.goto("/en/shop?q=zzzz-no-such-product");
    await expect(page.getByText("No matching products")).toBeVisible();
  });

  test("unknown pages show the friendly 404", async ({ page }) => {
    const res = await page.goto("/en/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("sitemap and robots are served", async ({ request }) => {
    expect((await request.get("/robots.txt")).ok()).toBeTruthy();
    const sm = await request.get("/sitemap.xml");
    expect(sm.ok()).toBeTruthy();
    expect(await sm.text()).toContain("/shop");
  });
});
