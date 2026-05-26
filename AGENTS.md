# Engineering & AI Standards

> Canonical config for Claude Code, OpenAI Codex, Cursor, and other AI assistants.
> Available as both `AGENTS.md` and `CLAUDE.md` (symlinked). Version: 2026.1

---

## Doc style (applies to every edit of this file and any doc in this repo)

**Terse, declarative, durable.** Each line earns its place. Spec entries, not narrative.

- **Progressive disclosure** — top of every section answers the 80% case in one paragraph. Edge cases, troubleshooting, deeper rationale → linked sub-sections or `docs/*.md`.
- **80/20 rule** — only put something in this file if every AI session needs it. Occasional reference → `docs/`. One-off context → `// Why:` inline comment.
- **No drift surfaces** — file paths, env var names, and config keys must match the code at the time of writing. Re-grep before merging doc edits.
- **No conversational phrasing or UI step-throughs** — they go stale when the underlying tool's UI changes. State the rule, not the click path.
- **One source of truth per fact** — repeating a rule across sections creates drift. Cross-reference instead.

---

## First-Time Setup

Guide the user through these tools in order before anything else:

| Tool | Check | Install |
|------|-------|---------|
| **nvm** | `nvm --version` | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh \| bash` |
| **Node.js** | `node --version` (must match `.nvmrc`) | `nvm install && nvm use` |
| **git** | `git --version` | macOS: `xcode-select --install` · Linux: `sudo apt install git` |
| **GitHub CLI** | `gh auth status` | `npm run setup:gh` |

Then: `npm install` → `cp .env.example .env.local` → fill credentials → `npm run db:push` → `npm run dev`

---

## Auth Setup (Clerk)

Clerk is wired in and protects every route except `/sign-in`, `/sign-up`, `/api/health`. The flag `USER_AUTH_ENABLED` in `src/lib/env.ts` is the single source of truth — middleware, layout, and header all read it.

### Resolution

| Env state | `USER_AUTH_ENABLED` |
|---|---|
| `NEXT_PUBLIC_ENABLE_USER_AUTH=0` (or `false`, `no`, `off`) | `false` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` missing or blank | `false` |
| Otherwise | `true` |

`false` → middleware no-ops, `ClerkProvider` is skipped, header omits sign-in/user buttons. The app boots as a public site with no Clerk runtime loaded.

### Test keys vs production keys (read this before deploying)

Clerk issues two key pairs per instance: **test** (`pk_test_*` / `sk_test_*`) and **production** (`pk_live_*` / `sk_live_*`). Production keys are **domain-locked** server-side by Clerk — they refuse any origin that isn't on the registered production domain. Test keys work on any origin.

| Environment | Keys |
|---|---|
| Local (`localhost`) | `pk_test_*` / `sk_test_*` |
| Railway / Vercel preview / any non-prod URL | `pk_test_*` / `sk_test_*` |
| Production deploy on your real domain | `pk_live_*` / `sk_live_*` |

Using `pk_live_*` against a non-production origin fails with `Clerk: Production Keys are only allowed for domain "<your-prod-domain>"` and breaks the page even when the flag/code is correct. If you're on a company-shared Clerk instance, ask the owner for the test keys for non-prod deploys.

### First-time setup

1. Get keys: company Clerk owner for a shared dev instance, or create one at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Paste into `.env.local`. Restart dev server.
3. Visit `/` → redirects to `/sign-in` → create first user.

To run locally without auth: leave Clerk keys blank, or set `NEXT_PUBLIC_ENABLE_USER_AUTH=0`.

### Deploying

Hosting providers do **not** read `.env.local`. Set vars in the provider's UI before deploying. `NEXT_PUBLIC_*` values are inlined at build time, so **redeploy after changing any of them** — restart alone won't pick up new values.

For Railway specifically, deploy via `railway up` from the repo root after `railway login` + `railway link`.

### Files

- `src/lib/env.ts` — flag resolution
- `src/middleware.ts` — Clerk middleware or no-op
- `src/app/layout.tsx` — conditional `<ClerkProvider>`
- `src/components/header.tsx` — conditional sign-in / user button
- `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk `<SignIn />` / `<SignUp />`

---

## Theme

`next-themes` with `defaultTheme="system"` — follows OS preference on first load; toggle in the top-right header overrides.

### Files

- `src/components/theme-provider.tsx` — wraps `next-themes`
- `src/components/theme-toggle.tsx` — Sun/Moon button, hydration-safe
- `src/app/globals.css` — Tailwind v4 tokens (light + dark) + `tw-animate-css`

---

## Template Sync

This repo was created from [`aceable/ai-boilerplate`](https://github.com/aceable/ai-boilerplate) via `gh repo create --template`. GitHub's "Sync fork" doesn't work for template-clones — they have no parent relationship. Pull updates manually.

The upstream template URL lives in `.template-source` (pre-filled in this template). Child repos additionally maintain `.template-sync-state` — a single-line file holding the SHA of the last template commit they merged. The AI agent running the sync creates this file on the **first** sync and updates it on every subsequent sync.

> **Optional helper:** the `/sync-template` skill (if installed) automates the remote-add + branch + merge dance below. It does **not** currently implement the post-merge audit checklist — run that manually regardless. If the skill isn't installed, follow the steps below verbatim.

### One-time setup (per child repo)

```bash
git remote add template https://github.com/aceable/ai-boilerplate.git
git fetch template
```

Verify with `git remote -v` — you should see both `origin` (your repo) and `template` (the boilerplate).

### Periodic sync (recommended monthly, always on a branch)

```bash
# 1. Make sure your working tree is clean and you're on a fresh branch off main.
git checkout main && git pull
git checkout -b chore/template-sync-$(date +%Y%m%d)

# 2. Fetch the latest template state.
git fetch template

# 3. Capture what changed since your last sync (see audit checklist below).
#    FIRST sync: skip — diff against the merge base picked by git instead.
#    SUBSEQUENT syncs:
#      LAST=$(cat .template-sync-state)
#      git log $LAST..template/main --oneline
#      git diff $LAST..template/main --stat

# 4. Merge — --allow-unrelated-histories is required for template merges.
git merge template/main --allow-unrelated-histories

# 5. Update the sync-state file to the new template HEAD.
git rev-parse template/main > .template-sync-state
git add .template-sync-state && git commit --amend --no-edit

# 6. Run the post-merge audit (next section), resolve conflicts, push, PR.
```

### Post-merge audit (mandatory before opening the PR)

Run this checklist after every template merge. The point is to catch breaking changes in this child repo that the merge alone won't surface.

1. **Read what changed.** `git log $LAST..template/main --oneline` (where `$LAST` = previous content of `.template-sync-state`). Look for `BREAKING:`, `feat!:`, or anything in the upstream `CHANGELOG.md` flagged as a breaking change.
2. **Reinstall + lockfile sanity.** `npm install` (regenerates lockfile after merge). If `package.json` had upstream changes, run `/dependency` to audit each non-patch bump for impact on this child repo's call sites.
3. **Run the build pipeline.**
   - `npm run lint:all` — type errors usually surface here first
   - `npm run test`
   - `npm run build`
   - `npm run test:e2e` (only if upstream changed routing, middleware, or auth)
4. **Diff config files this repo customized.** `git diff HEAD~1 -- .env.example tailwind.config.ts next.config.ts drizzle.config.ts` — if the template added new required env vars or changed a config shape, mirror the change in `.env.local` and (if deploying) the Railway/hosting env.
5. **Verify auth + theme still wire correctly.** Both the optional-auth flag (see [Auth Setup](#auth-setup-clerk)) and the system-theme path. If the upstream changed `src/lib/env.ts` or `src/middleware.ts`, re-confirm `USER_AUTH_ENABLED` resolves as expected.

### Handling major / breaking template versions

The upstream template uses **semver-style git tags** for releases (`v1.0.0`, `v1.1.0`, `v2.0.0`). Tag the breaking releases as majors.

When syncing across a major version boundary (`v1.x` → `v2.x`):

- Stop. Don't merge yet. `git log v1.x..v2.0.0 -- CHANGELOG.md` and read every breaking note.
- Run `/dependency` against the upstream diff — major template versions typically pull in major framework versions (Next.js, Clerk, etc.).
- Split the work: one PR for the framework upgrade (with codemods if available), a separate PR for the template merge itself. Easier to revert.
- Update `.template-sync-state` only after both PRs land and the child repo's tests pass.

### How breaking changes are conveyed (upstream contract)

If you're editing **this** template (not a child repo):

1. **Update `CHANGELOG.md` `[Unreleased]` in every PR.** See [CHANGELOG.md — update on every user-visible PR](#changelogmd--update-on-every-user-visible-pr) for the per-section routing and the BREAKING entry format. This is the per-PR obligation, not a release-time chore.
2. **Tag every release.** `git tag -a v1.4.0 -m "..."` after merging to main; push tags. Move `[Unreleased]` entries into the new tagged section.
3. **Bump major on breaking changes.** `v1.x` → `v2.0.0` is the signal for every child repo to run the major-upgrade flow above, not a passive monthly sync.

---

## Stack

Next.js 15 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · Drizzle ORM · Neon Postgres · Clerk Auth · AI SDK · Railway deployment

---

## Commands

**Dev:**
```bash
npm run dev          # port 3003, Turbopack
npm run build
npm run lint:all     # ESLint + tsc together
```

**Database:**
```bash
npm run db:push      # sync schema to dev DB
npm run db:studio    # visual DB browser
npm run db:generate  # generate migration files
npm run db:migrate   # apply to production
```

**Setup / validation:**
```bash
npm run check         # validate prerequisites
npm run setup         # full first-time setup
npm run setup:gh      # GitHub CLI only
npm run setup:protect # apply default-branch protection (admins only)
npm run scratch:clean
curl localhost:3003/api/health   # health check
```

**Staying in sync with the template:** see [Template Sync](#template-sync) below.

**CI** (two workflows, both default-on):
- `.github/workflows/build.yml` — always-on `next build` smoke test on every PR + push to main. Uses placeholder Clerk env vars so no secrets are required. Catches build-time env failures (e.g. missing `publishableKey`) at PR time.
- `.github/workflows/ci.yml` — `fast-checks` (lint → type-check → secretlint → npm audit) on every push/PR; `e2e-and-build` (Playwright + next build) on non-draft PRs only. Concurrency cancels superseded runs.

To **disable** either workflow on cost-sensitive forks: delete the file, comment out the `on:` triggers, or restrict triggers to `workflow_dispatch` only.

**Git hooks** (auto-installed by `husky` on `npm install`):
- `pre-commit` — blocks commits to `main`/`master`, runs lint-staged + secretlint
- `pre-push` — blocks force-push to `main`/`master`, scans diff for secrets, runs `npm audit --audit-level=high`
- `commit-msg` — enforces Conventional Commits + rejects credential-shaped strings
- Emergency bypass: `SKIP_HUSKY=1 git ...` — use sparingly; no audit trail beyond the stderr warning

---

## Project Structure

```
src/
├── app/              # Next.js App Router (pages, layouts, API routes)
├── components/
│   ├── ui/           # Base components (Button, Input, Dialog…)
│   └── features/     # Feature components
├── lib/              # Utilities, config, AI helpers
│   └── config.ts     # APP_NAME and app-level constants (single source of truth)
├── hooks/            # Custom React hooks
├── middleware.ts      # Clerk auth — protects all routes
└── types/
.scratch/             # Ephemeral experiments — gitignored, never committed
```

---

## Workflow — How We Work

These are non-negotiable behaviors. Follow them in every session.

### Spec-First Development
- Before writing code: understand the user need, identify edge cases, confirm scope.
- Ask "what does done look like?" before opening a file.
- Prefer clarifying questions over assumptions when requirements are ambiguous.

### Branch & Draft PR First
- Every piece of work starts with a branch from latest `main` and an immediate draft PR.
- `git checkout -b feature/name` → stub commit → `gh pr create --draft`
- Never push directly to `main`. When done: `gh pr ready`.

### Atomic Commits
- One logical change per commit. If it needs two sentences to describe, split it.
- Commit every time the build passes and the change is coherent — before pivoting.
- Format: `type(scope): short description` (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`)
- Keep PRs small and focused — one feature or fix per PR.

### CHANGELOG.md — update on every user-visible PR

Downstream repos rely on this file to know what changed since their last template sync. If they don't see it here, they don't catch it. Update `[Unreleased]` in `CHANGELOG.md` **as part of the same PR** — before marking ready for review.

**When to update:**

| PR touches | Add entry under |
|---|---|
| New file/feature in `src/`, new env var, new route, new script | `### Added` |
| Non-breaking change to existing behavior, refactor users would notice, doc/CLI/config tweak | `### Changed` |
| Bug fix that affects downstream behavior | `### Fixed` |
| Security patch (incl. dep audit fixes that close CVEs) | `### Security` |
| Removal of public API, feature, env var, file path | `### Removed` |
| **Anything a child repo must act on during a sync** — env rename, file move, dep major bump, auth-flow change, config-shape change | `### BREAKING` (always with a one-line migration note) |

**When to skip:**

- Internal-only churn no downstream would ever see: comment-only edits, `.scratch/` work, README typo fixes, internal test refactors that don't change test coverage.

**Release-time:**

When cutting a tag (`v1.4.0`, `v2.0.0`), move every entry from `[Unreleased]` to a new `## [v1.x.0] - YYYY-MM-DD` section. Tag pushes signal child repos to run a sync. See [Template Sync](#template-sync) for the downstream side.

### Test With Every Change
Full model in [docs/testing-strategy.md](docs/testing-strategy.md). Rails:

- **Pyramid for server / pure logic** (most unit) — `src/lib/*.test.ts`, `tests/api/*.spec.ts`.
- **Honeycomb for components** (largest integration) — extract logic to `src/lib/`, then `render()` the component in `*.spec.tsx`.
- **E2E is a last resort** — only for browser lifecycle, real network roundtrip, multi-page journeys.
- **Discriminator**: spec calls `render(...)` → integration (`*.spec.tsx`). Otherwise → unit (`*.test.ts`).
- **Tests ship in the same commit** as the code. Untested code is unfinished.
- **Mock at boundaries only** (network, DB, time). Heavy mocking inside a unit means the unit is too big — split it.
- **Name by behavior**, not function: `it('rejects passwords under 8 characters')`.
- **Coverage is a ratchet** — only goes up via `vitest.config.ts` `thresholds.autoUpdate`.

Commands: `npm run test` (vitest), `npm run test:watch`, `npm run test:coverage`, `npm run test:e2e` (Playwright).

### Agent Teams
- Decompose tasks into independent sub-problems and run sub-agents in parallel — don't serialize what can be parallelized.
- Examples: research + scaffold simultaneously, write tests + write implementation simultaneously.
- See [AI Workflow](docs/ai-workflow.md) for patterns.

### Scratch Files
- All exploratory code, spikes, and debug scripts → `.scratch/<namespace>/<file>.ts`
- Never create scratch files in `src/`. Never commit scratch files.
- `npm run scratch:clean` wipes all scratch files.

### Retro — Improve as You Go
- After completing any feature or session: ask "what was confusing? what slowed things down?"
- If something was hard to find → update the relevant doc.
- If a pattern kept recurring → add it to `docs/development-standards.md`.
- Keep this file under 200 lines. If AGENTS.md grows, move detail to a doc and link it. (See the **Doc style** section at the top for the full rule.)

---

## Security

Built **security-first** — every control runs by default. Full baseline in [docs/security.md](docs/security.md).

- Secrets live in env vars, never code. `.env*` is gitignored; secretlint enforces this on commit, push, and PR.
- Git history is forever — a deleted-then-committed secret must be **rotated in its source system**.
- Order: **Fix → Rotate → Update → Verify → Document**. Rotating first leaves a window where the old credential still works.
- Least privilege on every key: read-only when possible, separate per env + per service, fine-grained PATs.
- Branch protection: `npm run setup:protect` (admins only).

---

## AI Checkpoints

Imperative rules for AI assistants (Claude, Codex, Cursor). When a rule conflicts with what the user asked, follow the rule and surface the conflict.

- **CHECK-IN before commit** — Show `git diff --cached` and wait for "yes" / "proceed" before `git commit`. Skip only if the user explicitly delegated the session.
- **SECRETS off-limits** — Never `cat`/`echo`/`grep`/`head` files matching `.env*`, `*.pem`, `*.key`, `*.p12`, `*secret*`, `*token*`, or `*credential*`. Tell the user how to view them in a separate terminal instead.
- **MAIN GUARD** — Refuse direct commits to `main`/`master`. Always feature branch + draft PR. The pre-commit hook also enforces this.
- **ROTATION FIRST** — On finding a secret in history, produce a Fix → Rotate → Update → Verify → Document checklist before any code edits. Deleting the literal first creates a credential-still-valid window.
- **AUDIT POST-INSTALL** — After `npm install` of new deps, run `npm audit` and surface high/critical findings. Don't absorb them silently.
- **NO CREDENTIAL ECHO** — Never run commands that echo, decode, or display credential values — not even partial.

---

## Docs

| Doc | What's in it |
|-----|-------------|
| [AI Workflow](docs/ai-workflow.md) | Commit discipline, testing, agent teams, retro detail |
| [Development Standards](docs/development-standards.md) | Project-specific patterns: withErrorHandling, config.ts |
| [Testing Strategy](docs/testing-strategy.md) | Pyramid + honeycomb model, layer routing, when-to-add-tests matrix |
| [E2E Testing](docs/testing-e2e.md) | Auth bypass setup, data-testid conventions |
| [Development Setup](docs/DEVELOPMENT.md) | DB workflow, env vars, Neon branching |
| [Security](docs/security.md) | Full security baseline + 11-point checklist for new projects |

---

## Skills & Extensions

**Pre-installed skills** (in `.agents/skills/`, auto-linked on `npm install`):

| Skill | What it covers |
|-------|---------------|
| `next-best-practices` | File conventions, RSC boundaries, async APIs, route handlers |
| `tailwind-design-system` | Tailwind v4, design tokens, component patterns |
| `vercel-react-best-practices` | React/Next.js performance, data fetching, bundle optimization |
| `web-design-guidelines` | Accessibility, UI best practices |
| `playwright-cli` | Playwright CLI usage for writing and debugging E2E tests |
| `find-skills` | Discover and install additional skills |

```bash
# Add more skills
npx skills add <name>
# Browse: https://skills.sh/
```
