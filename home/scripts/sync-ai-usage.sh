#!/bin/bash
# home/scripts/sync-ai-usage.sh
# Automatically sync AI usage data (ccusage + codex) to Git repo

set -euo pipefail

# Exit codes
EXIT_SUCCESS=0
EXIT_COLLECTION_FAIL=1
EXIT_GIT_FAIL=2
EXIT_ENV_FAIL=3

TEMP_STASH_CREATED=0
TEMP_STASH_MESSAGE=""

# Environment setup
export HOME="${HOME:-$(
  cd ~ >/dev/null 2>&1 && pwd
)}"
export PATH="${BLOG_SYNC_PATH_PREFIX:+${BLOG_SYNC_PATH_PREFIX}:}/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin:${PATH:-}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project directory
DEFAULT_PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_DIR="${BLOG_SYNC_PROJECT_DIR:-$DEFAULT_PROJECT_DIR}"
PROJECT_SCRIPT_DIR="$PROJECT_DIR/home/scripts"
GIT_REMOTE="${BLOG_SYNC_GIT_REMOTE:-origin}"
GIT_BRANCH="${BLOG_SYNC_GIT_BRANCH:-master}"

# Log directory and file
LOG_DIR="${BLOG_SYNC_LOG_DIR:-$HOME/Library/Logs/blog-sync}"
LOG_FILE="$LOG_DIR/sync-usage-$(date +%Y-%m).log"

# Device and date info
DEVICE_NAME="${BLOG_SYNC_DEVICE_NAME:-$(hostname | cut -d'.' -f1)}"
YEAR_MONTH="${BLOG_SYNC_YEAR_MONTH:-$(date +%Y-%m)}"

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
  if command -v osascript > /dev/null 2>&1; then
    osascript -e "display notification \"原因: $reason\n查看日志: ${LOG_DIR}\" with title \"AI 使用数据同步失败\" subtitle \"时间: $(date +%H:%M)\"" > /dev/null 2>&1 || true
  fi
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

# Data collection function
collect_data() {
  log "Collecting AI usage data..."

  local claude_success=0
  local codex_success=0

  # Collect Claude Code usage
  log "Collecting Claude Code usage..."
  if "$PROJECT_SCRIPT_DIR/collect-claude-usage.sh" "$DEVICE_NAME" >> "$LOG_FILE" 2>&1; then
    log "✓ Claude Code data collected: ${DEVICE_NAME}-${YEAR_MONTH}.json"
    claude_success=1
  else
    log_error "Failed to collect Claude Code usage"
  fi

  # Collect Codex usage
  log "Collecting Codex usage..."
  if "$PROJECT_SCRIPT_DIR/collect-codex-usage.sh" "$DEVICE_NAME" >> "$LOG_FILE" 2>&1; then
    log "✓ Codex data collected: ${DEVICE_NAME}-codex-${YEAR_MONTH}.json"
    codex_success=1
  else
    log_error "Failed to collect Codex usage"
  fi

  # Check if both collections failed
  if [[ $claude_success -eq 0 ]] && [[ $codex_success -eq 0 ]]; then
    log_error "Both data collections failed"
    notify_error "数据收集失败：ccusage 和 codex 都无法执行"
    exit $EXIT_COLLECTION_FAIL
  fi

  # Log partial success if only one succeeded
  if [[ $claude_success -eq 0 ]] || [[ $codex_success -eq 0 ]]; then
    log "⚠ Partial collection success, continuing..."
  fi
}

# Temporarily stash the current device's usage files if they are already dirty.
stash_current_device_changes() {
  local claude_file="home/ai/usages/${DEVICE_NAME}-${YEAR_MONTH}.json"
  local codex_file="home/ai/usages/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"
  local dirty_output

  dirty_output="$(git status --porcelain -- "$claude_file" "$codex_file")"

  if [[ -z "$dirty_output" ]]; then
    return 0
  fi

  TEMP_STASH_MESSAGE="blog-sync-prepull-${DEVICE_NAME}-${YEAR_MONTH}-$(date +%s)"

  log "Stashing existing local usage file changes for current device..."
  if ! git stash push --include-untracked --message "$TEMP_STASH_MESSAGE" -- "$claude_file" "$codex_file" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to stash local usage file changes"
    notify_error "无法暂存当前设备的本地 usage 变更"
    exit $EXIT_GIT_FAIL
  fi

  TEMP_STASH_CREATED=1
  log "✓ Stashed local usage file changes"
}

# Git preparation function
prepare_git_repo() {
  stash_current_device_changes

  # Pull latest changes before committing local updates.
  log "Pulling latest changes..."
  if ! git pull --rebase "$GIT_REMOTE" "$GIT_BRANCH" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to pull latest changes"
    notify_error "git pull 失败，可能有冲突需要手动解决"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Pulled latest changes"
}

drop_temporary_stash() {
  if [[ $TEMP_STASH_CREATED -eq 0 ]]; then
    return 0
  fi

  local stash_ref
  stash_ref="$(git stash list --format='%gd %s' | awk -v message="$TEMP_STASH_MESSAGE" '$0 ~ message { print $1; exit }')"

  if [[ -z "$stash_ref" ]]; then
    log "Temporary stash already absent"
    return 0
  fi

  log "Dropping temporary stash..."
  if ! git stash drop "$stash_ref" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to drop temporary stash"
    notify_error "无法删除临时 stash，请手动检查 git stash list"
    exit $EXIT_GIT_FAIL
  fi

  log "✓ Dropped temporary stash"
}

# Git operations function
git_operations() {
  log "Performing Git operations..."

  log "Checking for changes..."
  local changes
  changes="$(git status --porcelain home/ai/usages/)"

  if [[ -z "$changes" ]]; then
    log "No changes detected, skipping commit"
    return 0
  fi

  local file_count
  file_count="$(printf '%s\n' "$changes" | wc -l | tr -d ' ')"
  log "Changes detected in $file_count file(s)"

  local files_to_stage=()
  local claude_file="home/ai/usages/${DEVICE_NAME}-${YEAR_MONTH}.json"
  local codex_file="home/ai/usages/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

  if [[ -f "$claude_file" ]]; then
    files_to_stage+=("$claude_file")
  fi

  if [[ -f "$codex_file" ]]; then
    files_to_stage+=("$codex_file")
  fi

  if [[ ${#files_to_stage[@]} -eq 0 ]]; then
    log_error "No current device usage files found to stage"
    notify_error "未找到当前设备的使用数据文件"
    exit $EXIT_GIT_FAIL
  fi

  log "Adding changes..."
  git add "${files_to_stage[@]}" >> "$LOG_FILE" 2>&1
  log "✓ Changes staged"

  local commit_message
  commit_message="chore(ai): sync usage data for ${DEVICE_NAME} ${YEAR_MONTH}

- Claude Code: ${DEVICE_NAME}-${YEAR_MONTH}.json
- Codex: ${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

  log "Committing changes..."
  if ! git commit -m "$commit_message" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to commit changes"
    notify_error "git commit 失败"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Changes committed"

  log "Pushing to GitHub..."
  if ! git push "$GIT_REMOTE" "$GIT_BRANCH" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to push to GitHub"
    notify_error "git push 失败 - 可能是网络问题，本地提交已保留"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Successfully pushed to ${GIT_REMOTE}/${GIT_BRANCH}"
}

# Main function
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"

  # Check environment
  check_environment

  # Sync with remote before local collectors update tracked files
  prepare_git_repo

  # Collect data
  collect_data

  # Sync new data to GitHub
  git_operations

  # Drop temporary stash once sync succeeds end-to-end
  drop_temporary_stash

  log "========== Sync Completed =========="
}

# Run main function
main
