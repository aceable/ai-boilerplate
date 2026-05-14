import { test, expect } from '@playwright/test';

test.describe('Lifecycle Weekly Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lifecycle');
  });

  // ── Page structure ──────────────────────────────────────────────────────────

  test('renders the page header', async ({ page }) => {
    const header = page.getByTestId('lifecycle-header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('Lifecycle Weekly Dashboard');
    await expect(header).toContainText('Performance Marketing');
  });

  test('shows the period banner as the dominant element below the title', async ({ page }) => {
    const banner = page.getByTestId('period-banner');
    await expect(banner).toBeVisible();
    // Should contain a Mon–Sun date range
    await expect(banner).toContainText('–');
    await expect(banner).toContainText('Auto-resolved');
  });

  // ── All 14 metric cards present ─────────────────────────────────────────────

  const cards = [
    // Volume
    'card-total-revenue',
    'card-total-orders',
    'card-emails-sent',
    'card-sms-sent',
    'card-push-delivered',
    // Engagement
    'card-email-open-rate',
    'card-email-click-rate',
    'card-unsubscribe-rate',
    // Channel revenue
    'card-email-revenue',
    'card-email-rpk',
    'card-sms-revenue',
    'card-sms-rpk',
    'card-push-revenue',
    'card-push-rpk',
  ];

  for (const testId of cards) {
    test(`card "${testId}" is visible with MoM and YoY badges`, async ({ page }) => {
      const card = page.getByTestId(testId);
      await expect(card).toBeVisible();
      await expect(card).toContainText('MoM');
      await expect(card).toContainText('YoY');
    });
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  test('Volume section renders 5 cards', async ({ page }) => {
    const section = page.getByTestId('section-volume');
    await expect(section).toBeVisible();
    await expect(section.getByTestId(/^card-/)).toHaveCount(5);
  });

  test('Email Engagement section renders 3 cards', async ({ page }) => {
    const section = page.getByTestId('section-engagement');
    await expect(section).toBeVisible();
    await expect(section.getByTestId(/^card-/)).toHaveCount(3);
  });

  test('Revenue by Channel section has Email, SMS, and Push blocks', async ({ page }) => {
    await expect(page.getByTestId('channel-email')).toBeVisible();
    await expect(page.getByTestId('channel-sms')).toBeVisible();
    await expect(page.getByTestId('channel-push')).toBeVisible();
  });

  // ── RpK sub-labels ───────────────────────────────────────────────────────────

  test('Email RpK card shows "per 1,000 sent" sub-label', async ({ page }) => {
    await expect(page.getByTestId('card-email-rpk')).toContainText('per 1,000 sent');
  });

  test('SMS RpK card shows "per 1,000 sent" sub-label', async ({ page }) => {
    await expect(page.getByTestId('card-sms-rpk')).toContainText('per 1,000 sent');
  });

  test('Push RpK card shows "per 1,000 delivered" sub-label', async ({ page }) => {
    await expect(page.getByTestId('card-push-rpk')).toContainText('per 1,000 delivered');
  });

  // ── Delta color correctness ──────────────────────────────────────────────────

  test('Unsubscribe Rate uses inverted color logic (favorable = down)', async ({ page }) => {
    // Mock data has momDelta: 0.003 (positive = unfavorable for unsub rate → red)
    const card = page.getByTestId('card-unsubscribe-rate');
    const momBadge = card.locator('span.rounded-full').first();
    await expect(momBadge).toHaveClass(/text-red/);
  });

  // ── Filter bar ───────────────────────────────────────────────────────────────

  test('filter bar renders brand and vertical toggles', async ({ page }) => {
    const bar = page.getByTestId('filter-bar');
    await expect(bar).toBeVisible();
    for (const brand of ['All', 'Aceable', 'DriversEd.com', 'PrepAgent', 'iDriveSafely']) {
      await expect(bar.getByTestId(`filter-brand-${brand.toLowerCase().replace(/[\s.]/g, '-')}`)).toBeVisible();
    }
    for (const vertical of ['All', 'Driving', 'Insurance', 'Mortgage', 'Real Estate']) {
      await expect(bar.getByTestId(`filter-vertical-${vertical.toLowerCase().replace(/[\s.]/g, '-')}`)).toBeVisible();
    }
  });

  test('selecting a brand updates the URL and re-renders', async ({ page }) => {
    await page.getByTestId('filter-brand-aceable').click();
    await page.waitForURL(/brand=Aceable/);
    await expect(page.getByTestId('section-volume')).toBeVisible();
  });

  test('selecting a vertical updates the URL and re-renders', async ({ page }) => {
    await page.getByTestId('filter-vertical-driving').click();
    await page.waitForURL(/vertical=Driving/);
    await expect(page.getByTestId('section-volume')).toBeVisible();
  });

  test('"All" removes the param from the URL', async ({ page }) => {
    await page.getByTestId('filter-brand-aceable').click();
    await page.waitForURL(/brand=Aceable/);
    await page.getByTestId('filter-brand-all').click();
    await page.waitForURL((url) => !url.toString().includes('brand='));
    await expect(page).not.toHaveURL(/brand=/);
  });

  // ── Responsive layout ────────────────────────────────────────────────────────

  test('renders correctly at 375px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByTestId('lifecycle-header')).toBeVisible();
    await expect(page.getByTestId('card-total-revenue')).toBeVisible();
  });

  test('renders correctly at 768px (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('lifecycle-header')).toBeVisible();
    await expect(page.getByTestId('section-volume')).toBeVisible();
  });

  test('renders correctly at 1280px (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId('lifecycle-header')).toBeVisible();
    await expect(page.getByTestId('section-channel-revenue')).toBeVisible();
  });
});
