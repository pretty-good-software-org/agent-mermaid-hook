#!/usr/bin/env bash
# Bootstrap a new repository created from this template:
#   1. Rewrite "Initial commit" to "chore: initial commit" (Conventional Commits)
#   2. Tag the initial commit as v0.0.0
#
# Run once after creating a repo from this template.

set -euo pipefail

FIRST_MSG=$(git log --reverse --format=%s | head -1)
FIRST_SHA=$(git rev-list --max-parents=0 HEAD)

if [ "$FIRST_MSG" = "Initial commit" ]; then
  echo "Rewriting initial commit message to conventional format..."
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter '
    if [ "$GIT_COMMIT" = "'"$FIRST_SHA"'" ]; then
      echo "chore: initial commit"
    else
      cat
    fi
  ' -- --all
  echo "Done. You will need to force-push: git push --force-with-lease"
else
  echo "Initial commit already uses conventional format, skipping."
fi

if git tag -l v0.0.0 | grep -q v0.0.0; then
  echo "Tag v0.0.0 already exists, skipping."
else
  echo "Tagging initial commit as v0.0.0..."
  git tag v0.0.0 "$FIRST_SHA"
fi

echo "✅ Template initialized"
