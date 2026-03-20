#!/bin/bash
# home/scripts/uninstall-cron.sh
# Uninstall cron job for AI usage data sync

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

if ! crontab -l 2>/dev/null | grep -F -q "$SYNC_SCRIPT"; then
  echo "No cron job found for: $SYNC_SCRIPT"
  exit 0
fi

echo "Removing cron job..."
filtered_crontab="$(
  crontab -l 2>/dev/null | grep -F -v "$SYNC_SCRIPT" | grep -F -v "# AI Usage Data Sync - Runs daily at 23:00" || true
)"
printf '%s\n' "$filtered_crontab" | crontab -

echo "✓ Cron job removed successfully"
echo ""
echo "The sync script is still available at:"
echo "  $SYNC_SCRIPT"
echo ""
echo "Logs are preserved at:"
echo "  $CRON_LOG_DIR/"
