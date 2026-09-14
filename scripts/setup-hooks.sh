#!/usr/bin/env bash
set -euo pipefail

if ! command -v mise &> /dev/null; then
  echo "mise is required: https://mise.jdx.dev/getting-started.html"
  exit 1
fi

mise install
mise exec -- lefthook install
echo "✅ Git hooks installed via lefthook"
