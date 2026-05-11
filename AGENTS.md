# AGENTS.md – Engineering & AI Standards

> Canonical config for Claude Code, OpenAI Codex, Cursor, and other AI assistants.
> Both Claude Code and OpenAI Codex read this file natively. Version: 2026.1

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

**Staying in sync with the template:**
Repos created via `gh repo create --template` have no parent relationship — GitHub's "Sync fork" doesn't apply. To pull updates from this template: run `/sync-template`. The skill reads `.template-source` (pre-filled in this template) to know which upstream to fetch from, sets up a `template` git remote on first run, and merges `--allow-unrelated-histories` into a sync branch for review.

**CI** (`.github/workflows/ci.yml`):
- Runs on every push to main + every PR.
- `fast-checks`: lint → type-check → secretlint → npm audit (~2-3 min, always).
- `e2e-and-build`: Playwright + next build (skipped on draft PRs).
- Concurrency group cancels superseded runs so minutes don't stack.

**Git hooks** (auto-installed by `husky` on `npm install`):
- `pre-commit` — blocks commits to `main`/`master`, runs lint-staged + secretlint
- `pre-push` — blocks force-push to `main`/`master`, scans diff for secrets, runs `npm audit --audit-level=high`
- `commit-msg` — enforces Conventional Commits + rejects credential-shaped strings
- Emergency bypass: `SKIP_HUSKY=1 git ...` (audit-logged)

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
- Keep this file under 200 lines. If AGENTS.md grows, move detail to a doc and link it.

### 80/20 Documentation
- Before adding anything here: "Does every AI session need this, or just occasionally?"
- Occasional reference → goes in `docs/`, linked from here.
- One-off context → inline `// Why:` comment in code.

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
