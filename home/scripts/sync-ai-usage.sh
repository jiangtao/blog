#!/bin/bash
# home/scripts/sync-ai-usage.sh
# Automatically sync AI usage data (ccusage + codex) to Git repo

set -euo pipefail

# Exit codes
EXIT_SUCCESS=0
EXIT_COLLECTION_FAIL=1
EXIT_GIT_FAIL=2
EXIT_ENV_FAIL=3

# Environment setup
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"

# Project directory
PROJECT_DIR="$HOME/places/personal/blog"

# Log directory and file
LOG_DIR="$HOME/Library/Logs/blog-sync"
LOG_FILE="$LOG_DIR/sync-usage-$(date +%Y-%m).log"

# Device and date info
DEVICE_NAME=$(hostname | cut -d'.' -f1)
YEAR_MONTH=$(date +%Y-%m)

# Create log directory if not exists
if ! mkdir -p "$LOG_DIR"; then
  echo "ERROR: Failed to create log directory: $LOG_DIR" >&2
  exit "$EXIT_ENV_FAIL"
fi

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

# Environment check function
check_environment() {
  log "Checking environment..."

  # Check if project directory exists
  if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory not found: $PROJECT_DIR"
    notify_error "项目目录不存在: $PROJECT_DIR"
    exit $EXIT_ENV_FAIL
  fi

  # Change to project directory
  cd "$PROJECT_DIR" || {
    log_error "Failed to change to project directory"
    notify_error "无法进入项目目录"
    exit $EXIT_ENV_FAIL
  }

  log "✓ Project directory: $PROJECT_DIR"

  # Check required commands
  local missing_commands=()

  if ! command -v ccusage &> /dev/null; then
    missing_commands+=("ccusage")
  fi

  if ! command -v pnpx &> /dev/null; then
    missing_commands+=("pnpx")
  fi

  if ! command -v git &> /dev/null; then
    missing_commands+=("git")
  fi

  if [[ ${#missing_commands[@]} -gt 0 ]]; then
    local missing_list
    missing_list=$(printf "%s," "${missing_commands[@]}")
    missing_list=${missing_list%,}  # Remove trailing comma
    log_error "Missing required commands: $missing_list"
    notify_error "缺少必需命令: $missing_list"
    exit $EXIT_ENV_FAIL
  fi

  log "✓ All required commands available"
}

# Main function placeholder
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"

  # Check environment
  check_environment

  log "========== Sync Completed =========="
}

# Run main function
main
