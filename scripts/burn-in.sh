#!/usr/bin/env bash

set -euo pipefail

iterations="${1:-10}"
if ! [[ "$iterations" =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 [positive-iteration-count]" >&2
  exit 2
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"

cd "$project_dir"
npm run test:e2e:ci -- --repeat-each="$iterations"
