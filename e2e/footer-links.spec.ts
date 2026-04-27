/**
 * Footer-links smoke test.
 *
 * Asserts that:
 *   1. Every Week 4 footer link resolves with a 200 response.
 *   2. Each landing page renders an h1.
 *   3. The footer no longer contains an "Impact Stories" link.
 */
import { test, expect, type Page } from '@playwright/test';

const FOOTER_ROUTES: { path: string; label: RegExp }[] = [
  { path: '/about', label: /about/i },
  { path: '/how-it-works', label: /how it works/i },
  { path: '/trust-safety', label: /trust/i },
  { path: '/transparency', label: /transparency/i },
  { path: '/help', label: /help/i },
  { path: '/organizer-guidelines', label: /organizer/i },
  { path: '/contact', label: /contact/i },
];

async function visitAndAssert(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response, `Page ${path} responded`).not.toBeNull();
  expect(
    response!.status(),
    `Page ${path} returned non-2xx`,
  ).toBeGreaterThanOrEqual(200);
  expect(response!.status(), `Page ${path} returned ${response!.status()}`).toBeLessThan(400);

  // Every page must render at least one h1 element with non-empty text.
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible({ timeout: 10_000 });
  const headingText = (await heading.textContent())?.trim();
  expect(headingText, `Page ${path} h1 was empty`).toBeTruthy();
}

test.describe('Footer links', () => {
  for (const { path } of FOOTER_ROUTES) {
    test(`${path} resolves and renders`, async ({ page }) => {
      await visitAndAssert(page, path);
    });
  }

  test('footer has no Impact Stories link', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const impactLinks = footer.getByText(/impact stories/i);
    await expect(impactLinks).toHaveCount(0);
  });

  test('footer links all use anchor tags (no inert spans)', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    for (const { path } of FOOTER_ROUTES) {
      const anchor = footer.locator(`a[href="${path}"]`);
      await expect(anchor, `Footer should have an <a href="${path}">`).toHaveCount(1);
    }
  });
});
