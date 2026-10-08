# E2E Testing

## Auth Bypass

Clerk auth is bypassed in Playwright tests via `PLAYWRIGHT_TESTING=true`, set automatically in `tests/global-setup.ts`. The proxy honors it in any non-production build; production builds compile `IS_PLAYWRIGHT` to `false`.

The gate is `IS_PLAYWRIGHT` in `src/lib/env.ts`, checked first in `src/proxy.ts`.

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
