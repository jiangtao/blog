import fs from 'fs/promises'
import path from 'path'

const USAGE_DIR = path.join(process.cwd(), 'ai', 'usages')

async function validate() {
  try {
    const files = await fs.readdir(USAGE_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'))

    let totalFiles = 0
    let totalDays = 0
    let totalTokens = 0

    for (const file of jsonFiles) {
      const filePath = path.join(USAGE_DIR, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      totalFiles++
      totalDays += data.daily?.length || 0
      totalTokens += data.daily?.reduce((sum, d) => sum + (d.totalTokens || 0), 0) || 0
    }

    console.log('✅ AI Usage 数据验证通过')
    console.log(`   文件数: ${totalFiles}`)
    console.log(`   总天数: ${totalDays}`)
    console.log(`   总 Tokens: ${totalTokens.toLocaleString()}`)
  } catch (error) {
    console.error('❌ 验证失败:', error.message)
    process.exit(1)
  }
}

validate()
