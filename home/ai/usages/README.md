# AI Usage 数据

## 文件命名规范

`{设备名}-{YYYY-MM}.json`

示例：
- macbook-2026-03.json
- macmini-2026-02.json

## 数据格式

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

## 收集方法

在各设备上运行：

```bash
ccusage -j > macbook-$(date +%Y-%m).json
```

然后将文件复制到此目录。
