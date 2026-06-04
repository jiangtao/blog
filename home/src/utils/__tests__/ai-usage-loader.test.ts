// home/src/utils/__tests__/ai-usage-loader.test.ts
import { afterEach, describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { detectFileFormat, loadAIUsageData } from '../ai-usage-loader'

const originalCwd = process.cwd()
const tempDirs: string[] = []

afterEach(async () => {
  process.chdir(originalCwd)
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

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

  it('should merge Claude and Codex files for the same device and day', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-usage-loader-'))
    tempDirs.push(tempDir)

    const usageDir = path.join(tempDir, 'ai', 'usages')
    await mkdir(usageDir, { recursive: true })
    process.chdir(tempDir)

    await writeFile(path.join(usageDir, 'jtdeMac-mini-2026-06.json'), JSON.stringify({
      daily: [{
        date: '2026-06-04',
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 10,
        cacheReadTokens: 20,
        totalTokens: 180,
        totalCost: 0.1,
        modelsUsed: ['claude-sonnet-4-6'],
        modelBreakdowns: [{
          modelName: 'claude-sonnet-4-6',
          inputTokens: 100,
          outputTokens: 50,
          cacheCreationTokens: 10,
          cacheReadTokens: 20,
          cost: 0.1
        }]
      }]
    }))

    await writeFile(path.join(usageDir, 'jtdeMac-mini-codex-2026-06.json'), JSON.stringify({
      daily: [{
        date: 'Jun 04, 2026',
        inputTokens: 200,
        cachedInputTokens: 60,
        outputTokens: 40,
        reasoningOutputTokens: 10,
        totalTokens: 240,
        costUSD: 0.2,
        models: {
          'gpt-5.3-codex': {
            inputTokens: 200,
            cachedInputTokens: 60,
            outputTokens: 40,
            reasoningOutputTokens: 10,
            totalTokens: 240,
            isFallback: false
          }
        }
      }]
    }))

    const data = await loadAIUsageData()

    expect(data.summary.deviceList).toEqual(['jtdeMac-mini'])
    expect(data.byDevice['jtdeMac-mini'].byMonth['2026-06']).toHaveLength(1)

    const mergedDay = data.byDevice['jtdeMac-mini'].byMonth['2026-06'][0]
    expect(mergedDay.totalTokens).toBe(420)
    expect(mergedDay.totalCost).toBe(0.3)
    expect(mergedDay.modelsUsed).toEqual(['claude-sonnet-4-6', 'gpt-5.3-codex'])
    expect(mergedDay.modelBreakdowns).toHaveLength(2)
  })

  it('should use the latest same-tool snapshot instead of double-counting history files', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-usage-loader-'))
    tempDirs.push(tempDir)

    const usageDir = path.join(tempDir, 'ai', 'usages')
    await mkdir(usageDir, { recursive: true })
    process.chdir(tempDir)

    const createClaudeSnapshot = (totalTokens: number, totalCost: number) => ({
      daily: [{
        date: '2026-03-01',
        inputTokens: totalTokens,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens,
        totalCost,
        modelsUsed: ['claude-sonnet-4-6'],
        modelBreakdowns: [{
          modelName: 'claude-sonnet-4-6',
          inputTokens: totalTokens,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          cost: totalCost
        }]
      }]
    })

    await writeFile(path.join(usageDir, 'jtdeMac-mini-2026-03.json'), JSON.stringify(createClaudeSnapshot(100, 0.1)))
    await writeFile(path.join(usageDir, 'jtdeMac-mini-2026-04.json'), JSON.stringify(createClaudeSnapshot(200, 0.2)))

    const data = await loadAIUsageData()
    const day = data.byDevice['jtdeMac-mini'].byMonth['2026-03'][0]

    expect(day.totalTokens).toBe(200)
    expect(day.totalCost).toBe(0.2)
    expect(data.summary.totalTokens).toBe(200)
    expect(data.summary.totalCost).toBe(0.2)
  })
})
