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
})
