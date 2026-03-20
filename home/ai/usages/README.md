# AI Usage 数据

本目录存储 AI 工具的使用数据，支持两种格式：

1. **Claude Code** - Anthropic 官方 CLI 工具的使用数据
2. **Codex** - OpenAI Codex 的使用数据

## 文件命名规范

### Claude Code 格式
`{设备名}-{YYYY-MM}.json`

示例：
- `macbook-2026-03.json`
- `macmini-2026-02.json`

### Codex 格式
`{设备名}-codex-{YYYY-MM}.json`

示例：
- `macbook-codex-2026-03.json`
- `macmini-codex-2026-02.json`

## 数据格式

### Claude Code 格式

使用 `ccusage -j` 输出的原始 JSON 格式：

```json
{
  "daily": [
    {
      "date": "2026-03-01",
      "inputTokens": 15000,
      "outputTokens": 5000,
      "cacheCreationTokens": 0,
      "cacheReadTokens": 2000,
      "totalTokens": 22000,
      "totalCost": 0.05,
      "modelsUsed": ["claude-sonnet-4-6"],
      "modelBreakdowns": [...]
    }
  ]
}
```

### Codex 格式

使用 `@ccusage/codex -j` 输出的原始 JSON 格式：

```json
{
  "daily": [
    {
      "date": "2026-03-01",
      "completions": 42,
      "totalTokens": 15000,
      "totalCost": 0.30
    }
  ]
}
```

## 收集方法

### Claude Code

#### 方法 1：手动收集

在各设备上运行：

```bash
ccusage -j > macbook-$(date +%Y-%m).json
```

然后将文件复制到此目录。

#### 方法 2：使用脚本（推荐）

项目提供了自动化脚本，会自动使用设备名和当前月份：

```bash
# 在项目根目录运行
./home/scripts/collect-claude-usage.sh

# 或指定设备名
./home/scripts/collect-claude-usage.sh macbook
```

脚本会：
1. 自动获取设备名（默认使用 hostname）
2. 自动生成文件名（格式：`{设备名}-{YYYY-MM}.json`）
3. 收集使用数据并保存到 `home/ai/usages/` 目录
4. 提示如何提交数据

### Codex

#### 方法 1：手动收集

在各设备上运行：

```bash
pnpx @ccusage/codex -j > macbook-codex-$(date +%Y-%m).json
```

然后将文件复制到此目录。

#### 方法 2：使用脚本（推荐）

项目提供了自动化脚本，会自动使用设备名和当前月份：

```bash
# 在项目根目录运行
./home/scripts/collect-codex-usage.sh

# 或指定设备名
./home/scripts/collect-codex-usage.sh macbook
```

脚本会：
1. 自动获取设备名（默认使用 hostname）
2. 自动生成文件名（格式：`{设备名}-codex-{YYYY-MM}.json`）
3. 收集使用数据并保存到 `home/ai/usages/` 目录
4. 提示如何提交数据

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

## 提交数据

收集完数据后，提交到 Git 仓库：

```bash
# 添加新文件
git add home/ai/usages/{设备名}-{YYYY-MM}.json

# 提交（Claude Code）
git commit -m "chore(ai): add Claude Code usage for {设备名} {YYYY-MM}"

# 或提交（Codex）
git commit -m "chore(ai): add Codex usage for {设备名} {YYYY-MM}"

# 推送
git push
```

数据提交后，会自动显示在博客的 [AI 使用统计页面](/ai)。

## 注意事项

1. **隐私保护**：使用数据仅包含统计信息（token 数量、成本等），不包含具体对话内容
2. **定期收集**：建议每月收集一次数据，保持统计的连续性
3. **多设备支持**：不同设备的数据会自动合并显示
4. **文件格式**：确保文件名严格遵循命名规范，否则可能无法正确识别
