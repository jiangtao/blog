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

# Detect fnm bin path for Node.js commands (ccusage, pnpx)
detect_fnm_bin_path() {
  local fnm_bin_path=""
  local fnm_dir="$HOME/Library/Application Support/fnm"

  # Method 1: Try ~/.node-version (most specific to user's preference)
  if [[ -f "$HOME/.node-version" ]]; then
    local node_version
    node_version=$(cat "$HOME/.node-version" | tr -d '[:space:]')

    # Validate version format and check if directory exists
    if [[ -n "$node_version" ]]; then
      local version_bin="$fnm_dir/node-versions/v${node_version}/installation/bin"
      if [[ -d "$version_bin" ]] && [[ -x "$version_bin/node" ]]; then
        fnm_bin_path="$version_bin"
        echo "$fnm_bin_path"
        return 0
      fi
    fi
  fi

  # Method 2: Fallback to default alias
  local default_bin="$fnm_dir/aliases/default/bin"
  if [[ -d "$default_bin" ]] && [[ -x "$default_bin/node" ]]; then
    fnm_bin_path="$default_bin"
    echo "$fnm_bin_path"
    return 0
  fi

  # Method 3: No fnm found (graceful degradation)
  return 1
}

FNM_BIN_PATH=$(detect_fnm_bin_path)

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
  echo "SHELL=/bin/bash"
  if [[ -n "$FNM_BIN_PATH" ]]; then
    echo "BLOG_SYNC_PATH_PREFIX=$FNM_BIN_PATH"
    echo ""
  fi
  echo "# AI Usage Data Sync - Runs daily at 23:00"
  echo "$CRON_JOB"
} | crontab -

echo "✓ Cron job installed successfully"
echo ""
echo "Schedule: Daily at 23:00"
echo "Script: $SYNC_SCRIPT"
echo "Logs: $CRON_LOG_DIR/"
if [[ -n "$FNM_BIN_PATH" ]]; then
  echo "Node.js PATH: $FNM_BIN_PATH"
fi
echo ""
echo "To view installed cron jobs:"
echo "  crontab -l"
echo ""
echo "To test the script manually:"
echo "  $SYNC_SCRIPT"
