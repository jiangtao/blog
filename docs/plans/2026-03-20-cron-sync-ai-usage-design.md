# macOS Cron 自动同步 AI 使用数据 - 设计方案

**日期**: 2026-03-20
**状态**: 设计完成，待实现

## 概述

创建一个 macOS cron 任务，每天自动收集 Claude Code 和 Codex 的使用数据，提交到 Git 仓库并推送到 GitHub，实现自动部署到博客。

## 需求

- **运行环境**: macOS 本地
- **执行频率**: 每天晚上 23:00
- **数据源**: ccusage（Claude Code）和 @ccusage/codex（Codex）
- **数据格式**: 全量月度统计 JSON
- **提交策略**: 合并为一个 commit，仅在有变化时提交
- **错误处理**: macOS 通知 + 日志文件
- **日志位置**: `~/Library/Logs/blog-sync/`

## 整体架构

### 组件结构

```
┌─────────────────────────────────────────────────────────────┐
│                     macOS Cron (23:00)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              sync-ai-usage.sh (主脚本)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. 环境检查 (PATH, 命令可用性)                       │  │
│  │ 2. 收集数据 (ccusage + codex)                        │  │
│  │ 3. Git 操作 (add, commit, push)                      │  │
│  │ 4. 日志记录                                           │  │
│  │ 5. 错误通知                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ ccusage -j  │  │ @ccusage/   │  │ Git Push    │
│             │  │ codex -j    │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              home/ai/usages/*.json
                         │
                         ▼
                   GitHub Repo
                         │
                         ▼
                  Auto Deploy (博客)
```

### 核心组件

1. **主脚本**: `home/scripts/sync-ai-usage.sh`
2. **Cron 配置**: 通过 crontab 设置
3. **安装脚本**: `home/scripts/install-cron.sh`
4. **卸载脚本**: `home/scripts/uninstall-cron.sh`
5. **日志系统**: `~/Library/Logs/blog-sync/sync-usage-YYYY-MM.log`

## 详细设计

### 1. 主脚本 (sync-ai-usage.sh)

#### 执行流程

```bash
#!/bin/bash
# home/scripts/sync-ai-usage.sh

# 1. 环境初始化
#    - 设置 PATH
#    - 进入项目目录
#    - 创建日志目录
#    - 初始化日志文件

# 2. 环境检查
#    - 检查 ccusage 命令
#    - 检查 pnpx 命令
#    - 检查 git 命令
#    - 检查项目目录

# 3. 数据收集
#    - 调用 collect-claude-usage.sh
#    - 调用 collect-codex-usage.sh
#    - 捕获输出和错误

# 4. Git 操作
#    - git pull --rebase (避免冲突)
#    - git status --porcelain (检查变化)
#    - git add home/ai/usages/*.json
#    - git commit -m "chore(ai): sync usage data for {hostname} {YYYY-MM}"
#    - git push origin master

# 5. 结果处理
#    - 记录成功日志
#    - 或发送失败通知
```

#### 环境变量

```bash
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"
export HOME="/Users/jt"
```

#### 日志格式

```
[2026-03-20 23:00:01] ========== Sync Started ==========
[2026-03-20 23:00:02] Collecting Claude Code usage...
[2026-03-20 23:00:05] ✓ Claude Code data collected: macbook-2026-03.json
[2026-03-20 23:00:05] Collecting Codex usage...
[2026-03-20 23:00:08] ✓ Codex data collected: macbook-codex-2026-03.json
[2026-03-20 23:00:08] Checking for changes...
[2026-03-20 23:00:09] Changes detected in 2 files
[2026-03-20 23:00:09] Committing changes...
[2026-03-20 23:00:10] Pushing to GitHub...
[2026-03-20 23:00:12] ✓ Successfully pushed to origin/master
[2026-03-20 23:00:12] ========== Sync Completed ==========
```

### 2. Cron 配置

#### Crontab 条目

```cron
# AI Usage Data Sync - Runs daily at 23:00
0 23 * * * /Users/jt/places/personal/blog/home/scripts/sync-ai-usage.sh >> ~/Library/Logs/blog-sync/cron.log 2>&1
```

#### 安装脚本 (install-cron.sh)

```bash
#!/bin/bash
# home/scripts/install-cron.sh

SCRIPT_PATH="/Users/jt/places/personal/blog/home/scripts/sync-ai-usage.sh"
CRON_JOB="0 23 * * * $SCRIPT_PATH >> ~/Library/Logs/blog-sync/cron.log 2>&1"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
  echo "Cron job already exists"
  exit 0
fi

# 添加 cron 任务
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✓ Cron job installed successfully"
echo "  Schedule: Daily at 23:00"
echo "  Script: $SCRIPT_PATH"
echo "  Logs: ~/Library/Logs/blog-sync/"
```

#### 卸载脚本 (uninstall-cron.sh)

```bash
#!/bin/bash
# home/scripts/uninstall-cron.sh

SCRIPT_PATH="/Users/jt/places/personal/blog/home/scripts/sync-ai-usage.sh"

# 移除包含该脚本的 cron 任务
crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" | crontab -

echo "✓ Cron job removed"
```

### 3. 日志和通知系统

#### 日志目录结构

```
~/Library/Logs/blog-sync/
├── sync-usage-2026-03.log    # 当月主日志
├── sync-usage-2026-02.log    # 上月日志
├── sync-usage-2026-01.log    # 更早日志
└── cron.log                  # Cron 执行日志
```

#### 日志函数

```bash
LOG_DIR="$HOME/Library/Logs/blog-sync"
LOG_FILE="$LOG_DIR/sync-usage-$(date +%Y-%m).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}
```

#### macOS 通知

**失败通知**:

```bash
notify_error() {
  local reason="$1"
  osascript -e "display notification \"原因: $reason\n查看日志: ~/Library/Logs/blog-sync/\" with title \"AI 使用数据同步失败\" subtitle \"时间: $(date +%H:%M)\""
}
```

**成功时**: 不发送通知，仅记录日志（避免每天打扰）

### 4. 错误处理

#### 错误场景和处理

| 错误类型 | 检测方法 | 处理方式 | 退出码 |
|---------|---------|---------|--------|
| 命令不存在 | `command -v ccusage` | 通知 + 日志 + 安装提示 | 3 |
| 网络问题 | `git push` 返回码 | 通知 + 日志 + 保留本地提交 | 2 |
| Git 冲突 | `git pull --rebase` 失败 | 通知 + 日志 + 需要手动解决 | 2 |
| 权限问题 | 目录/文件访问失败 | 通知 + 日志 + 权限提示 | 3 |
| 数据收集失败 | 收集脚本返回非零 | 记录错误但继续执行 | 1 |

#### 退出码定义

```bash
EXIT_SUCCESS=0          # 成功
EXIT_COLLECTION_FAIL=1  # 数据收集失败
EXIT_GIT_FAIL=2         # Git 操作失败
EXIT_ENV_FAIL=3         # 环境检查失败
```

#### 错误通知示例

```
标题: AI 使用数据同步失败
副标题: 时间: 23:00
内容: 原因: git push 失败 - 网络连接超时
      查看日志: ~/Library/Logs/blog-sync/
```

### 5. 月份切换处理

#### 自动检测

脚本使用 `date +%Y-%m` 生成文件名，自动处理月份切换：

```bash
YEAR_MONTH=$(date +%Y-%m)
DEVICE_NAME=$(hostname | cut -d'.' -f1)

# 3月31日: macbook-2026-03.json
# 4月1日:  macbook-2026-04.json (自动创建新文件)
```

#### 月度归档

- 旧月份文件保留在 `home/ai/usages/`
- 不需要额外归档操作
- Git 历史记录完整保留每月数据

### 6. Git 提交策略

#### 提交信息格式

```
chore(ai): sync usage data for {hostname} {YYYY-MM}

- Claude Code: {device}-{YYYY-MM}.json
- Codex: {device}-codex-{YYYY-MM}.json
```

#### 变化检测

```bash
# 检查是否有变化
if [[ -z $(git status --porcelain home/ai/usages/) ]]; then
  log "No changes detected, skipping commit"
  exit 0
fi
```

#### 推送前同步

```bash
# 避免冲突
git pull --rebase origin master || {
  log_error "Failed to pull latest changes"
  notify_error "git pull 失败，可能有冲突"
  exit $EXIT_GIT_FAIL
}
```

## 边界情况

### Mac 休眠问题

**问题**: Cron 在 Mac 休眠时不会执行，如果 23:00 时 Mac 休眠，任务会被跳过。

**解决方案**:
1. **当前方案**: 使用 cron（简单，但会错过休眠时间）
2. **可选方案**: 改用 launchd（支持错过时间后补运行）

**Launchd 配置示例** (可选):

```xml
<!-- ~/Library/LaunchAgents/com.jerret.blog.sync-ai-usage.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jerret.blog.sync-ai-usage</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/jt/places/personal/blog/home/scripts/sync-ai-usage.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/jt/Library/Logs/blog-sync/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/jt/Library/Logs/blog-sync/launchd-error.log</string>
</dict>
</plist>
```

### 数据收集失败

**场景**: ccusage 或 codex 命令失败

**处理**:
- 记录错误但继续执行另一个命令
- 如果两个都失败，发送通知
- 如果只有一个失败，仅记录日志

### 网络中断

**场景**: git push 失败

**处理**:
- 本地提交保留
- 下次运行时会自动推送（git 会合并多个提交）
- 发送通知提醒用户

## 测试计划

### 手动测试

1. **正常流程测试**
   ```bash
   ./home/scripts/sync-ai-usage.sh
   # 检查日志、Git 提交、GitHub 推送
   ```

2. **无变化测试**
   ```bash
   # 连续运行两次
   ./home/scripts/sync-ai-usage.sh
   ./home/scripts/sync-ai-usage.sh
   # 第二次应该跳过提交
   ```

3. **错误场景测试**
   ```bash
   # 模拟命令不存在
   PATH=/usr/bin ./home/scripts/sync-ai-usage.sh

   # 模拟网络问题
   # (断开网络后运行)
   ```

4. **月份切换测试**
   ```bash
   # 修改系统日期到月末/月初
   # 验证文件名正确生成
   ```

### Cron 测试

```bash
# 安装 cron
./home/scripts/install-cron.sh

# 查看 cron 任务
crontab -l

# 临时修改为 1 分钟后执行
# 验证执行结果

# 恢复正常时间
```

## 部署步骤

1. **创建脚本**
   - `sync-ai-usage.sh`
   - `install-cron.sh`
   - `uninstall-cron.sh`

2. **设置权限**
   ```bash
   chmod +x home/scripts/sync-ai-usage.sh
   chmod +x home/scripts/install-cron.sh
   chmod +x home/scripts/uninstall-cron.sh
   ```

3. **创建日志目录**
   ```bash
   mkdir -p ~/Library/Logs/blog-sync
   ```

4. **测试脚本**
   ```bash
   ./home/scripts/sync-ai-usage.sh
   ```

5. **安装 cron 任务**
   ```bash
   ./home/scripts/install-cron.sh
   ```

6. **验证安装**
   ```bash
   crontab -l
   ```

## 维护

### 日志清理

手动清理 3 个月前的日志：

```bash
find ~/Library/Logs/blog-sync -name "sync-usage-*.log" -mtime +90 -delete
```

或添加到 cron（每月 1 号清理）：

```cron
0 0 1 * * find ~/Library/Logs/blog-sync -name "sync-usage-*.log" -mtime +90 -delete
```

### 监控

定期检查：
- 日志文件：`~/Library/Logs/blog-sync/`
- GitHub 提交历史
- 博客 AI 使用统计页面

### 故障排查

1. **任务未执行**: 检查 `~/Library/Logs/blog-sync/cron.log`
2. **数据未更新**: 检查 `sync-usage-YYYY-MM.log`
3. **通知未收到**: 检查通知中心设置
4. **Git 冲突**: 手动解决后重新运行

## 未来优化

1. **改用 launchd**: 支持错过时间后补运行
2. **Slack/邮件通知**: 替代或补充 macOS 通知
3. **数据验证**: 检查 JSON 格式正确性
4. **重试机制**: 网络失败时自动重试
5. **健康检查**: 定期验证 cron 任务正常运行

## 参考资料

- 现有脚本: `home/scripts/collect-codex-usage.sh`
- 数据格式: `home/ai/usages/README.md`
- 集成文档: `docs/ai-usage-codex-integration.md`
