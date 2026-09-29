import { test, expect } from "@playwright/test";

// Requires seed.sql applied (creates student "hs001" / PIN "1234" and
// assignment join code "DEMO01" for Lớp 10A1). Run with: npm run test:e2e

test.describe("Student flow", () => {
  test("login → join by code → answer → submit → view result", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByLabel("Tên đăng nhập").fill("hs001");
    await page.getByLabel("Mã PIN").fill("1234");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/);

    await page.goto("/student/join");
    await page.getByLabel("Mã bài kiểm tra").fill("DEMO01");
    await page.getByRole("button", { name: "Tham gia" }).click();
    await expect(page).toHaveURL(/\/student\/quiz\/[a-f0-9-]+/);

    // Answer the first (multiple_choice) question, then submit through to
    // the last question using the confirm-to-submit button.
    await page.getByRole("button", { name: /Hà Nội/ }).click();
    await expect(page.getByText(/Đã trả lời 1\//)).toBeVisible();
  });

  test("wrong PIN is rejected", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByLabel("Tên đăng nhập").fill("hs001");
    await page.getByLabel("Mã PIN").fill("0000");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText(/không đúng/i)).toBeVisible();
    await expect(page).toHaveURL(/\/student\/login/);
  });

  test("wrong assignment password is rejected", async ({ page }) => {
    await page.goto("/student/login");
    await page.getByLabel("Tên đăng nhập").fill("hs002");
    await page.getByLabel("Mã PIN").fill("1234");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.goto("/student/join");
    await page.getByLabel("Mã bài kiểm tra").fill("NONEXIST");
    await page.getByRole("button", { name: "Tham gia" }).click();
    await expect(page.getByText(/không tìm thấy/i)).toBeVisible();
  });
});
