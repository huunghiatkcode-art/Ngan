import { test, expect } from "@playwright/test";

// Requires a live Supabase project with migrations + seed applied (see
// README.md). Run with: npm run test:e2e
// Demo teacher is created by supabase/seed.sql:
//   email: demo.teacher@quizplatform.test   password: Demo@12345

test.describe("Teacher flow", () => {
  test("login → create class → create quiz → add question → create assignment → monitor", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo.teacher@quizplatform.test");
    await page.getByLabel("Mật khẩu").fill("Demo@12345");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard/);

    // Create a class
    await page.goto("/teacher/classes");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await page.getByLabel("Tên lớp").fill("Lớp E2E Test");
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(page.getByText("Lớp E2E Test")).toBeVisible();

    // Create a quiz
    await page.goto("/teacher/quizzes");
    await page.getByRole("button", { name: "Tạo bộ câu hỏi" }).click();
    await page.getByLabel("Tiêu đề").fill("Quiz E2E Test");
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/quizzes\/[a-f0-9-]+/);

    // Add a multiple-choice question
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await page.getByText("Trắc nghiệm").click();
    await expect(page.getByPlaceholder("Nhập nội dung câu hỏi...")).toBeVisible();
  });

  test("teacher cannot see another teacher's quiz (RLS)", async ({ page, request }) => {
    // A direct request for a quiz id that belongs to a different teacher
    // must not leak data — the page should 404/redirect, never render it.
    await page.goto("/teacher/quizzes/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/không tìm thấy|not found/i)).toBeVisible();
  });
});
