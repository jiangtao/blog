import { BusinessPublishMCP } from './business-publish-mcp';
import { ContentModel, PublishContext } from './types';

async function main() {
  // 创建 BusinessPublishMCP 实例
  const publishMCP = new BusinessPublishMCP();

  // 创建发布上下文
  const context: PublishContext = {
    userId: 'user123',
    environment: 'production',
    trace: 'trace-123'
  };

  // 示例 1: 使用自定义上传代理发布内容
  const textContent: ContentModel = {
    title: '示例文章',
    content: '这是一篇示例文章的内容...',
    type: 'text',
    metadata: {
      source: 'editor'
    }
  };

  try {
    const result1 = await publishMCP.process(textContent, context);
    console.log('Published using custom agent:', result1);
  } catch (error) {
    console.error('Publishing failed:', error);
  }

  // 示例 2: 使用 AI 模型上传代理发布内容
  const aiContext: PublishContext = {
    ...context,
    uploadTarget: 'ai-model'
  };

  const aiContent: ContentModel = {
    title: 'AI 处理的内容',
    content: '需要 AI 处理的文本内容...',
    type: 'text',
    metadata: {
      aiModel: 'gpt-4',
      processingOptions: {
        temperature: 0.7,
        maxTokens: 1000
      }
    }
  };

  try {
    const result2 = await publishMCP.process(aiContent, aiContext);
    console.log('Published using AI model agent:', result2);
  } catch (error) {
    console.error('Publishing failed:', error);
  }
}

// 运行示例
main().catch(console.error);
