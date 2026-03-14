import { describe, it, expect } from 'vitest'
import { normalizeCodexData } from '../codex-usage'

describe('normalizeCodexData', () => {
  it('should convert Codex format to unified DailyUsage format', () => {
    const codexData = {
      daily: [
        {
          date: 'Mar 11, 2026',
          inputTokens: 187015,
          cachedInputTokens: 126848,
          outputTokens: 12556,
          reasoningOutputTokens: 7887,
          totalTokens: 199571,
          costUSD: 0.3686797,
          models: {
            'gpt-5.3-codex': {
              inputTokens: 9016,
              cachedInputTokens: 7424,
              outputTokens: 39,
              reasoningOutputTokens: 21,
              totalTokens: 9055,
              isFallback: false
            }
          }
        }
      ]
    }

    const result = normalizeCodexData(codexData)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-11')
    expect(result[0].inputTokens).toBe(187015)
    expect(result[0].outputTokens).toBe(12556)
    expect(result[0].totalTokens).toBe(199571)
    expect(result[0].totalCost).toBe(0.3686797)
    expect(result[0].modelsUsed).toContain('gpt-5.3-codex')
    expect(result[0].modelBreakdowns).toHaveLength(1)
    expect(result[0].modelBreakdowns[0].modelName).toBe('gpt-5.3-codex')
  })

  it('should handle empty daily array', () => {
    const codexData = {
      daily: []
    }

    const result = normalizeCodexData(codexData)

    expect(result).toHaveLength(0)
  })

  it('should handle empty models object', () => {
    const codexData = {
      daily: [
        {
          date: 'Mar 11, 2026',
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          models: {}
        }
      ]
    }

    const result = normalizeCodexData(codexData)

    expect(result).toHaveLength(1)
    expect(result[0].modelsUsed).toHaveLength(0)
    expect(result[0].modelBreakdowns).toHaveLength(0)
  })

  it('should handle multiple models in a single day', () => {
    const codexData = {
      daily: [
        {
          date: 'Mar 11, 2026',
          inputTokens: 200000,
          cachedInputTokens: 150000,
          outputTokens: 15000,
          reasoningOutputTokens: 8000,
          totalTokens: 215000,
          costUSD: 0.5,
          models: {
            'gpt-5.3-codex': {
              inputTokens: 100000,
              cachedInputTokens: 75000,
              outputTokens: 7500,
              reasoningOutputTokens: 4000,
              totalTokens: 107500,
              isFallback: false
            },
            'gpt-4-turbo': {
              inputTokens: 100000,
              cachedInputTokens: 75000,
              outputTokens: 7500,
              reasoningOutputTokens: 4000,
              totalTokens: 107500,
              isFallback: true
            }
          }
        }
      ]
    }

    const result = normalizeCodexData(codexData)

    expect(result).toHaveLength(1)
    expect(result[0].modelsUsed).toHaveLength(2)
    expect(result[0].modelsUsed).toContain('gpt-5.3-codex')
    expect(result[0].modelsUsed).toContain('gpt-4-turbo')
    expect(result[0].modelBreakdowns).toHaveLength(2)
  })

  it('should handle multiple days', () => {
    const codexData = {
      daily: [
        {
          date: 'Mar 11, 2026',
          inputTokens: 100000,
          cachedInputTokens: 50000,
          outputTokens: 5000,
          reasoningOutputTokens: 2000,
          totalTokens: 105000,
          costUSD: 0.2,
          models: {
            'gpt-5.3-codex': {
              inputTokens: 100000,
              cachedInputTokens: 50000,
              outputTokens: 5000,
              reasoningOutputTokens: 2000,
              totalTokens: 105000,
              isFallback: false
            }
          }
        },
        {
          date: 'Mar 12, 2026',
          inputTokens: 150000,
          cachedInputTokens: 75000,
          outputTokens: 7500,
          reasoningOutputTokens: 3000,
          totalTokens: 157500,
          costUSD: 0.3,
          models: {
            'gpt-4-turbo': {
              inputTokens: 150000,
              cachedInputTokens: 75000,
              outputTokens: 7500,
              reasoningOutputTokens: 3000,
              totalTokens: 157500,
              isFallback: false
            }
          }
        }
      ]
    }

    const result = normalizeCodexData(codexData)

    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-11')
    expect(result[1].date).toBe('2026-03-12')
  })

  it('should throw error for invalid date format', () => {
    const codexData = {
      daily: [
        {
          date: 'invalid-date',
          inputTokens: 100000,
          cachedInputTokens: 50000,
          outputTokens: 5000,
          reasoningOutputTokens: 2000,
          totalTokens: 105000,
          costUSD: 0.2,
          models: {}
        }
      ]
    }

    expect(() => normalizeCodexData(codexData)).toThrow('Invalid date format')
  })

  it('should throw error for missing daily array', () => {
    const codexData = {} as any

    expect(() => normalizeCodexData(codexData)).toThrow('Invalid Codex data: missing or invalid daily array')
  })

  it('should throw error for non-array daily property', () => {
    const codexData = {
      daily: 'not-an-array'
    } as any

    expect(() => normalizeCodexData(codexData)).toThrow('Invalid Codex data: missing or invalid daily array')
  })
})
