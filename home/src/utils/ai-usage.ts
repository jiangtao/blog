// src/utils/ai-usage.ts
import type { DailyUsage } from '../types/ai-usage'

export function parseDeviceFilename(filename: string): { deviceName: string; yearMonth: string } | null {
  // 支持格式: {设备名}-{YYYY-MM-DD}.json 或 {设备名}-{YYYY-MM}.json
  const match = filename.match(/^(.*)-(\d{4}-\d{2}(?:-\d{2})?)\.json$/)
  if (!match) return null
  const datePart = match[2]
  // 提取年月 (YYYY-MM)
  const yearMonth = datePart.substring(0, 7)
  return {
    deviceName: match[1],
    yearMonth
  }
}

export function calculateSummary(daily: DailyUsage[]) {
  let totalTokens = 0
  let totalCost = 0
  const byModel: Record<string, number> = {}

  for (const day of daily) {
    totalTokens += day.totalTokens
    totalCost += day.totalCost

    for (const breakdown of day.modelBreakdowns) {
      const modelTokens = breakdown.inputTokens + breakdown.outputTokens + breakdown.cacheReadTokens
      byModel[breakdown.modelName] = (byModel[breakdown.modelName] || 0) + modelTokens
    }
  }

  return { totalTokens, totalCost, byModel }
}

export function aggregateByMonth(daily: DailyUsage[]): Record<string, DailyUsage[]> {
  const byMonth: Record<string, DailyUsage[]> = {}
  for (const day of daily) {
    const month = day.date.substring(0, 7)
    if (!byMonth[month]) {
      byMonth[month] = []
    }
    byMonth[month].push(day)
  }
  return byMonth
}
