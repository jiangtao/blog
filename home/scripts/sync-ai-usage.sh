#!/bin/bash
# home/scripts/sync-ai-usage.sh
# Automatically sync AI usage data (ccusage + codex) to Git repo

set -e

# Exit codes
EXIT_SUCCESS=0
EXIT_COLLECTION_FAIL=1
EXIT_GIT_FAIL=2
EXIT_ENV_FAIL=3

# Environment setup
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"
export HOME="${HOME:-/Users/jt}"

# Project directory
PROJECT_DIR="$HOME/places/personal/blog"

# Log directory and file
LOG_DIR="$HOME/Library/Logs/blog-sync"
LOG_FILE="$LOG_DIR/sync-usage-$(date +%Y-%m).log"

# Device and date info
DEVICE_NAME=$(hostname | cut -d'.' -f1)
YEAR_MONTH=$(date +%Y-%m)

# Logging functions
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Notification function
notify_error() {
  local reason="$1"
  osascript -e "display notification \"原因: $reason\n查看日志: ~/Library/Logs/blog-sync/\" with title \"AI 使用数据同步失败\" subtitle \"时间: $(date +%H:%M)\""
}

# Main function placeholder
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"
  log "========== Sync Completed =========="
}

# Create log directory if not exists
mkdir -p "$LOG_DIR"

# Run main function
main
