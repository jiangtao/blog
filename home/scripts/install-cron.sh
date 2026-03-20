#!/bin/bash
# home/scripts/install-cron.sh
# Install cron job for AI usage data sync

set -euo pipefail

export PATH="${BLOG_SYNC_PATH_PREFIX:+${BLOG_SYNC_PATH_PREFIX}:}/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin:${PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
resolve_repo_root() {
  local common_dir

  if common_dir="$(git rev-parse --git-common-dir 2>/dev/null)"; then
    cd "$common_dir/.." && pwd
  else
    cd "$SCRIPT_DIR/../.." && pwd
  fi
}

REPO_ROOT="$(resolve_repo_root)"
TARGET_REPO_ROOT="${BLOG_SYNC_TARGET_REPO_ROOT:-$REPO_ROOT}"
SYNC_SCRIPT="${BLOG_SYNC_TARGET_SCRIPT:-$TARGET_REPO_ROOT/home/scripts/sync-ai-usage.sh}"
CRON_LOG_DIR="${BLOG_SYNC_CRON_LOG_DIR:-~/Library/Logs/blog-sync}"
CRON_JOB="0 23 * * * $SYNC_SCRIPT >> $CRON_LOG_DIR/cron.log 2>&1"

if [[ ! -f "$SYNC_SCRIPT" ]]; then
  echo "Error: Sync script not found at $SYNC_SCRIPT"
  exit 1
fi

if crontab -l 2>/dev/null | grep -F -q "$SYNC_SCRIPT"; then
  echo "Cron job already exists for: $SYNC_SCRIPT"
  echo ""
  echo "Current crontab:"
  crontab -l | grep -F "$SYNC_SCRIPT"
  exit 0
fi

echo "Installing cron job..."
{
  crontab -l 2>/dev/null || true
  echo ""
  echo "# AI Usage Data Sync - Runs daily at 23:00"
  echo "$CRON_JOB"
} | crontab -

echo "✓ Cron job installed successfully"
echo ""
echo "Schedule: Daily at 23:00"
echo "Script: $SYNC_SCRIPT"
echo "Logs: $CRON_LOG_DIR/"
echo ""
echo "To view installed cron jobs:"
echo "  crontab -l"
echo ""
echo "To test the script manually:"
echo "  $SYNC_SCRIPT"
