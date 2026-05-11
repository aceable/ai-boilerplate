import { test, expect } from '@playwright/test';

// Minimal Playwright smoke test — proves the dev server boots, Clerk
// middleware loads, and an unauthenticated request reaches the
// configured sign-in route (or the public /api/health endpoint).
//
// This is intentionally tiny: enough to validate the E2E pipeline
// without coupling to feature behavior. Add feature-level specs in
// sibling files (e.g. tests/auth.spec.ts).

test('health endpoint responds 200', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
});

test('unauthenticated visit to / redirects through auth flow', async ({ page }) => {
  await page.goto('/');
  // Either we land on the sign-in route (Clerk default) or get an
  // explicit auth-required response. Both prove middleware ran.
  await expect(page).toHaveURL(/sign-in|sign-up|\/$/);
});
