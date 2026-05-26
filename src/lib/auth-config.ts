// Single source of truth for whether Clerk-backed user auth is active.
//
// Resolution order:
//   1. ENABLE_USER_AUTH=0 (or "false") — auth OFF regardless of keys.
//      Use this for public sites that should never gate users.
//   2. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing/blank — auth OFF (graceful fallback).
//      Lets a freshly-cloned repo boot via `npm run dev` with no env setup at all.
//   3. Otherwise — auth ON. Middleware protects routes, ClerkProvider wraps the tree,
//      sign-in/user buttons render.
//
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is inlined at build time, so this evaluates
// identically on the server and in the client bundle.

const flagAllowsAuth =
  process.env['ENABLE_USER_AUTH'] !== '0' &&
  process.env['ENABLE_USER_AUTH']?.toLowerCase() !== 'false';

const hasClerkPublishableKey =
  !!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']?.trim();

export const USER_AUTH_ENABLED = flagAllowsAuth && hasClerkPublishableKey;
