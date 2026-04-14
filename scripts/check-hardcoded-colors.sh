#!/usr/bin/env bash
#
# Guardrail: fail if any themed (user-facing) .module.css file contains a
# hardcoded hex color outside the whitelist.
#
# Usage: ./scripts/check-hardcoded-colors.sh
#
# This script enforces the rule that themed files must reference CSS
# custom properties from src/renderer/src/themes/tokens.css instead of
# hex literals. Admin files (under AdminScreen/ and components/admin/)
# are exempt — they use the stable --admin-* palette and are not checked.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Themed modules = everything under src/renderer/src/**/*.module.css
# EXCEPT files under screens/AdminScreen/ or components/admin/.
FILES=$(find src/renderer/src -name '*.module.css' \
  ! -path '*/screens/AdminScreen/*' \
  ! -path '*/components/admin/*')

# Files explicitly whitelisted (functional hardcoded colors).
WHITELIST=(
  "src/renderer/src/components/FlashOverlay/FlashOverlay.module.css"
)

is_whitelisted() {
  local f="$1"
  for w in "${WHITELIST[@]}"; do
    [[ "$f" == "$w" ]] && return 0
  done
  return 1
}

violations=0
for f in $FILES; do
  if is_whitelisted "$f"; then
    continue
  fi
  # Match #rgb, #rrggbb, #rrggbbaa anywhere in the file.
  if matches=$(grep -n -E '#[0-9a-fA-F]{3,8}\b' "$f"); then
    echo "❌ Hardcoded hex in $f:"
    echo "$matches" | sed 's/^/    /'
    violations=$((violations + 1))
  fi
done

if [[ $violations -gt 0 ]]; then
  echo ""
  echo "Found hardcoded hex colors in $violations themed module(s)."
  echo "Replace them with references to tokens from src/renderer/src/themes/tokens.css,"
  echo "or add the file to the WHITELIST if the color is intentionally static."
  exit 1
fi

echo "✓ No hardcoded hex colors in themed modules."
