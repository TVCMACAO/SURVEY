#!/usr/bin/env bash
# Bump patch version in VERSION + package.json and refresh build-meta (git sha).
# Usage: ./scripts/bump-version.sh [major|minor|patch]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PART="${1:-patch}"
CURRENT="$(tr -d '[:space:]' < "$ROOT/VERSION")"
IFS=. read -r MAJOR MINOR PATCH <<< "$CURRENT"
MAJOR=${MAJOR:-0}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}
case "$PART" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Uso: $0 [major|minor|patch]"; exit 1 ;;
esac
NEW="${MAJOR}.${MINOR}.${PATCH}"
echo "$NEW" > "$ROOT/VERSION"
cd "$ROOT/frontend/survey-ui"
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.version='$NEW';
fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
"
APP_VERSION="$NEW" node scripts/write-build-meta.mjs
echo "Versión actualizada a $NEW"
