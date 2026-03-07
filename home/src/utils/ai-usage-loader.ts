// src/utils/ai-usage-loader.ts
import fs from 'fs/promises'
import path from 'path'
import type { AIUsageData, DeviceMonthlyData, ProcessedDeviceData, DailyUsage } from '../types/ai-usage'
import { parseDeviceFilename, calculateSummary, aggregateByMonth } from './ai-usage'

const USAGE_DIR = path.join(process.cwd(), 'ai', 'usages')

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
      const data: DeviceMonthlyData = JSON.parse(content)

      if (!byDevice[deviceName]) {
        byDevice[deviceName] = { byMonth: {} }
      }

      // Merge if same device-month exists
      const existing = byDevice[deviceName].byMonth[yearMonth] || []
      byDevice[deviceName].byMonth[yearMonth] = mergeDailyData(existing, data.daily)
      allDaily = allDaily.concat(data.daily)
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
