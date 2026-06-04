// src/utils/ai-usage.test.ts
import { describe, it, expect } from 'vitest'
import { parseDeviceFilename, calculateSummary } from '../ai-usage'
import type { DailyUsage } from '../../types/ai-usage'

describe('parseDeviceFilename', () => {
  it('should parse valid filename', () => {
    const result = parseDeviceFilename('macbook-2026-03.json')
    expect(result).toEqual({ deviceName: 'macbook', yearMonth: '2026-03' })
  })

  it('should parse filename with hyphens in device name', () => {
    const result = parseDeviceFilename('mac-mini-2026-03.json')
    expect(result).toEqual({ deviceName: 'mac-mini', yearMonth: '2026-03' })
  })

  it('should return null for invalid filename', () => {
    const result = parseDeviceFilename('invalid.json')
    expect(result).toBeNull()
  })
  it('should parse filename with full date (YYYY-MM-DD)', () => {
    const result = parseDeviceFilename('home-macbook-2026-03-07.json')
    expect(result).toEqual({ deviceName: 'home-macbook', yearMonth: '2026-03' })
  })

  it('should parse Codex usage filename as the original device', () => {
    const result = parseDeviceFilename('jtdeMac-mini-codex-2026-06.json')
    expect(result).toEqual({ deviceName: 'jtdeMac-mini', yearMonth: '2026-06' })
  })
})

describe('calculateSummary', () => {
  it('should calculate totals correctly', () => {
    const daily: DailyUsage[] = [
      {
        date: '2026-03-01',
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 200,
        totalTokens: 1700,
        totalCost: 0.01,
        modelsUsed: ['claude-sonnet-4-6'],
        modelBreakdowns: [
          {
            modelName: 'claude-sonnet-4-6',
            inputTokens: 1000,
            outputTokens: 500,
            cacheCreationTokens: 0,
            cacheReadTokens: 200,
            cost: 0.01
          }
        ]
      }
    ]

    const result = calculateSummary(daily)
    expect(result.totalTokens).toBe(1700)
    expect(result.totalCost).toBe(0.01)
    expect(result.byModel['claude-sonnet-4-6']).toBe(1700)
  })

  it('should calculate cost totals with decimal precision', () => {
    const daily: DailyUsage[] = [
      {
        date: '2026-03-01',
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 200,
        totalTokens: 1700,
        totalCost: 0.1,
        modelsUsed: ['claude-sonnet-4-6'],
        modelBreakdowns: []
      },
      {
        date: '2026-03-02',
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 200,
        totalTokens: 1700,
        totalCost: 0.2,
        modelsUsed: ['gpt-5.3-codex'],
        modelBreakdowns: []
      }
    ]

    const result = calculateSummary(daily)
    expect(result.totalCost).toBe(0.3)
  })
})
