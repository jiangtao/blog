# AI Usage Data Sync Scripts

自动同步 AI 使用数据（Claude Code + Codex）到 Git 仓库的脚本集合。

## 脚本说明

### 数据收集脚本

- `collect-claude-usage.sh`：收集 Claude Code 使用数据
- `collect-codex-usage.sh`：收集 Codex 使用数据

### 自动同步脚本

- `sync-ai-usage.sh`：检查环境、收集数据、执行 Git 同步

### Cron 管理脚本

- `install-cron.sh`：安装 cron 任务（每天 23:00 执行）
- `uninstall-cron.sh`：卸载 cron 任务

## 快速开始

### 手动运行同步

```bash
./home/scripts/sync-ai-usage.sh
```

### 安装自动同步

```bash
./home/scripts/install-cron.sh
```

### 查看日志

```bash
cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log
cat ~/Library/Logs/blog-sync/cron.log
tail -f ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log
```

### 卸载自动同步

```bash
./home/scripts/uninstall-cron.sh
```

## 工作流程

1. 检查项目目录和依赖命令（`ccusage`、`pnpx`、`git`）
2. 收集 Claude Code 和 Codex 使用数据
3. `git pull --rebase` 后检查 `home/ai/usages/` 是否有变化
4. 有变化则自动 `add`、`commit`、`push`
5. 把执行过程写入日志，失败时发送 macOS 通知

## 日志位置

- 主日志：`~/Library/Logs/blog-sync/sync-usage-YYYY-MM.log`
- Cron 日志：`~/Library/Logs/blog-sync/cron.log`

## 退出码

- `0`：成功
- `1`：数据收集失败
- `2`：Git 操作失败
- `3`：环境检查失败

## 注意事项

1. Cron 在 Mac 休眠时不会执行，23:00 需要设备处于唤醒状态
2. `git push` 需要网络连接，失败时本地提交会保留
3. 如果 `git pull --rebase` 冲突，需要手动处理
4. 请先安装 `ccusage` 和 `@ccusage/codex`

## 故障排查

### 任务未执行

```bash
crontab -l | grep sync-ai-usage
cat ~/Library/Logs/blog-sync/cron.log
```

### 数据未更新

```bash
cat ~/Library/Logs/blog-sync/sync-usage-$(date +%Y-%m).log
./home/scripts/sync-ai-usage.sh
```

### 通知未收到

检查 macOS 的“系统设置 > 通知”，确认允许脚本发送通知。
