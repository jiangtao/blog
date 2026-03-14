#!/bin/bash
# home/scripts/collect-codex-usage.sh

set -e

# Get device name (default to hostname)
DEVICE_NAME="${1:-$(hostname | cut -d'.' -f1)}"

# Get current year-month
YEAR_MONTH=$(date +%Y-%m)

# Output filename
OUTPUT_FILE="home/ai/usages/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

echo "Collecting Codex usage for device: $DEVICE_NAME"
echo "Output file: $OUTPUT_FILE"

# Run codex usage command
pnpx @ccusage/codex -j > "$OUTPUT_FILE"

echo "✓ Codex usage data collected successfully"
echo ""
echo "File saved to: $OUTPUT_FILE"
echo ""
echo "To view the data on your blog, commit and push this file:"
echo "  git add $OUTPUT_FILE"
echo "  git commit -m 'chore(ai): add Codex usage for $DEVICE_NAME $YEAR_MONTH'"
echo "  git push"
