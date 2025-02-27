import { Context, Model } from '@modelcontextprotocol/sdk';

// 内容模型定义
export interface ContentModel extends Model {
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  metadata?: Record<string, any>;
}

// 发布上下文定义
export interface PublishContext extends Context {
  userId: string;
  environment: string;
  trace?: string;
  uploadTarget?: 'custom' | 'ai-model';
}

// 发布结果定义
export interface PublishResult {
  id: string;
  url: string;
  timestamp: number;
}
