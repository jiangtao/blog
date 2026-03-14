// src/utils/ai-usage-loader.ts
import fs from 'fs/promises'
import path from 'path'
import type { AIUsageData, DeviceMonthlyData, ProcessedDeviceData, DailyUsage, CodexUsageData } from '../types/ai-usage'
import { parseDeviceFilename, calculateSummary, aggregateByMonth } from './ai-usage'
import { normalizeCodexData } from './codex-usage'

const USAGE_DIR = path.join(process.cwd(), 'ai', 'usages')

type FileFormat = 'claude-code' | 'codex'

export function detectFileFormat(data: any): FileFormat {
  if (!data.daily || !Array.isArray(data.daily) || data.daily.length === 0) {
    return 'claude-code' // default
  }

  const firstDay = data.daily[0]

  // Codex format has: costUSD, cachedInputTokens, models object
  if ('costUSD' in firstDay && 'cachedInputTokens' in firstDay && 'models' in firstDay) {
    return 'codex'
  }

  // Claude Code format has: totalCost, modelsUsed array, modelBreakdowns array
  if ('totalCost' in firstDay && 'modelsUsed' in firstDay && 'modelBreakdowns' in firstDay) {
    return 'claude-code'
  }

  return 'claude-code' // default
}

export async function loadAIUsageData(): Promise<AIUsageData> {
  const byDevice: Record<string, ProcessedDeviceData> = {}
  let allDaily: DailyUsage[] = []

  try {
    const files = await fs.readdir(USAGE_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'))

    for (const file of jsonFiles) {
      const parsed = parseDeviceFilename(file)
      if (!parsed) continue

      const { deviceName, yearMonth } = parsed
      const filePath = path.join(USAGE_DIR, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const rawData = JSON.parse(content)

      // Detect format and normalize
      const format = detectFileFormat(rawData)
      const dailyData = format === 'codex'
        ? normalizeCodexData(rawData as CodexUsageData)
        : (rawData as DeviceMonthlyData).daily

      if (!byDevice[deviceName]) {
        byDevice[deviceName] = { byMonth: {} }
      }

      // Merge if same device-month exists
      const existing = byDevice[deviceName].byMonth[yearMonth] || []
      byDevice[deviceName].byMonth[yearMonth] = mergeDailyData(existing, dailyData)
      allDaily = allDaily.concat(dailyData)
    }
  } catch (error) {
    // Directory doesn't exist or is empty
    console.warn('No AI usage data found:', error)
  }

  // Calculate total (all devices merged)
  const totalByMonth = aggregateByMonth(allDaily)

  // Calculate summary
  const summary = calculateSummary(allDaily)

  return {
    byDevice,
    total: { byMonth: totalByMonth },
    summary: {
      ...summary,
      deviceList: Object.keys(byDevice)
    }
  }
}

function mergeDailyData(existing: DailyUsage[], incoming: DailyUsage[]) {
  const merged = new Map<string, DailyUsage>()

  for (const day of existing) {
    merged.set(day.date, day)
  }

  for (const day of incoming) {
    merged.set(day.date, day)
  }

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date))
}
