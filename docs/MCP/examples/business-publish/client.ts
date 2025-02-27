import { McpClient } from "@modelcontextprotocol/sdk/client/mcp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class BusinessPublishClient {
  private client: McpClient;

  constructor() {
    const transport = new StdioClientTransport();
    this.client = new McpClient(transport);
  }

  async connect() {
    await this.client.connect();
    console.log("Connected to Business Publish MCP Server");
  }

  async publishContent(content: {
    title: string;
    content: string;
    type: 'text' | 'image' | 'video';
    metadata?: Record<string, any>;
  }) {
    // 首先验证内容
    const validationResult = await this.client.invokeTool("validateContent", content);
    const validation = JSON.parse(validationResult.content[0].text);
    
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    // 根据内容类型和元数据选择上传工具
    const isAIContent = content.metadata?.aiModel;
    const toolName = isAIContent ? "aiModelUpload" : "customUpload";

    // 执行上传
    const result = await this.client.invokeTool(toolName, content);
    return JSON.parse(result.content[0].text);
  }

  async getContent(id: string) {
    const result = await this.client.loadResource(`content://${id}`);
    return result.contents[0];
  }

  async listContents() {
    const result = await this.client.loadResource("content://");
    return result.contents;
  }
}

// 使用示例
async function main() {
  const client = new BusinessPublishClient();
  await client.connect();

  try {
    // 发布普通内容
    const regularContent = await client.publishContent({
      title: "示例文章",
      content: "这是一篇示例文章的内容...",
      type: "text",
      metadata: {
        source: "editor"
      }
    });
    console.log("Published regular content:", regularContent);

    // 发布需要 AI 处理的内容
    const aiContent = await client.publishContent({
      title: "AI 处理的内容",
      content: "需要 AI 处理的文本内容...",
      type: "text",
      metadata: {
        aiModel: "gpt-4",
        processingOptions: {
          temperature: 0.7,
          maxTokens: 1000
        }
      }
    });
    console.log("Published AI content:", aiContent);

    // 获取内容列表
    const contents = await client.listContents();
    console.log("All contents:", contents);

  } catch (error) {
    console.error("Error:", error);
  }
}

// 使用 ES modules 方式检查是否是主模块
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch(console.error);
}
