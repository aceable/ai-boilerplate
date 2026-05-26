#!/usr/bin/env bash
# Pull upstream template changes into the current repo.
#
# Usage:
#   sync.sh                      # interactive — uses .template-source or prompts
#   sync.sh aceable/ai-boilerplate   # explicit source (also writes .template-source)
#   sync.sh --dry-run            # show what would happen, don't merge
#   sync.sh --branch main        # upstream branch (default: main)
#
# What it does:
#   1. Ensures a `template` git remote points at the source repo.
#      - Reads .template-source at repo root if present.
#      - Else uses positional arg.
#      - Else prompts (interactive only) and writes .template-source.
#   2. Fetches the upstream branch.
#   3. Creates a sync branch `sync/template-YYYYMMDD-HHMMSS`.
#   4. Merges with --allow-unrelated-histories (templates have no shared history).
#   5. If conflicts: leaves them in the working tree, lists files, and stops.
#      User resolves, commits, pushes, opens a PR.
#   6. If clean: lists changed files and stops so the user can review before push.
#
# Skip flag: SYNC_SKIP_AUDIT=1 to bypass the post-merge npm audit hint.
set -euo pipefail

DRY_RUN=0
BRANCH="main"
SOURCE_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1; shift ;;
    --branch)
      BRANCH="$2"; shift 2 ;;
    --branch=*)
      BRANCH="${1#--branch=}"; shift ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    --)
      shift; break ;;
    -*)
      printf 'unknown flag: %s\n' "$1" >&2; exit 2 ;;
    *)
      SOURCE_ARG="$1"; shift ;;
  esac
done

# 0. Sanity check — we must be in a git repo with a clean working tree.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  printf '❌ Not inside a git repository.\n' >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

if [ -n "$(git status --porcelain)" ]; then
  printf '❌ Working tree is dirty. Commit, stash, or discard changes before syncing.\n' >&2
  git status --short >&2
  exit 1
fi

# 1. Resolve source.
SOURCE_FILE="$REPO_ROOT/.template-source"
SOURCE=""

if [ -n "$SOURCE_ARG" ]; then
  SOURCE="$SOURCE_ARG"
elif [ -f "$SOURCE_FILE" ]; then
  SOURCE=$(head -n1 "$SOURCE_FILE" | tr -d '[:space:]')
fi

if [ -z "$SOURCE" ]; then
  if [ -t 0 ]; then
    printf 'No .template-source file found.\n' >&2
    printf 'Source template repo (e.g. owner/repo): ' >&2
    read -r SOURCE
  else
    printf '❌ No template source. Pass it as an argument or create .template-source.\n' >&2
    printf '   Example: %s aceable/ai-boilerplate\n' "$0" >&2
    exit 1
  fi
fi

# Strip any trailing .git and normalize.
SOURCE=${SOURCE%.git}
SOURCE=${SOURCE#https://github.com/}

if ! printf '%s' "$SOURCE" | grep -Eq '^[^/]+/[^/]+$'; then
  printf '❌ Source must be owner/repo, got: %s\n' "$SOURCE" >&2
  exit 1
fi

# Persist source for next time (only if not already correct).
EXISTING=""
[ -f "$SOURCE_FILE" ] && EXISTING=$(head -n1 "$SOURCE_FILE" | tr -d '[:space:]')
if [ "$EXISTING" != "$SOURCE" ]; then
  printf '%s\n' "$SOURCE" > "$SOURCE_FILE"
  printf '→ wrote .template-source = %s\n' "$SOURCE"
fi

URL="https://github.com/${SOURCE}.git"

# 2. Set up the `template` remote (idempotent).
if git remote get-url template >/dev/null 2>&1; then
  CURRENT=$(git remote get-url template)
  if [ "$CURRENT" != "$URL" ]; then
    printf '→ updating template remote: %s → %s\n' "$CURRENT" "$URL"
    git remote set-url template "$URL"
  fi
else
  printf '→ adding template remote: %s\n' "$URL"
  git remote add template "$URL"
fi

# 3. Fetch upstream.
printf '→ fetching template/%s\n' "$BRANCH"
git fetch template "$BRANCH" --quiet || {
  printf '❌ Fetch failed. Is the source repo accessible?\n' >&2
  exit 1
}

UPSTREAM_SHA=$(git rev-parse "template/$BRANCH")
LOCAL_SHA=$(git rev-parse HEAD)

# 4. If already at or ahead of upstream — nothing to do.
if git merge-base --is-ancestor "$UPSTREAM_SHA" HEAD 2>/dev/null; then
  printf '✓ Already up to date with template/%s (%s).\n' "$BRANCH" "${UPSTREAM_SHA:0:7}"
  exit 0
fi

# 5. Preview diff vs upstream.
DIFF_FILES=$(git diff --name-only HEAD "$UPSTREAM_SHA" | head -50)
DIFF_COUNT=$(git diff --name-only HEAD "$UPSTREAM_SHA" | wc -l | tr -d ' ')

printf '\n--- %s files differ between HEAD and template/%s ---\n' "$DIFF_COUNT" "$BRANCH"
printf '%s\n' "$DIFF_FILES"
[ "$DIFF_COUNT" -gt 50 ] && printf '... (+%s more)\n' "$((DIFF_COUNT - 50))"

if [ "$DRY_RUN" = "1" ]; then
  printf '\n(dry-run) would merge template/%s into a new sync branch and stop.\n' "$BRANCH"
  exit 0
fi

# 6. Create a sync branch and merge.
SYNC_BRANCH="sync/template-$(date +%Y%m%d-%H%M%S)"
printf '\n→ checking out %s\n' "$SYNC_BRANCH"
git checkout -b "$SYNC_BRANCH"

printf '→ merging template/%s --allow-unrelated-histories --no-commit\n' "$BRANCH"
set +e
git merge "template/$BRANCH" --allow-unrelated-histories --no-commit --no-ff
MERGE_EXIT=$?
set -e

# 7. Report result.
CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

if [ -n "$CONFLICTS" ]; then
  printf '\n⚠ Merge has conflicts. Files needing resolution:\n'
  printf '%s\n' "$CONFLICTS" | sed 's/^/  /'
  printf '\nNext steps:\n'
  printf '  1. Resolve conflicts (an AI assistant can help: ask it to review each conflict).\n'
  printf '  2. git add <resolved-files>\n'
  printf '  3. git commit -m "chore: sync from template"\n'
  printf '  4. git push -u origin %s\n' "$SYNC_BRANCH"
  printf '  5. gh pr create --title "chore: sync from template" --label template-sync\n'
  exit 0
fi

if [ "$MERGE_EXIT" -ne 0 ]; then
  printf '\n❌ Merge failed for reasons other than conflicts. Inspect with git status.\n' >&2
  exit "$MERGE_EXIT"
fi

# Clean merge — staged but not committed (because we passed --no-commit).
STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
printf '\n✓ Merged cleanly. %s files staged.\n' "$STAGED"
printf '\nReview the diff (`git diff --cached`), then:\n'
printf '  git commit -m "chore: sync from template"\n'
printf '  git push -u origin %s\n' "$SYNC_BRANCH"
printf '  gh pr create --title "chore: sync from template" --label template-sync\n'
