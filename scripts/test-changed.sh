#!/usr/bin/env bash

set -euo pipefail

base_ref="${1:-main}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"

cd "$project_dir"

if ! git rev-parse --verify --quiet "$base_ref" >/dev/null; then
  echo "Unknown Git reference: $base_ref" >&2
  exit 2
fi

mapfile -t changed_specs < <(
  {
    git diff --name-only "$base_ref"...HEAD -- 'tests/e2e/*.spec.js'
    git diff --name-only -- 'tests/e2e/*.spec.js'
    git ls-files --others --exclude-standard -- 'tests/e2e/*.spec.js'
  } | sort -u
)

if (( ${#changed_specs[@]} == 0 )); then
  echo "No changed Playwright specs found against $base_ref."
  exit 0
fi

npm run test:e2e:ci -- "${changed_specs[@]}"
