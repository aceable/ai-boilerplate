---
name: sync-template
version: 0.1.0
description: Pull updates from a GitHub repo's upstream template into the current repo. GitHub has no native template-sync feature, so this skill wires up a `template` remote, fetches the upstream branch, and merges with `--allow-unrelated-histories` into a sync branch. Use when a repo was created via `gh repo create --template` and the template has since released updates the project should adopt. Triggers on `/sync-template`, "sync from template", "pull template updates", or after the user sees a notable change in the source template.
scope: global
---

# sync-template

## What this solves

GitHub repos created with `gh repo create --template ...` (or the "Use this template" button) have **no parent relationship** to their source. There's no "Sync fork" button. The standard workaround is a `git remote add template ...` + `git merge --allow-unrelated-histories` dance — error-prone, easy to forget, manual conflict resolution.

This skill automates that dance and leaves you with a sync branch + AI-assistable conflicts.

## When to invoke

- User says `/sync-template`, "sync from template", "pull template updates"
- User mentions the template repo has released new security baseline / CI changes / docs
- A scheduled reminder (Slack, CHANGELOG link) says there's an update worth pulling
- After cloning a `--template`-spawned repo for the first time, to wire up the remote

## Help Cheatsheet

```
sync-template — pull updates from a GitHub repo's upstream template.

USAGE
  /sync-template                         Use .template-source or prompt
  /sync-template owner/repo              Explicit source (also writes .template-source)
  /sync-template help                    This card

FLAGS (passed to scripts/sync.sh)
  --dry-run                              Show what would merge, don't merge
  --branch <name>                        Upstream branch (default: main)

EXAMPLES
  /sync-template                         Interactive sync from saved source
  /sync-template aceable/ai-boilerplate
  /sync-template --dry-run               Preview only
  /sync-template --branch release        Pull from a different upstream branch

WHAT IT DOES
  1. Reads .template-source (or asks once and writes it)
  2. Adds/updates `template` git remote
  3. Fetches the upstream branch
  4. Creates sync/template-YYYYMMDD-HHMMSS
  5. Merges --allow-unrelated-histories --no-commit
  6. Stops — user reviews staged diff, resolves conflicts (AI can help), commits, pushes, PRs

EXITS WHEN
  - Working tree dirty (asks user to clean first)
  - Already up to date (no-op)
  - Conflicts (lists files, stops for resolution)
  - Clean merge (lists staged files, stops for review)

RELATED
  /review — run on the resulting PR for conflict-resolution help
```

## Workflow

### Step 1: Check repo state

The script refuses to run on a dirty tree. Confirm with the user before stashing or committing. If they say "go ahead", commit or stash first.

### Step 2: Identify the template source

The skill checks in this order:
1. CLI argument (`/sync-template owner/repo`)
2. `.template-source` file at repo root (one line, `owner/repo`)
3. Prompt the user once, write the answer to `.template-source` for next time

If the repo doesn't have `.template-source` yet, the script prompts interactively. In a non-interactive context (CI, agent), pass the source as an argument.

### Step 3: Run the sync

```bash
bash {{SKILL_DIR}}/scripts/sync.sh
# or with explicit source the first time:
bash {{SKILL_DIR}}/scripts/sync.sh aceable/ai-boilerplate
```

The script:
- Adds (or updates) the `template` git remote
- Fetches `template/main` (or the branch passed via `--branch`)
- If HEAD already contains every upstream commit, exits with "up to date"
- Otherwise creates a `sync/template-{timestamp}` branch and runs `git merge template/main --allow-unrelated-histories --no-commit`

### Step 4: Handle the result

The script stops after the merge — by design. Three possible outcomes:

| Outcome | What to do |
|---|---|
| Already up to date | Nothing — script exits 0 |
| Clean merge | Run `git diff --cached` to review. If happy, commit + push + PR. |
| Conflicts | Resolve each file (offer to help — read each conflict, propose a resolution that keeps project-specific code and adopts upstream changes). Then `git add` + commit + push + PR. |

### Step 5: Open the PR

Standard PR workflow — the script prints the exact commands to run:

```bash
git commit -m "chore: sync from template"
git push -u origin sync/template-YYYYMMDD-HHMMSS
gh pr create --title "chore: sync from template" --label template-sync
```

## AI conflict-resolution playbook

When the merge produces conflicts, work through them one file at a time:

1. **Read both sides** of each conflict marker (`<<<<<<<` … `=======` … `>>>>>>>`).
2. **Classify** the change:
   - Upstream is a security / infra update → adopt upstream
   - Project has customized this file beyond template scope → keep project version
   - Genuine merge (both diverged for different reasons) → combine semantically, not textually
3. **Verify after each resolve**:
   - Run lint + type-check if the file is code (`npm run lint:all`)
   - Run the relevant tests (`npm test` or `npm run test:e2e`)
4. **Commit in logical chunks** if conflicts span multiple concerns — don't squash into one giant "resolved conflicts" commit.

## Setting up a new repo

For a repo just created via `gh repo create --template ...`, run the skill once with the source explicitly to wire up `.template-source`:

```bash
/sync-template aceable/ai-boilerplate
```

This writes `.template-source` and runs the first sync. Subsequent invocations need no argument.

## Frequency

There's no scheduled trigger built in. People sync when:
- The source repo announces a release (Slack ping, CHANGELOG entry)
- A new security advisory affects the shared infrastructure
- They notice their repo is missing a feature that landed in the template

A scheduled workflow (`actions-template-sync` on a cron) is a different solution — see references/comparison.md if you need that pattern.

## Limitations

- **`--allow-unrelated-histories` produces a merge commit** that joins two unrelated trees. Git blame across that boundary is awkward. This is unavoidable for `--template`-created repos.
- **Project-specific files will conflict** if the template's version of them has moved on. Use `.gitattributes` `merge=ours` directives for files that should always keep the project version (e.g., `README.md`, `package.json` identity fields).
- **First sync is the biggest** — months of template drift land at once. After that, weekly or monthly syncs stay small.
