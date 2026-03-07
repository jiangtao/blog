// src/types/ai-usage.ts

export interface ModelBreakdown {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
}

export interface DeviceMonthlyData {
  daily: DailyUsage[]
}

export interface ProcessedDeviceData {
  byMonth: Record<string, DailyUsage[]>
}

export interface AIUsageData {
  byDevice: Record<string, ProcessedDeviceData>
  total: {
    byMonth: Record<string, DailyUsage[]>
  }
  summary: {
    totalTokens: number
    totalCost: number
    byModel: Record<string, number>
    deviceList: string[]
  }
}

export type DeviceFilter = 'all' | string
