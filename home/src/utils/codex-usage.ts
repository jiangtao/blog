import type { DailyUsage, CodexUsageData, CodexDailyUsage } from '../types/ai-usage'

/**
 * Convert Codex date format "Mar 11, 2026" to ISO format "2026-03-11"
 */
function parseCodexDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normalize Codex usage data to unified DailyUsage format
 */
export function normalizeCodexData(codexData: CodexUsageData): DailyUsage[] {
  return codexData.daily.map((day: CodexDailyUsage) => {
    const modelBreakdowns = Object.entries(day.models).map(([modelName, usage]) => ({
      modelName,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationTokens: 0, // Codex doesn't have this
      cacheReadTokens: usage.cachedInputTokens,
      cost: 0 // Per-model cost not available in Codex format
    }))

    return {
      date: parseCodexDate(day.date),
      inputTokens: day.inputTokens,
      outputTokens: day.outputTokens,
      cacheCreationTokens: 0,
      cacheReadTokens: day.cachedInputTokens,
      totalTokens: day.totalTokens,
      totalCost: day.costUSD,
      modelsUsed: Object.keys(day.models),
      modelBreakdowns
    }
  })
}
