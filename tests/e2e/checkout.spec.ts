import { expect, test } from "@playwright/test";

test("a guest can order a T-shirt with cash on delivery", async ({ page }) => {
  await page.goto("/en/shop");
  await page.getByRole("heading", { level: 3 }).first().click();

  // Pick the first size that is not sold out, then add to cart.
  await page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL)$/ }).and(page.locator(":not([disabled])")).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/en/cart");
  await page.getByPlaceholder("Promo code").fill("WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("WELCOME10")).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();

  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Mobile number").fill("01012345678");
  await page.getByLabel("Governorate").selectOption("Cairo");
  await page.getByLabel("City").fill("Nasr City");
  await page.getByLabel("Street").fill("Test street 1");

  const confirm = page.getByRole("button", { name: "Confirm order" });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(/\/en\/orders\//);
  await expect(page.getByText("Thank you! We received your order")).toBeVisible();
  await expect(page.getByText(/ATH-[0-9A-F]{10}/)).toBeVisible();
});

test("an invalid Egyptian phone number is rejected", async ({ page }) => {
  await page.goto("/en/shop");
  await page.getByRole("heading", { level: 3 }).first().click();
  await page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL)$/ }).and(page.locator(":not([disabled])")).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/en/checkout");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("Governorate").selectOption("Cairo");
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Street").fill("Test street 1");
  await page.getByRole("button", { name: "Confirm order" }).click();
  await expect(page.getByText(/valid Egyptian mobile number/)).toBeVisible();
});
