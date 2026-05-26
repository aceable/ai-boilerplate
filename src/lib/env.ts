// Centralized env-var access. Components and lib code should import from here
// instead of touching `process.env.*` directly — gives us a single place to
// document defaults, parse semantics, and add validation later.
//
// IMPORTANT: any value the CLIENT bundle needs to read MUST be prefixed
// `NEXT_PUBLIC_` (Next.js inlines those at build time). Server-only flags
// can use any name.

// ───────── Runtime mode ─────────

export const IS_DEV = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';
export const IS_PROD = process.env.NODE_ENV === 'production';

// True during Playwright E2E runs. Used to bypass auth + other dev-time gates.
// Gated to non-prod so it can never enable in a deployed environment.
export const IS_PLAYWRIGHT =
  process.env['PLAYWRIGHT_TESTING'] === 'true' && !IS_PROD;

// ───────── Auth (Clerk) ─────────

// Resolution order for USER_AUTH_ENABLED:
//   1. NEXT_PUBLIC_ENABLE_USER_AUTH=0 (or "false") — auth OFF regardless of keys.
//   2. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing/blank — auth OFF (graceful local
//      dev: clone + `npm run dev` Just Works without any env setup).
//   3. Otherwise — auth ON. Middleware protects, ClerkProvider wraps, sign-in/
//      user buttons render.

// Strip whitespace + surrounding quotes so values like `"0"` or ` 0 `
// (sometimes returned by hosting providers) parse correctly.
const rawAuthFlag = (process.env['NEXT_PUBLIC_ENABLE_USER_AUTH'] ?? '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .toLowerCase();

const flagAllowsAuth = !['0', 'false', 'no', 'off'].includes(rawAuthFlag);

const hasClerkPublishableKey =
  !!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']?.trim();

export const USER_AUTH_ENABLED = flagAllowsAuth && hasClerkPublishableKey;

// ───────── Database ─────────

// Placeholder URL keeps the drizzle client constructible in environments
// without a real DB (Playwright, public sites). Runtime queries will fail
// loud if anyone actually hits the DB without a real URL set.
export const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export const HAS_DATABASE_URL = !!process.env['DATABASE_URL']?.trim();
