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

// Codex-specific types
export interface CodexModelUsage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
  isFallback: boolean
}

export interface CodexDailyUsage {
  date: string // Format: "Mar 11, 2026"
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
  costUSD: number
  models: Record<string, CodexModelUsage>
}

export interface CodexUsageData {
  daily: CodexDailyUsage[]
}
