// Single source of truth for whether Clerk-backed user auth is active.
//
// Resolution order:
//   1. NEXT_PUBLIC_ENABLE_USER_AUTH=0 (or "false") — auth OFF regardless of keys.
//      Use this for public sites that should never gate users.
//   2. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing/blank — auth OFF (graceful fallback).
//      Lets a freshly-cloned repo boot via `npm run dev` with no env setup at all.
//   3. Otherwise — auth ON. Middleware protects routes, ClerkProvider wraps the tree,
//      sign-in/user buttons render.
//
// IMPORTANT: both env vars MUST be NEXT_PUBLIC_* so they're inlined at build time.
// Without that, the server and client bundles can disagree — the server skips
// <ClerkProvider> while the client still renders <SignedIn>/<SignedOut>, which
// throws at runtime ("can only be used within <ClerkProvider />").

const flagAllowsAuth =
  process.env['NEXT_PUBLIC_ENABLE_USER_AUTH'] !== '0' &&
  process.env['NEXT_PUBLIC_ENABLE_USER_AUTH']?.toLowerCase() !== 'false';

const hasClerkPublishableKey =
  !!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']?.trim();

export const USER_AUTH_ENABLED = flagAllowsAuth && hasClerkPublishableKey;
