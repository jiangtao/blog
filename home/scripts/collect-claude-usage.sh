#!/bin/bash
# home/scripts/collect-claude-usage.sh

set -e

# Check if ccusage command exists
if ! command -v ccusage &> /dev/null; then
  echo "Error: ccusage command not found"
  echo "Please install ccusage first: npm install -g @ccusage/cli"
  exit 1
fi

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Get device name (default to hostname)
DEVICE_NAME="${1:-$(hostname | cut -d'.' -f1)}"

# Get current year-month
YEAR_MONTH=$(date +%Y-%m)

# Output directory and filename (using absolute path)
OUTPUT_DIR="$REPO_ROOT/home/ai/usages"
OUTPUT_FILE="$OUTPUT_DIR/${DEVICE_NAME}-${YEAR_MONTH}.json"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Collecting Claude Code usage for device: $DEVICE_NAME"
echo "Output file: $OUTPUT_FILE"

# Run ccusage command
ccusage -j > "$OUTPUT_FILE"

# Verify output file is not empty
if [ ! -s "$OUTPUT_FILE" ]; then
  echo "Error: Output file is empty or was not created"
  rm -f "$OUTPUT_FILE"
  exit 1
fi

echo "✓ Claude Code usage data collected successfully"
echo ""
echo "File saved to: $OUTPUT_FILE"
echo ""
echo "To view the data on your blog, commit and push this file:"
echo "  git add home/ai/usages/${DEVICE_NAME}-${YEAR_MONTH}.json"
echo "  git commit -m 'chore(ai): add Claude Code usage for $DEVICE_NAME $YEAR_MONTH'"
echo "  git push"
