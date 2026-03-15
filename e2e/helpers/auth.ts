/**
 * E2E Auth helpers.
 * Provides reusable page-level login flows.
 */
import type { Page } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3001/api';

/**
 * Retrieves the OTP stored in Redis for a given phone number
 * via the test-only endpoint.
 */
export async function getTestOtp(phone: string): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/auth/test-otp/${encodeURIComponent(phone)}`);
  if (!response.ok) {
    throw new Error(`Failed to retrieve test OTP for ${phone}: ${response.status}`);
  }
  const data = await response.json() as { otp: string };
  return data.otp;
}

/**
 * Completes the full phone OTP login flow from the login page.
 * Navigates to /login, enters the phone, gets the OTP, enters it.
 * Returns without completing registration (for existing users).
 */
export async function loginWithOtp(page: Page, phone: string): Promise<void> {
  await page.goto('/login');

  // Enter phone number (input accepts 9 digits after +998 prefix)
  const phoneInput = page.locator('input[name="phone"], input[placeholder*="XX"], input[type="tel"]').first();
  // Strip +998 prefix for input
  const digits = phone.replace('+998', '');
  await phoneInput.fill(digits);
  await page.getByRole('button', { name: /send|yuborish|отправить/i }).click();

  // Wait for OTP input to appear
  await page.waitForSelector('input[name="otp"], input[placeholder*="6"], input[maxlength="6"]', { timeout: 5000 });

  // Get OTP from test endpoint
  const otp = await getTestOtp(phone);

  // Enter OTP
  const otpInput = page.locator('input[name="otp"], input[placeholder*="6"], input[maxlength="6"]').first();
  await otpInput.fill(otp);
  await page.getByRole('button', { name: /verify|tasdiqlash|подтвердить/i }).click();
}

/**
 * Registers a new user with OTP flow then fills the registration form.
 */
export async function registerNewUser(
  page: Page,
  phone: string,
  displayName: string,
): Promise<void> {
  await loginWithOtp(page, phone);

  // Should be on register page now
  await page.waitForURL('/register', { timeout: 5000 });

  // Fill display name
  const nameInput = page.locator('input[name="display_name"], input[id*="display"], input[placeholder*="name" i]').first();
  await nameInput.fill(displayName);

  // Submit
  await page.getByRole('button', { name: /complete|finish|register|ro'yxat|завершить/i }).click();

  // Wait to land on dashboard
  await page.waitForURL('/dashboard', { timeout: 8000 });
}

/**
 * Logs in as admin using password-based login.
 */
export async function loginAsAdmin(
  page: Page,
  phone: string,
  password: string,
): Promise<void> {
  await page.goto('/login');

  // Look for admin login link/tab
  const adminLink = page.locator('a[href*="admin"], button:has-text("Admin"), [data-testid="admin-login"]');
  if (await adminLink.isVisible()) {
    await adminLink.click();
  }

  // Navigate directly to admin login page
  await page.goto('/admin/login');

  const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
  const digits = phone.replace('+998', '');
  await phoneInput.fill(digits);

  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.fill(password);

  await page.getByRole('button', { name: /login|sign in|kirish|войти/i }).click();

  await page.waitForURL('/admin', { timeout: 8000 });
}
