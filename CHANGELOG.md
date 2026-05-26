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
- `/sync-template` skill bundled in `.agents/skills/sync-template/` (auto-linked into `.claude/skills/` by `postinstall`). Automates the remote-add + branch + `--allow-unrelated-histories` merge dance for child repos. **Post-merge audit checklist is not yet implemented in the skill** — run it manually per `AGENTS.md#template-sync`.
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

### Notes for first-time downstream sync (to v1.0.0)

Nothing in v1.0.0 is BREAKING in the semver sense — this is the first tagged release, so no prior template version exists to migrate from. The optional-auth flag and the new files are additive and default to behavior that matches the previous hand-rolled approach (Clerk on whenever keys are present).

What downstream sync agents should expect:

- **Likely merge conflicts** in customized template files: `src/components/header.tsx`, `src/middleware.ts`, `src/app/layout.tsx`, `src/app/client-layout.tsx`, `src/app/page.tsx`. Resolution rule: keep your project-specific UI/branding, adopt the optional-auth flag wiring (read `USER_AUTH_ENABLED` from `src/lib/env.ts` in each).
- **New files that won't conflict** unless you happen to have files at the same paths: `src/lib/env.ts`, `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, `src/components/theme-toggle.tsx`, `.github/workflows/build.yml`, `CHANGELOG.md`, `.template-sync-state` (you create this on first sync).
- **No env var changes required.** If you set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` today, `USER_AUTH_ENABLED` resolves to true and the app behaves as it did before. Add `NEXT_PUBLIC_ENABLE_USER_AUTH=0` only if you want the new public-site mode.
- **Adopt `src/lib/env.ts` opportunistically.** Not required — your existing `process.env.*` reads keep working. But consolidating into the new module is a one-time cleanup worth doing during this sync, not a separate PR.

---

## Release tagging

When cutting a release on this template:

```bash
git tag -a v1.x.0 -m "Short release summary"
git push origin v1.x.0
```

Move the entries above from `[Unreleased]` into a new `## [v1.x.0] - YYYY-MM-DD` section.
