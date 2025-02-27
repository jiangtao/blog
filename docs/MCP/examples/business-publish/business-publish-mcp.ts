import { MCP, MCPConfig, ModelTransformer, ValidationResult } from '@modelcontextprotocol/sdk';
import { ContentModel, PublishContext, PublishResult } from './types';
import { CustomUploadAgent, AIModelUploadAgent } from './upload-agents';

export class BusinessPublishMCP implements MCP<ContentModel, PublishContext, PublishResult> {
  private config: MCPConfig;
  private transformer: ModelTransformer<ContentModel>;

  constructor() {
    // 配置 MCP
    this.config = {
      name: 'business-publish-mcp',
      version: '1.0.0',
      supportedModelTypes: ['text', 'image', 'video'],
      agents: [
        new CustomUploadAgent(),
        new AIModelUploadAgent('https://api.ai-model.example.com')
      ]
    };

    // 配置模型转换器
    this.transformer = {
      transform: (model: ContentModel) => ({
        ...model,
        metadata: {
          ...model.metadata,
          transformedAt: new Date().toISOString()
        }
      })
    };
  }

  getConfig(): MCPConfig {
    return this.config;
  }

  validate(model: ContentModel): ValidationResult {
    // 基础验证
    if (!this.config.supportedModelTypes.includes(model.type)) {
      return {
        valid: false,
        errors: [`Unsupported content type: ${model.type}`]
      };
    }

    // 标题和内容验证
    const errors: string[] = [];
    if (!model.title) errors.push('Title is required');
    if (!model.content) errors.push('Content is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(model: ContentModel, context: PublishContext): Promise<PublishResult> {
    // 验证模型
    const validation = this.validate(model);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 转换模型
    const transformedModel = this.transformer.transform(model);

    // 选择合适的代理
    const agent = this.selectAgent(transformedModel, context);
    if (!agent) {
      throw new Error('No suitable agent found');
    }

    // 执行发布
    return await agent.execute(transformedModel, { context }, {
      executeAgent: async (name, model, ctx) => {
        const agent = this.config.agents.find(a => a.name === name);
        if (!agent) throw new Error(`Agent not found: ${name}`);
        return await agent.execute(model, ctx, {} as any);
      }
    });
  }

  private selectAgent(model: ContentModel, context: PublishContext) {
    // 根据上下文选择代理
    if (context.uploadTarget === 'ai-model' && model.type === 'text') {
      return this.config.agents.find(a => a.name === 'ai-model-upload-agent');
    }
    return this.config.agents.find(a => a.name === 'custom-upload-agent');
  }
}
