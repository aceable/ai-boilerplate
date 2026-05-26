# Changelog

Notable changes to this template. Child repos using this template should consult this file before each sync (see [Template Sync](AGENTS.md#template-sync) in `AGENTS.md`).

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/). Tag releases on `main` (`v1.4.0`, `v2.0.0`, etc.) so child repos can `git log v1.x..v2.0.0 -- CHANGELOG.md` cleanly.

Headings:
- `Added` — new features
- `Changed` — non-breaking behavior changes
- `Deprecated` — soon-to-be removed
- `Removed`
- `Fixed`
- `Security`
- `BREAKING` — anything a child repo must act on during a sync (env-var renames, file moves, dep majors, auth-flow changes, config-shape changes). Include a migration note.

---

## [Unreleased]

### Added

- Optional auth flag `NEXT_PUBLIC_ENABLE_USER_AUTH` with graceful fallback when Clerk keys are missing — clone + `npm run dev` boots without any env setup.
- `src/lib/env.ts` centralizes all env-derived flags (`USER_AUTH_ENABLED`, `IS_DEV`, `IS_PLAYWRIGHT`, `DATABASE_URL`).
- `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` routes mounting Clerk's `<SignIn />` / `<SignUp />`.
- System-aware theme with toggle in top-right header (`src/components/theme-toggle.tsx`).
- `.github/workflows/build.yml` — always-on `next build` smoke test on PRs and main pushes, secret-free.
- `CHANGELOG.md` and Template Sync section in `AGENTS.md` documenting the sync + audit flow.
- `packageManager` field in `package.json` (npm 11.12.1) so Railway/nixpacks stops inferring.

### Changed

- `AGENTS.md`: hoisted doc-style principles to the top; tightened Auth Setup section; added Theme + Template Sync sections.
- `railway.json` `startCommand` guards `db:migrate` behind `DATABASE_URL` presence so keyless smoke deploys succeed.
- Homepage rewritten to reflect optional auth, system theme, Railway preference, and to remove hallucinated slash-command references.
- `.template-source` updated from `aceable-ai/ai-boilerplate` to `aceable/ai-boilerplate` after the GitHub org transfer.
- `.gitignore`: added `!.env.example` exception so the template tracks the example file.

### BREAKING

- **`ENABLE_USER_AUTH` → `NEXT_PUBLIC_ENABLE_USER_AUTH`**. The flag must be prefixed `NEXT_PUBLIC_` so it's inlined into the client bundle; otherwise server and client disagree on `USER_AUTH_ENABLED` and Clerk's `<SignedIn>`/`<SignedOut>` throw at runtime. *Migration:* rename the env var in `.env.local` and on every hosting platform (Railway, Vercel, etc.). Redeploy.
- **`src/lib/auth-config.ts` removed; use `src/lib/env.ts`.** Imports change from `@/lib/auth-config` to `@/lib/env`. *Migration:* `grep -rn 'auth-config' src/` and replace each import path.

---

## Release tagging

When cutting a release on this template:

```bash
git tag -a v1.x.0 -m "Short release summary"
git push origin v1.x.0
```

Move the entries above from `[Unreleased]` into a new `## [v1.x.0] - YYYY-MM-DD` section.
