import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test("admin pages require login", async ({ page }) => {
  await page.goto("/en/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test.describe("signed-in admin", () => {
  test.skip(!email || !password, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin tests");

  test("can sign in and open the main screens", async ({ page }) => {
    await page.goto("/en/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    for (const path of ["orders", "products", "inventory", "customers", "settings", "shipping", "discounts"]) {
      const res = await page.goto(`/en/admin/${path}`);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/en/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });
});
