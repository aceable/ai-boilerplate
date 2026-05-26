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
- `.github/workflows/build.yml` — always-on `next build` smoke test on PRs and main pushes, secret-free with a shape-valid Clerk placeholder.
- `CHANGELOG.md` (this file) and `## Template Sync` section in `AGENTS.md` documenting the sync + post-merge audit flow.
- `## CHANGELOG.md — update on every user-visible PR` subsection in `AGENTS.md` Workflow with a routing table (Added/Changed/Fixed/Security/Removed/BREAKING) so future PRs land changelog entries deterministically.
- README onboarding prompt: Railway CLI deploy step with `pk_test_*` vs `pk_live_*` domain-lock callout.
- `packageManager` field in `package.json` (npm 11.12.1) so Railway/nixpacks stops inferring.

### Changed

- `AGENTS.md`: hoisted doc-style principles (terse, progressive disclosure, 80/20, no drift surfaces, one source of truth) to the top; tightened Auth Setup section; added Theme, Template Sync, and per-PR CHANGELOG rule sections; updated CI section to document both `build.yml` and `ci.yml` plus how to disable on cost-sensitive forks.
- Homepage rewritten to reflect optional auth, system theme, Railway preference; removed hallucinated `/dev`, `/lint`, `/build`, `/db-push` slash-command references that pointed at a non-existent `.claude/commands/` dir; fixed `AGENT.md` typo to `AGENTS.md`; replaced broken `/api/README.md` Next.js `Link` with a plain file pointer.
- README onboarding prompt: Node version corrected from v20+ to v24 (matches `.nvmrc`); `nvm install` invocation reads `.nvmrc` instead of pinning `20`.
- `.template-source` updated from `aceable-ai/ai-boilerplate` to `aceable/ai-boilerplate` after the GitHub org transfer.
- `.gitignore`: added `!.env.example` exception so the template tracks the example file.

### Fixed

- `railway.json` `startCommand` previously chained `npm run db:migrate && next start`; without `DATABASE_URL` the migrate step failed and `next start` never ran, breaking the healthcheck. Now guarded by `if [ -n "$DATABASE_URL" ]; then ...` so keyless smoke deploys succeed.

### BREAKING

- **`ENABLE_USER_AUTH` → `NEXT_PUBLIC_ENABLE_USER_AUTH`**. The flag must be prefixed `NEXT_PUBLIC_` so it's inlined into the client bundle; otherwise server and client disagree on `USER_AUTH_ENABLED` and Clerk's `<SignedIn>`/`<SignedOut>` throw at runtime. *Migration:* rename the env var in `.env.local` and on every hosting platform (Railway, Vercel, etc.). Redeploy so the new `NEXT_PUBLIC_*` value gets inlined.
- **`src/lib/auth-config.ts` removed; use `src/lib/env.ts`.** Imports change from `@/lib/auth-config` to `@/lib/env`. *Migration:* `grep -rn 'auth-config' src/` and replace each import path.

---

## Release tagging

When cutting a release on this template:

```bash
git tag -a v1.x.0 -m "Short release summary"
git push origin v1.x.0
```

Move the entries above from `[Unreleased]` into a new `## [v1.x.0] - YYYY-MM-DD` section.
