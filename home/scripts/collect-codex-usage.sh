#!/bin/bash
# home/scripts/collect-codex-usage.sh

set -euo pipefail

# Check if pnpx command exists
if ! command -v pnpx &> /dev/null; then
  echo "Error: pnpx command not found"
  exit 1
fi

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Get device name (default to hostname)
DEVICE_NAME="${1:-${BLOG_SYNC_DEVICE_NAME:-$(hostname | cut -d'.' -f1)}}"

# Get current year-month
YEAR_MONTH="${BLOG_SYNC_YEAR_MONTH:-$(date +%Y-%m)}"

# Output directory and filename
OUTPUT_DIR="$REPO_ROOT/home/ai/usages"
OUTPUT_FILE="$OUTPUT_DIR/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Collecting Codex usage for device: $DEVICE_NAME"
echo "Output file: $OUTPUT_FILE"

# Run codex usage command
pnpx @ccusage/codex -j > "$OUTPUT_FILE"

# Verify output file is not empty
if [ ! -s "$OUTPUT_FILE" ]; then
  echo "Error: Output file is empty or was not created"
  rm -f "$OUTPUT_FILE"
  exit 1
fi

echo "✓ Codex usage data collected successfully"
echo ""
echo "File saved to: $OUTPUT_FILE"
echo ""
echo "To view the data on your blog, commit and push this file:"
echo "  git add home/ai/usages/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"
echo "  git commit -m 'chore(ai): add Codex usage for $DEVICE_NAME $YEAR_MONTH'"
echo "  git push"
