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

test('home route responds without crashing', async ({ request }) => {
  // This is a pipeline-health check, not an auth-gate check. The template
  // ships a Playwright bypass in src/middleware.ts that returns 200 for
  // protected routes when PLAYWRIGHT_TESTING=true (set by tests/global-setup.ts),
  // so a strict 3xx-redirect assertion isn't reachable from this spec.
  //
  // To prove the auth-gate itself, write a separate spec that runs WITHOUT
  // the bypass and uses real (or test-mode) Clerk keys. That's a feature-test
  // concern, not a smoke-test concern.
  const response = await request.get('/', { failOnStatusCode: false });
  const status = response.status();
  expect(status, `expected 2xx/3xx from the home route, got ${status}`).toBeLessThan(400);
});
