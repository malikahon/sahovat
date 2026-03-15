/**
 * 14.4: Guest browses campaigns, registers, donates, and gets a receipt.
 *
 * Prerequisites:
 * - Backend running on port 3001 in test mode (NODE_ENV=test)
 * - Frontend running on port 3000
 * - An active campaign seeded in the test DB (via fixtures)
 */
import { test, expect } from '@playwright/test';
import { ensureActiveCampaign, closePool } from './helpers/fixtures';
import { getTestOtp } from './helpers/auth';

// Unique phone for this test run so it doesn't conflict with other tests
const DONOR_PHONE = '901111001';
const DONOR_PHONE_FULL = `+998${DONOR_PHONE}`;
const DONOR_NAME = 'E2E Donor Ali';

test.afterAll(async () => {
  await closePool();
});

test.describe('Guest Donor Flow', () => {
  test('1. Landing page loads with campaigns section', async ({ page }) => {
    await page.goto('/');
    // Page title or heading should be visible
    await expect(page).toHaveTitle(/sahovat/i);
    // Landing page should have some content
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });

  test('2. Browse campaigns page loads', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page).toHaveURL('/campaigns');
    // Should have a heading or campaigns list
    await expect(page.locator('h1, h2, [data-testid="campaigns-list"], .campaign-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Campaign detail page shows donate button', async ({ page }) => {
    const campaign = await ensureActiveCampaign();

    await page.goto(`/campaigns/${campaign.id}`);
    // Page should load and show campaign info
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Should have a Donate button
    const donateBtn = page.getByRole('button', { name: /donate|xayriya|пожертвовать/i });
    await expect(donateBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Clicking Donate while logged out redirects to login', async ({ page }) => {
    const campaign = await ensureActiveCampaign();
    await page.goto(`/campaigns/${campaign.id}`);

    const donateBtn = page.getByRole('button', { name: /donate|xayriya|пожертвовать/i }).first();
    await expect(donateBtn).toBeVisible({ timeout: 5000 });
    await donateBtn.click();

    // Should redirect to login
    await page.waitForURL(/\/login|\/auth/, { timeout: 8000 });
  });

  test('5. User registers via OTP flow', async ({ page }) => {
    // Go to login
    await page.goto('/login');

    // Enter phone (9 digits, no +998 prefix)
    const phoneInput = page.locator('input[id="phone"], input[type="tel"]').first();
    await phoneInput.fill(DONOR_PHONE);

    // Submit
    await page.getByRole('button', { name: /send|yuborish|отправить/i }).click();

    // Should redirect to verify page
    await page.waitForURL(/\/verify/, { timeout: 8000 });

    // Get OTP from test endpoint
    const otp = await getTestOtp(DONOR_PHONE_FULL);
    expect(otp).toMatch(/^\d{6}$/);

    // Enter OTP
    const otpInput = page.locator('input[name="otp"], input[id="otp"], input[placeholder*="6"], input[maxlength="6"]').first();
    await otpInput.fill(otp);
    await page.getByRole('button', { name: /verify|tasdiqlash|подтвердить/i }).click();

    // New user → should land on register page
    await page.waitForURL(/\/register/, { timeout: 8000 });

    // Fill display name
    const nameInput = page.locator('input[name="display_name"], input[id*="display"], input[id="displayName"]').first();
    await nameInput.fill(DONOR_NAME);

    // Submit registration
    await page.getByRole('button', { name: /complete|register|finish|ro'yxat|завершить/i }).click();

    // Should land on dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('6. Authenticated user can open donation flow on campaign', async ({ page }) => {
    const campaign = await ensureActiveCampaign();

    // Login first
    await page.goto('/login');
    const phoneInput = page.locator('input[id="phone"]').first();
    await phoneInput.fill(DONOR_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);

    const otp = await getTestOtp(DONOR_PHONE_FULL);
    const otpInput = page.locator('input[maxlength="6"]').first();
    await otpInput.fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();

    // May land on register or dashboard depending on if user already registered
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      const nameInput = page.locator('input[id*="display"], input[name="display_name"]').first();
      await nameInput.fill(DONOR_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    // Navigate to the active campaign
    await page.goto(`/campaigns/${campaign.id}`);

    // Click Donate
    const donateBtn = page.getByRole('button', { name: /donate|xayriya/i }).first();
    await expect(donateBtn).toBeVisible({ timeout: 5000 });
    await donateBtn.click();

    // The donation sheet should open
    await expect(page.getByText(/10,000|50,000/)).toBeVisible({ timeout: 5000 });
  });

  test('7. My Donations page is accessible after login', async ({ page }) => {
    // Quick login as the registered user
    await page.goto('/login');
    const phoneInput = page.locator('input[id="phone"]').first();
    await phoneInput.fill(DONOR_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);
    const otp = await getTestOtp(DONOR_PHONE_FULL);
    const otpInput = page.locator('input[maxlength="6"]').first();
    await otpInput.fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      const nameInput = page.locator('input[id*="display"], input[name="display_name"]').first();
      await nameInput.fill(DONOR_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    // Navigate to my donations
    await page.goto('/my-donations');
    await expect(page).toHaveURL('/my-donations');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });
});
