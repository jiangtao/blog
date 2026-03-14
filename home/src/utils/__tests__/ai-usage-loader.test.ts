// home/src/utils/__tests__/ai-usage-loader.test.ts
import { describe, it, expect } from 'vitest'
import { detectFileFormat } from '../ai-usage-loader'

describe('detectFileFormat', () => {
  it('should detect Claude Code format', () => {
    const data = {
      daily: [{
        date: '2026-03-11',
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 150,
        totalCost: 0.01,
        modelsUsed: ['claude-sonnet-4-6'],
        modelBreakdowns: []
      }]
    }
    expect(detectFileFormat(data)).toBe('claude-code')
  })

  it('should detect Codex format', () => {
    const data = {
      daily: [{
        date: 'Mar 11, 2026',
        inputTokens: 100,
        cachedInputTokens: 50,
        outputTokens: 50,
        reasoningOutputTokens: 10,
        totalTokens: 150,
        costUSD: 0.01,
        models: {}
      }]
    }
    expect(detectFileFormat(data)).toBe('codex')
  })
})
