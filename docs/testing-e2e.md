# E2E Testing

## Auth Bypass

Clerk auth is bypassed in Playwright tests via `PLAYWRIGHT_TESTING=true`, set automatically in `tests/global-setup.ts`. The proxy honors it in any non-production build; production builds compile `IS_PLAYWRIGHT` to `false`.

```typescript
// src/lib/env.ts
export const IS_PLAYWRIGHT = process.env['PLAYWRIGHT_TESTING'] === 'true' && !IS_PROD;

// src/proxy.ts
if (IS_PLAYWRIGHT) return; // skip auth
```

If tests are failing with auth redirects, verify `global-setup.ts` is setting the variable and the server is not a production build.

## data-testid

All element selection uses `data-testid` exclusively — no CSS selectors, no `getByText`.

```typescript
// ✅
await page.getByTestId('submit-button').click();

// ❌
await page.locator('button.bg-blue-500').click();
await page.getByText('Submit').click();
```

Add `data-testid` when building the component, not as a follow-up.
