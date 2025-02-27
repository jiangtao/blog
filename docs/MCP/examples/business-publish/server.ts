import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/resource.js";

// 定义内容模型的 schema
const ContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'video']),
  metadata: z.record(z.any()).optional(),
});

// 创建 MCP 服务器
const server = new McpServer({
  name: "BusinessPublishMCP",
  version: "1.0.0"
});

// 添加内容资源
server.resource(
  "content",
  new ResourceTemplate("content://{id}", { list: "content://" }),
  async (uri, { id }) => ({
    contents: [{
      uri: uri.href,
      text: `Content ${id}`,
      metadata: {
        type: "text",
        timestamp: Date.now()
      }
    }]
  })
);

// 添加自定义上传工具
server.tool(
  "customUpload",
  ContentSchema,
  async (content) => {
    console.log(`Uploading content: ${content.title}`);
    const id = `custom-${Date.now()}`;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id,
          url: `https://example.com/content/${id}`,
          timestamp: Date.now()
        })
      }]
    };
  }
);

// 添加 AI 模型上传工具
server.tool(
  "aiModelUpload",
  ContentSchema.extend({
    metadata: z.object({
      aiModel: z.string(),
      processingOptions: z.object({
        temperature: z.number(),
        maxTokens: z.number()
      }).optional()
    })
  }),
  async (content) => {
    console.log(`Processing with AI Model: ${content.metadata?.aiModel}`);
    const id = `ai-${Date.now()}`;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id,
          url: `https://ai.example.com/content/${id}`,
          timestamp: Date.now(),
          model: content.metadata?.aiModel
        })
      }]
    };
  }
);

// 添加内容验证工具
server.tool(
  "validateContent",
  ContentSchema,
  async (content) => {
    const errors: string[] = [];
    
    if (!content.title.trim()) {
      errors.push("Title is required");
    }
    if (!content.content.trim()) {
      errors.push("Content is required");
    }
    if (content.type === 'text' && content.content.length > 10000) {
      errors.push("Text content too long");
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          valid: errors.length === 0,
          errors
        })
      }]
    };
  }
);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Business Publish MCP Server started");
}

main().catch(console.error);
