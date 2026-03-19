# macOS Cron 自动同步 AI 使用数据 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建 macOS cron 任务，每天 23:00 自动收集 ccusage 和 codex 数据，提交到 Git 并推送到 GitHub

**Architecture:** 主脚本负责环境检查、数据收集、Git 操作和错误处理。安装/卸载脚本管理 crontab 配置。日志系统记录执行历史，失败时发送 macOS 通知。

**Tech Stack:** Bash, cron, Git, osascript (macOS 通知), ccusage, @ccusage/codex

---

## Task 1: 创建 Claude Code 数据收集脚本

**Files:**
- Create: `home/scripts/collect-claude-usage.sh`

**Step 1: 检查是否已存在类似脚本**

Run: `ls -la home/scripts/collect-*.sh`
Expected: 应该看到 `collect-codex-usage.sh`

**Step 2: 创建 Claude Code 收集脚本**

```bash
#!/bin/bash
# home/scripts/collect-claude-usage.sh

set -e

# Get device name (default to hostname)
DEVICE_NAME="${1:-$(hostname | cut -d'.' -f1)}"

# Get current year-month
YEAR_MONTH=$(date +%Y-%m)

# Output filename
OUTPUT_FILE="home/ai/usages/${DEVICE_NAME}-${YEAR_MONTH}.json"

echo "Collecting Claude Code usage for device: $DEVICE_NAME"
echo "Output file: $OUTPUT_FILE"

# Run ccusage command
ccusage -j > "$OUTPUT_FILE"

echo "✓ Claude Code usage data collected successfully"
echo ""
echo "File saved to: $OUTPUT_FILE"
echo ""
echo "To view the data on your blog, commit and push this file:"
echo "  git add $OUTPUT_FILE"
echo "  git commit -m 'chore(ai): add Claude Code usage for $DEVICE_NAME $YEAR_MONTH'"
echo "  git push"
```

**Step 3: 设置执行权限**

Run: `chmod +x home/scripts/collect-claude-usage.sh`
Expected: 文件变为可执行

**Step 4: 测试脚本**

Run: `./home/scripts/collect-claude-usage.sh`
Expected:
- 输出收集信息
- 创建 `home/ai/usages/{hostname}-2026-03.json`
- 文件包含有效 JSON 数据

**Step 5: 验证输出文件**

Run: `cat home/ai/usages/$(hostname | cut -d'.' -f1)-2026-03.json | head -20`
Expected: 看到 JSON 格式的 ccusage 数据

**Step 6: 提交**

```bash
git add home/scripts/collect-claude-usage.sh
git commit -m "feat(scripts): add Claude Code usage collection script"
```

---

## Task 2: 创建主同步脚本（第 1 部分：基础结构和日志）

**Files:**
- Create: `home/scripts/sync-ai-usage.sh`

**Step 1: 创建脚本基础结构**

```bash
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
```

**Step 2: 设置执行权限**

Run: `chmod +x home/scripts/sync-ai-usage.sh`
Expected: 文件变为可执行

**Step 3: 测试基础结构**

Run: `./home/scripts/sync-ai-usage.sh`
Expected:
- 创建日志目录 `~/Library/Logs/blog-sync/`
- 创建日志文件 `~/Library/Logs/blog-sync/sync-usage-2026-03.log`
- 输出同步开始和完成信息

**Step 4: 验证日志文件**

Run: `cat ~/Library/Logs/blog-sync/sync-usage-2026-03.log`
Expected: 看到带时间戳的日志条目

**Step 5: 提交**

```bash
git add home/scripts/sync-ai-usage.sh
git commit -m "feat(scripts): add sync script base structure with logging"
```

---

## Task 3: 添加环境检查功能

**Files:**
- Modify: `home/scripts/sync-ai-usage.sh`

**Step 1: 添加环境检查函数**

在 `notify_error()` 函数后，`main()` 函数前添加:

```bash
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
    local missing_list=$(IFS=, ; echo "${missing_commands[*]}")
    log_error "Missing required commands: $missing_list"
    notify_error "缺少必需命令: $missing_list"
    exit $EXIT_ENV_FAIL
  fi

  log "✓ All required commands available"
}
```

**Step 2: 在 main 函数中调用环境检查**

修改 `main()` 函数:

```bash
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"

  # Check environment
  check_environment

  log "========== Sync Completed =========="
}
```

**Step 3: 测试环境检查**

Run: `./home/scripts/sync-ai-usage.sh`
Expected:
- 输出环境检查信息
- 显示项目目录和命令可用性
- 成功完成

**Step 4: 测试缺少命令的情况**

Run: `PATH=/usr/bin ./home/scripts/sync-ai-usage.sh`
Expected:
- 报错缺少命令
- 发送 macOS 通知
- 退出码为 3

**Step 5: 提交**

```bash
git add home/scripts/sync-ai-usage.sh
git commit -m "feat(scripts): add environment check for sync script"
```

---

## Task 4: 添加数据收集功能

**Files:**
- Modify: `home/scripts/sync-ai-usage.sh`

**Step 1: 添加数据收集函数**

在 `check_environment()` 函数后添加:

```bash
# Data collection function
collect_data() {
  log "Collecting AI usage data..."

  local collection_failed=0

  # Collect Claude Code usage
  log "Collecting Claude Code usage..."
  if ./home/scripts/collect-claude-usage.sh "$DEVICE_NAME" >> "$LOG_FILE" 2>&1; then
    log "✓ Claude Code data collected: ${DEVICE_NAME}-${YEAR_MONTH}.json"
  else
    log_error "Failed to collect Claude Code usage"
    collection_failed=1
  fi

  # Collect Codex usage
  log "Collecting Codex usage..."
  if ./home/scripts/collect-codex-usage.sh "$DEVICE_NAME" >> "$LOG_FILE" 2>&1; then
    log "✓ Codex data collected: ${DEVICE_NAME}-codex-${YEAR_MONTH}.json"
  else
    log_error "Failed to collect Codex usage"
    collection_failed=1
  fi

  # Check if both collections failed
  if [[ $collection_failed -eq 1 ]]; then
    # Check if any files were created
    local claude_file="home/ai/usages/${DEVICE_NAME}-${YEAR_MONTH}.json"
    local codex_file="home/ai/usages/${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

    if [[ ! -f "$claude_file" ]] && [[ ! -f "$codex_file" ]]; then
      log_error "Both data collections failed"
      notify_error "数据收集失败：ccusage 和 codex 都无法执行"
      exit $EXIT_COLLECTION_FAIL
    else
      log "⚠ Partial collection success, continuing..."
    fi
  fi
}
```

**Step 2: 在 main 函数中调用数据收集**

修改 `main()` 函数:

```bash
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"

  # Check environment
  check_environment

  # Collect data
  collect_data

  log "========== Sync Completed =========="
}
```

**Step 3: 测试数据收集**

Run: `./home/scripts/sync-ai-usage.sh`
Expected:
- 输出收集 Claude Code 和 Codex 数据的信息
- 创建两个 JSON 文件
- 成功完成

**Step 4: 验证生成的文件**

Run: `ls -lh home/ai/usages/$(hostname | cut -d'.' -f1)-*-2026-03.json`
Expected: 看到两个文件（Claude Code 和 Codex）

**Step 5: 提交**

```bash
git add home/scripts/sync-ai-usage.sh
git commit -m "feat(scripts): add data collection for ccusage and codex"
```

---

## Task 5: 添加 Git 操作功能

**Files:**
- Modify: `home/scripts/sync-ai-usage.sh`

**Step 1: 添加 Git 操作函数**

在 `collect_data()` 函数后添加:

```bash
# Git operations function
git_operations() {
  log "Performing Git operations..."

  # Pull latest changes
  log "Pulling latest changes..."
  if ! git pull --rebase origin master >> "$LOG_FILE" 2>&1; then
    log_error "Failed to pull latest changes"
    notify_error "git pull 失败，可能有冲突需要手动解决"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Pulled latest changes"

  # Check for changes
  log "Checking for changes..."
  local changes=$(git status --porcelain home/ai/usages/)

  if [[ -z "$changes" ]]; then
    log "No changes detected, skipping commit"
    return 0
  fi

  local file_count=$(echo "$changes" | wc -l | tr -d ' ')
  log "Changes detected in $file_count file(s)"

  # Add changes
  log "Adding changes..."
  git add home/ai/usages/*.json
  log "✓ Changes staged"

  # Commit changes
  log "Committing changes..."
  local commit_message="chore(ai): sync usage data for ${DEVICE_NAME} ${YEAR_MONTH}

- Claude Code: ${DEVICE_NAME}-${YEAR_MONTH}.json
- Codex: ${DEVICE_NAME}-codex-${YEAR_MONTH}.json"

  if ! git commit -m "$commit_message" >> "$LOG_FILE" 2>&1; then
    log_error "Failed to commit changes"
    notify_error "git commit 失败"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Changes committed"

  # Push to remote
  log "Pushing to GitHub..."
  if ! git push origin master >> "$LOG_FILE" 2>&1; then
    log_error "Failed to push to GitHub"
    notify_error "git push 失败 - 可能是网络问题，本地提交已保留"
    exit $EXIT_GIT_FAIL
  fi
  log "✓ Successfully pushed to origin/master"
}
```

**Step 2: 在 main 函数中调用 Git 操作**

修改 `main()` 函数:

```bash
main() {
  log "========== Sync Started =========="
  log "Device: $DEVICE_NAME"
  log "Year-Month: $YEAR_MONTH"

  # Check environment
  check_environment

  # Collect data
  collect_data

  # Git operations
  git_operations

  log "========== Sync Completed =========="
}
```

**Step 3: 测试 Git 操作（无变化场景）**

Run: `./home/scripts/sync-ai-usage.sh` (运行两次)
Expected:
- 第一次：收集数据并提交
- 第二次：检测到无变化，跳过提交

**Step 4: 验证 Git 提交**

Run: `git log --oneline -1`
Expected: 看到 "chore(ai): sync usage data" 提交

**Step 5: 提交**

```bash
git add home/scripts/sync-ai-usage.sh
git commit -m "feat(scripts): add Git operations for sync script"
```

---

## Task 6: 创建 Cron 安装脚本

**Files:**
- Create: `home/scripts/install-cron.sh`

**Step 1: 创建安装脚本**

```bash
#!/bin/bash
# home/scripts/install-cron.sh
# Install cron job for AI usage data sync

set -e

# Get absolute path to sync script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-ai-usage.sh"

# Verify sync script exists
if [[ ! -f "$SYNC_SCRIPT" ]]; then
  echo "Error: Sync script not found at $SYNC_SCRIPT"
  exit 1
fi

# Cron job definition
CRON_JOB="0 23 * * * $SYNC_SCRIPT >> ~/Library/Logs/blog-sync/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SYNC_SCRIPT"; then
  echo "Cron job already exists for: $SYNC_SCRIPT"
  echo ""
  echo "Current crontab:"
  crontab -l | grep "$SYNC_SCRIPT"
  exit 0
fi

# Add cron job
echo "Installing cron job..."
(crontab -l 2>/dev/null; echo ""; echo "# AI Usage Data Sync - Runs daily at 23:00"; echo "$CRON_JOB") | crontab -

echo "✓ Cron job installed successfully"
echo ""
echo "Schedule: Daily at 23:00"
echo "Script: $SYNC_SCRIPT"
echo "Logs: ~/Library/Logs/blog-sync/"
echo ""
echo "To view installed cron jobs:"
echo "  crontab -l"
echo ""
echo "To test the script manually:"
echo "  $SYNC_SCRIPT"
```

**Step 2: 设置执行权限**

Run: `chmod +x home/scripts/install-cron.sh`
Expected: 文件变为可执行

**Step 3: 测试安装脚本（不实际安装）**

Run: `cat home/scripts/install-cron.sh | grep -A 5 "CRON_JOB="`
Expected: 看到正确的 cron 配置

**Step 4: 提交**

```bash
git add home/scripts/install-cron.sh
git commit -m "feat(scripts): add cron installation script"
```

---

## Task 7: 创建 Cron 卸载脚本

**Files:**
- Create: `home/scripts/uninstall-cron.sh`

**Step 1: 创建卸载脚本**

```bash
#!/bin/bash
# home/scripts/uninstall-cron.sh
# Uninstall cron job for AI usage data sync

set -e

# Get absolute path to sync script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-ai-usage.sh"

# Check if cron job exists
if ! crontab -l 2>/dev/null | grep -q "$SYNC_SCRIPT"; then
  echo "No cron job found for: $SYNC_SCRIPT"
  exit 0
fi

# Remove cron job
echo "Removing cron job..."
crontab -l 2>/dev/null | grep -v "$SYNC_SCRIPT" | crontab -

echo "✓ Cron job removed successfully"
echo ""
echo "The sync script is still available at:"
echo "  $SYNC_SCRIPT"
echo ""
echo "Logs are preserved at:"
echo "  ~/Library/Logs/blog-sync/"
```

**Step 2: 设置执行权限**

Run: `chmod +x home/scripts/uninstall-cron.sh`
Expected: 文件变为可执行

**Step 3: 提交**

```bash
git add home/scripts/uninstall-cron.sh
git commit -m "feat(scripts): add cron uninstallation script"
```

---

## Task 8: 创建 README 文档

**Files:**
- Create: `home/scripts/README-sync.md`

**Step 1: 创建文档**

```markdown
# AI Usage Data Sync Scripts

自动同步 AI 使用数据（Claude Code + Codex）到 Git 仓库的脚本集合。

## 脚本说明

### 数据收集脚本

- `collect-claude-usage.sh` - 收集 Claude Code 使用数据
- `collect-codex-usage.sh` - 收集 Codex 使用数据

### 自动同步脚本

- `sync-ai-usage.sh` - 主同步脚本，自动收集数据并提交到 Git

### Cron 管理脚本

- `install-cron.sh` - 安装 cron 任务（每天 23:00 执行）
- `uninstall-cron.sh` - 卸载 cron 任务

## 快速开始

### 1. 手动运行同步

```bash
./home/scripts/sync-ai-usage.sh
```

### 2. 安装自动同步（推荐）

```bash
./home/scripts/install-cron.sh
```

这将创建一个 cron 任务，每天 23:00 自动运行同步。

### 3. 查看日志

```bash
# 查看当月日志
cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log

# 查看 cron 执行日志
cat ~/Library/Logs/blog-sync/cron.log

# 实时监控日志
tail -f ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log
```

### 4. 卸载自动同步

```bash
./home/scripts/uninstall-cron.sh
```

## 工作流程

1. **环境检查** - 验证必需命令（ccusage, pnpx, git）和项目目录
2. **数据收集** - 收集 Claude Code 和 Codex 使用数据
3. **Git 同步** - 拉取最新代码，检查变化，提交并推送
4. **日志记录** - 记录所有操作到日志文件
5. **错误通知** - 失败时发送 macOS 通知

## 日志位置

- 主日志：`~/Library/Logs/blog-sync/sync-usage-YYYY-MM.log`
- Cron 日志：`~/Library/Logs/blog-sync/cron.log`

## 错误处理

脚本会在以下情况发送 macOS 通知：

- 缺少必需命令（ccusage, pnpx, git）
- 数据收集完全失败
- Git 操作失败（pull, commit, push）

通知包含失败原因和日志路径，方便排查问题。

## 退出码

- `0` - 成功
- `1` - 数据收集失败
- `2` - Git 操作失败
- `3` - 环境检查失败

## 注意事项

1. **Mac 休眠** - Cron 在 Mac 休眠时不会执行，确保 23:00 时 Mac 处于唤醒状态
2. **网络连接** - Git push 需要网络连接，失败时本地提交会保留
3. **Git 冲突** - 如果有冲突需要手动解决，脚本会发送通知
4. **命令依赖** - 确保已安装 ccusage 和 @ccusage/codex

## 故障排查

### 任务未执行

```bash
# 检查 cron 任务是否安装
crontab -l | grep sync-ai-usage

# 检查 cron 日志
cat ~/Library/Logs/blog-sync/cron.log
```

### 数据未更新

```bash
# 检查同步日志
cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log

# 手动运行测试
./home/scripts/sync-ai-usage.sh
```

### 通知未收到

检查系统偏好设置 > 通知，确保允许脚本发送通知。

## 相关文档

- 设计文档：`docs/plans/2026-03-20-cron-sync-ai-usage-design.md`
- 数据格式：`home/ai/usages/README.md`
- 集成文档：`docs/ai-usage-codex-integration.md`
```

**Step 2: 提交**

```bash
git add home/scripts/README-sync.md
git commit -m "docs(scripts): add README for sync scripts"
```

---

## Task 9: 端到端测试

**Files:**
- Test: All scripts

**Step 1: 清理测试环境**

```bash
# 删除测试生成的文件（如果存在）
rm -f home/ai/usages/$(hostname | cut -d'.' -f1)-2026-03.json
rm -f home/ai/usages/$(hostname | cut -d'.' -f1)-codex-2026-03.json

# 重置 Git（如果有测试提交）
git reset --soft HEAD~1  # 仅在有测试提交时执行
```

**Step 2: 测试完整流程**

Run: `./home/scripts/sync-ai-usage.sh`
Expected:
- 环境检查通过
- 收集两个数据文件
- Git 提交并推送成功
- 日志记录完整

**Step 3: 验证数据文件**

Run: `ls -lh home/ai/usages/$(hostname | cut -d'.' -f1)-*-2026-03.json`
Expected: 看到两个 JSON 文件，大小合理

**Step 4: 验证 Git 提交**

Run: `git log --oneline -1`
Expected: 看到 "chore(ai): sync usage data" 提交

**Step 5: 验证日志**

Run: `tail -20 ~/Library/Logs/blog-sync/sync-usage-2026-03.log`
Expected: 看到完整的执行日志，包括开始、各步骤、完成

**Step 6: 测试无变化场景**

Run: `./home/scripts/sync-ai-usage.sh`
Expected: 输出 "No changes detected, skipping commit"

**Step 7: 测试 Cron 安装（可选，不实际安装）**

Run: `./home/scripts/install-cron.sh --help 2>&1 || ./home/scripts/install-cron.sh`
Expected: 显示安装信息（如果已安装则显示已存在）

---

## Task 10: 最终提交和文档更新

**Files:**
- Modify: `home/ai/usages/README.md` (添加自动同步说明)

**Step 1: 更新 usages README**

在 `home/ai/usages/README.md` 的 "收集方法" 部分后添加:

```markdown
## 自动同步（推荐）

### 使用 Cron 自动同步

项目提供了自动同步脚本，每天 23:00 自动收集并提交数据：

```bash
# 安装自动同步
./home/scripts/install-cron.sh

# 查看日志
cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log

# 卸载自动同步
./home/scripts/uninstall-cron.sh
```

详细说明请参考：`home/scripts/README-sync.md`
```

**Step 2: 提交所有更改**

```bash
git add home/ai/usages/README.md
git commit -m "docs(ai): add auto-sync instructions to usages README"
```

**Step 3: 推送到 GitHub**

Run: `git push origin master`
Expected: 所有提交成功推送

**Step 4: 验证 GitHub**

访问 GitHub 仓库，确认：
- 所有脚本文件已提交
- README 文档已更新
- 提交历史清晰

---

## 完成检查清单

- [ ] `collect-claude-usage.sh` 创建并测试通过
- [ ] `sync-ai-usage.sh` 创建并包含所有功能
- [ ] 环境检查功能正常
- [ ] 数据收集功能正常
- [ ] Git 操作功能正常
- [ ] 日志系统工作正常
- [ ] macOS 通知功能正常
- [ ] `install-cron.sh` 创建
- [ ] `uninstall-cron.sh` 创建
- [ ] `README-sync.md` 创建
- [ ] `home/ai/usages/README.md` 更新
- [ ] 端到端测试通过
- [ ] 所有更改已提交并推送

## 后续步骤

1. **实际安装 Cron**（在用户确认后）:
   ```bash
   ./home/scripts/install-cron.sh
   ```

2. **验证 Cron 运行**（第二天检查）:
   ```bash
   cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log
   ```

3. **可选优化**（未来）:
   - 改用 launchd 支持错过时间补运行
   - 添加 Slack/邮件通知
   - 添加数据验证
   - 添加重试机制
