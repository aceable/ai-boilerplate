#!/usr/bin/env bash
# Configure GitHub branch protection on the default branch (main).
# Requires repo admin permission. Idempotent — safe to re-run.
#
# Usage:
#   ./scripts/setup-branch-protection.sh                 # protect main
#   BRANCH=develop ./scripts/setup-branch-protection.sh  # protect a different branch
#   DRY_RUN=1 ./scripts/setup-branch-protection.sh       # preview without applying
#
# What it enforces:
#   - Pull request required, 1 approving review
#   - Required status check: "Fast checks (lint · type-check · secretlint · audit)"
#   - Stale reviews dismissed when new commits land
#   - No force-push to the protected branch
#   - No direct deletion of the protected branch
#   - Conversations must be resolved before merge

set -euo pipefail

BRANCH="${BRANCH:-main}"
REQUIRED_CHECK="${REQUIRED_CHECK:-Fast checks (lint · type-check · secretlint · audit)}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

err() { printf "${RED}✖ %s${NC}\n" "$*" >&2; }
warn() { printf "${YELLOW}⚠ %s${NC}\n" "$*" >&2; }
ok() { printf "${GREEN}✓ %s${NC}\n" "$*"; }

# 1. Prerequisite: gh CLI installed and authenticated
if ! command -v gh >/dev/null 2>&1; then
  err "GitHub CLI (gh) not found. Install it: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh is not authenticated. Run: gh auth login"
  exit 1
fi

# 2. Detect repo from origin remote
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  err "Could not detect repo. Are you inside a cloned GitHub repository?"
  exit 1
}

# 3. Confirm admin permission
PERM=$(gh api "repos/$REPO" --jq '.permissions.admin' 2>/dev/null || echo "false")
if [ "$PERM" != "true" ]; then
  err "You need admin permission on $REPO to apply branch protection."
  err "Ask a repo admin to run this script, or to add you as an admin first."
  exit 1
fi

# 4. Build protection payload
PAYLOAD=$(cat <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["$REQUIRED_CHECK"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
)

# 5. Dry run?
if [ "${DRY_RUN:-0}" = "1" ]; then
  warn "DRY_RUN=1 — would apply this payload to $REPO branch '$BRANCH':"
  echo "$PAYLOAD"
  exit 0
fi

# 6. Apply protection
ok "Applying branch protection to $REPO/$BRANCH"
if echo "$PAYLOAD" | gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
    -H "Accept: application/vnd.github+json" \
    --input - >/dev/null; then
  ok "Branch protection applied successfully."
  printf "\nWhat this means now:\n"
  printf "  • Pull request required to merge into %s\n" "$BRANCH"
  printf "  • At least 1 approving review needed\n"
  printf "  • Required status check: %s\n" "$REQUIRED_CHECK"
  printf "  • Stale reviews dismissed on new commits\n"
  printf "  • Force-pushes to %s blocked\n" "$BRANCH"
  printf "  • Conversations must be resolved before merge\n"
  printf "\nReview at: https://github.com/%s/settings/branches\n" "$REPO"
else
  err "Failed to apply branch protection. Common causes:"
  err "  • The required status check '$REQUIRED_CHECK' has never run on this repo."
  err "    Trigger CI at least once (open a PR) so GitHub knows about the check name."
  err "  • The repo is on a plan that doesn't allow some of these settings."
  exit 1
fi
