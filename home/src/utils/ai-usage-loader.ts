// src/utils/ai-usage-loader.ts
import fs from 'fs/promises'
import path from 'path'
import NP from 'number-precision'
import type { AIUsageData, DeviceMonthlyData, ProcessedDeviceData, DailyUsage, CodexUsageData, ModelBreakdown } from '../types/ai-usage'
import { parseDeviceFilename, calculateSummary, aggregateByMonth } from './ai-usage'
import { normalizeCodexData } from './codex-usage'

NP.enableBoundaryChecking(false)

function getUsageDir() {
  return path.join(process.cwd(), 'ai', 'usages')
}

type FileFormat = 'claude-code' | 'codex'

export function detectFileFormat(data: unknown): FileFormat {
  if (!data || typeof data !== 'object' || !('daily' in data)) {
    return 'claude-code' // default
  }

  const typedData = data as { daily: unknown }
  if (!Array.isArray(typedData.daily) || typedData.daily.length === 0) {
    return 'claude-code' // default
  }

  const firstDay = typedData.daily[0]
  if (!firstDay || typeof firstDay !== 'object') {
    return 'claude-code' // default
  }

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
  const byDeviceDate: Record<string, Map<string, Partial<Record<FileFormat, DailyUsage>>>> = {}
  let allDaily: DailyUsage[] = []

  try {
    const usageDir = getUsageDir()
    const files = await fs.readdir(usageDir)
    const jsonFiles = files
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .sort((a, b) => {
        const dateCompare = getSnapshotSortKey(a).localeCompare(getSnapshotSortKey(b))
        return dateCompare || a.localeCompare(b)
      })

    for (const file of jsonFiles) {
      const parsed = parseDeviceFilename(file)
      if (!parsed) continue

      const { deviceName } = parsed
      const filePath = path.join(usageDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const rawData = JSON.parse(content)

      // Detect format and normalize
      const format = detectFileFormat(rawData)
      const dailyData = format === 'codex'
        ? normalizeCodexData(rawData as CodexUsageData)
        : (rawData as DeviceMonthlyData).daily

      if (!byDeviceDate[deviceName]) {
        byDeviceDate[deviceName] = new Map()
      }

      for (const day of dailyData) {
        const dailyByFormat = byDeviceDate[deviceName].get(day.date) || {}
        dailyByFormat[format] = cloneDailyUsage(day)
        byDeviceDate[deviceName].set(day.date, dailyByFormat)
      }
    }
  } catch (error) {
    // Directory doesn't exist or is empty
    console.warn('No AI usage data found:', error)
  }

  for (const [deviceName, dailyByDate] of Object.entries(byDeviceDate)) {
    const deviceDaily = Array.from(dailyByDate.entries())
      .map(([, dailyByFormat]) => mergeDailyData([], Object.values(dailyByFormat) as DailyUsage[]))
      .flat()
      .sort((a, b) => a.date.localeCompare(b.date))

    byDevice[deviceName] = {
      byMonth: aggregateByMonth(deviceDaily)
    }

    allDaily = mergeDailyData(allDaily, deviceDaily)
  }

  // Calculate total (all devices merged by actual usage date)
  const totalByMonth = aggregateByMonth(allDaily)

  // Calculate summary
  const summary = calculateSummary(allDaily)

  return {
    byDevice,
    total: { byMonth: totalByMonth },
    summary: {
      ...summary,
      deviceList: Object.keys(byDevice).sort()
    }
  }
}

function getSnapshotSortKey(filename: string) {
  const match = filename.match(/-(\d{4}-\d{2}(?:-\d{2})?)\.json$/)
  return match?.[1] || ''
}

function mergeDailyData(existing: DailyUsage[], incoming: DailyUsage[]) {
  const merged = new Map<string, DailyUsage>()

  for (const day of existing) {
    merged.set(day.date, cloneDailyUsage(day))
  }

  for (const day of incoming) {
    const current = merged.get(day.date)
    merged.set(day.date, current ? mergeDailyUsage(current, day) : cloneDailyUsage(day))
  }

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function cloneDailyUsage(day: DailyUsage): DailyUsage {
  return {
    ...day,
    modelsUsed: [...day.modelsUsed],
    modelBreakdowns: day.modelBreakdowns.map(breakdown => ({ ...breakdown }))
  }
}

function mergeDailyUsage(left: DailyUsage, right: DailyUsage): DailyUsage {
  return {
    date: left.date,
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cacheCreationTokens: left.cacheCreationTokens + right.cacheCreationTokens,
    cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    totalCost: NP.plus(left.totalCost, right.totalCost),
    modelsUsed: Array.from(new Set([...left.modelsUsed, ...right.modelsUsed])).sort(),
    modelBreakdowns: mergeModelBreakdowns(left.modelBreakdowns, right.modelBreakdowns)
  }
}

function mergeModelBreakdowns(left: ModelBreakdown[], right: ModelBreakdown[]) {
  const merged = new Map<string, ModelBreakdown>()

  for (const breakdown of [...left, ...right]) {
    const current = merged.get(breakdown.modelName)
    if (!current) {
      merged.set(breakdown.modelName, { ...breakdown })
      continue
    }

    current.inputTokens += breakdown.inputTokens
    current.outputTokens += breakdown.outputTokens
    current.cacheCreationTokens += breakdown.cacheCreationTokens
    current.cacheReadTokens += breakdown.cacheReadTokens
    current.cost = NP.plus(current.cost, breakdown.cost)
  }

  return Array.from(merged.values()).sort((a, b) => a.modelName.localeCompare(b.modelName))
}
