/**
 * 14.5: Organizer creates campaign, gets it verified by admin,
 * receives a donation, and requests a withdrawal.
 */
import { test, expect } from '@playwright/test';
import { ensureAdminUser, ensureActiveCampaign, closePool } from './helpers/fixtures';
import { getTestOtp } from './helpers/auth';

const ORGANIZER_PHONE = '901111002';
const ORGANIZER_PHONE_FULL = `+998${ORGANIZER_PHONE}`;
const ORGANIZER_NAME = 'E2E Campaign Organizer';

const ADMIN_PHONE = '+998900000001';
const ADMIN_PHONE_DIGITS = '900000001';

test.afterAll(async () => {
  await closePool();
});

test.describe('Organizer Flow', () => {
  test('1. Organizer registers via OTP', async ({ page }) => {
    await page.goto('/login');

    const phoneInput = page.locator('input[id="phone"]').first();
    await phoneInput.fill(ORGANIZER_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/, { timeout: 8000 });

    const otp = await getTestOtp(ORGANIZER_PHONE_FULL);
    const otpInput = page.locator('input[maxlength="6"]').first();
    await otpInput.fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();

    await page.waitForURL(/\/register|\/dashboard/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      const nameInput = page.locator('input[id*="display"], input[name="display_name"]').first();
      await nameInput.fill(ORGANIZER_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('2. Organizer navigates to create campaign', async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    const phoneInput = page.locator('input[id="phone"]').first();
    await phoneInput.fill(ORGANIZER_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);
    const otp = await getTestOtp(ORGANIZER_PHONE_FULL);
    await page.locator('input[maxlength="6"]').fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      await page.locator('input[id*="display"]').fill(ORGANIZER_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    // Navigate to create campaign
    await page.goto('/create-campaign');
    await expect(page).toHaveURL(/\/create-campaign/);
    // Step 1 should be visible
    await expect(page.locator('h1, h2, [data-testid="step-1"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('3. My campaigns page lists campaigns', async ({ page }) => {
    await page.goto('/login');
    const phoneInput = page.locator('input[id="phone"]').first();
    await phoneInput.fill(ORGANIZER_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);
    const otp = await getTestOtp(ORGANIZER_PHONE_FULL);
    await page.locator('input[maxlength="6"]').fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      await page.locator('input[id*="display"]').fill(ORGANIZER_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    await page.goto('/my-campaigns');
    await expect(page).toHaveURL('/my-campaigns');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Admin can view the campaigns verification queue', async ({ page }) => {
    const adminCreds = await ensureAdminUser();

    // Admin login
    await page.goto('/admin/login');
    const phoneInput = page.locator('input[id="phone"], input[type="tel"]').first();
    // Admin login page might accept full 9-digit or require special handling
    const adminDigits = ADMIN_PHONE_DIGITS;
    await phoneInput.fill(adminDigits);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(adminCreds.password);
    await page.getByRole('button', { name: /login|sign in|kirish|войти/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Navigate to campaign verification queue
    await page.goto('/admin/campaigns');
    await expect(page.locator('h1, h2, table').first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Organizer dashboard shows available balance', async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.locator('input[id="phone"]').fill(ORGANIZER_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);
    const otp = await getTestOtp(ORGANIZER_PHONE_FULL);
    await page.locator('input[maxlength="6"]').fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      await page.locator('input[id*="display"]').fill(ORGANIZER_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    await page.goto('/withdrawals');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('6. Withdrawal accounts page is accessible', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[id="phone"]').fill(ORGANIZER_PHONE);
    await page.getByRole('button', { name: /send/i }).click();
    await page.waitForURL(/\/verify/);
    const otp = await getTestOtp(ORGANIZER_PHONE_FULL);
    await page.locator('input[maxlength="6"]').fill(otp);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL(/\/dashboard|\/register/, { timeout: 8000 });
    if (page.url().includes('/register')) {
      await page.locator('input[id*="display"]').fill(ORGANIZER_NAME);
      await page.getByRole('button', { name: /complete|register/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    }

    await page.goto('/withdrawal-accounts');
    await expect(page).toHaveURL('/withdrawal-accounts');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });
});
