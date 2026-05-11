import { test, expect } from '@playwright/test';

// Minimal Playwright smoke spec — validates the pipeline (build →
// dev server boot → request handling) without depending on a real
// browser navigation. Page-level browser tests are deliberately
// skipped here because Chromium loopback resolution is flaky on
// shared CI runners and the cause is orthogonal to this template's
// own behavior. Add real page specs (sign-in flow, etc.) once the
// fork's runner is known.

test('health endpoint returns 200', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
});

test('protected route redirects unauthenticated request to sign-in', async ({ request }) => {
  // Clerk middleware should respond with a 3xx redirecting to /sign-in
  // (the only public route besides /api/health). Disable redirect-following
  // so we can assert on the redirect itself.
  const response = await request.get('/', { maxRedirects: 0, failOnStatusCode: false });
  const status = response.status();
  expect(status, `expected 3xx redirect, got ${status}`).toBeGreaterThanOrEqual(300);
  expect(status).toBeLessThan(400);
  const location = response.headers()['location'] ?? '';
  expect(location, `expected Location header pointing at sign-in, got "${location}"`).toMatch(/sign-in/);
});
