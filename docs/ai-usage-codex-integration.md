# Codex Usage Integration

## Overview

This document describes how Codex usage statistics are integrated with Claude Code usage data in the AI usage dashboard.

## Architecture

### Data Sources

1. **Claude Code**: `ccusage -j` - Claude Code CLI usage
2. **Codex**: `pnpx @ccusage/codex -j` - Codex usage

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐
│ ccusage -j      │────▶│ {device}-{month} │
└─────────────────┘     │ .json            │
                        └──────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ @ccusage/codex  │────▶│ {device}-codex-  │────▶│ ai-usage-loader │
│ -j              │     │ {month}.json     │     └─────────────────┘
└─────────────────┘     └──────────────────┘              │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Unified Daily   │
                                                  │ Usage Format    │
                                                  └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ AI Dashboard    │
                                                  └─────────────────┘
```

### Format Normalization

Both formats are normalized to a unified `DailyUsage` interface:

```typescript
interface DailyUsage {
  date: string              // ISO format: "2026-03-11"
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
}
```

#### Claude Code → DailyUsage
- Direct mapping (already in correct format)
- No transformation needed

#### Codex → DailyUsage
- Date: "Mar 11, 2026" → "2026-03-11"
- `cachedInputTokens` → `cacheReadTokens`
- `costUSD` → `totalCost`
- `cacheCreationTokens` set to 0 (not available)
- Models object → `modelsUsed` array + `modelBreakdowns` array

## File Naming Convention

- Claude Code: `{device}-{YYYY-MM}.json`
- Codex: `{device}-codex-{YYYY-MM}.json`

The `-codex-` infix distinguishes Codex files from Claude Code files.

## Collection Scripts

### Automated Collection

```bash
# Claude Code
./home/scripts/collect-usage.sh [device-name]

# Codex
./home/scripts/collect-codex-usage.sh [device-name]
```

### Manual Collection

```bash
# Claude Code
ccusage -j > home/ai/usages/macbook-2026-03.json

# Codex
pnpx @ccusage/codex -j > home/ai/usages/macbook-codex-2026-03.json
```

## Testing

Run tests:
```bash
cd home && npm test
```

Key test files:
- `src/utils/__tests__/codex-usage.test.ts` - Codex normalization
- `src/utils/__tests__/ai-usage-loader.test.ts` - Format detection
- `src/utils/__tests__/ai-usage-integration.test.ts` - End-to-end integration

## Troubleshooting

### Codex data not showing up

1. Check file naming: Must include `-codex-` infix
2. Verify JSON format: Run `pnpx @ccusage/codex -j` to see expected format
3. Check browser console for errors
4. Verify file is in `home/ai/usages/` directory

### Date parsing errors

Codex uses "Mar 11, 2026" format. If dates are incorrect:
1. Check `parseCodexDate()` function in `src/utils/codex-usage.ts`
2. Verify browser locale settings
3. Check for timezone issues

### Cost calculations incorrect

- Claude Code: `totalCost` field
- Codex: `costUSD` field
- Both are summed in the dashboard

If costs seem wrong, verify the source data files.
