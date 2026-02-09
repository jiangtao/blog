---
name: blog-cover-gen
description: 根据博客文章内容生成 SVG 封面图并更新 frontmatter
---

# Blog Cover Generator

为博客文章自动生成合适的 SVG 封面图。

## 使用场景

当以下情况时使用此 skill：
- 需要为博客文章生成封面图
- 文章更新后需要重新生成封面
- 批量为多篇博客生成封面

## 工作流程

### 1. 分析文章内容

阅读博客文章，提取关键信息：
- 标题 (title)
- 描述 (description)
- 标签 (tags)
- 文章类型/主题

### 2. 选择封面风格

根据文章内容选择合适的风格：

| 内容类型 | 推荐风格 | 说明 |
|---------|---------|------|
| 框架/工具教程 | `minimal` | 简洁现代风格 |
| 文档/教程 | `notion` | Notion 文档风格 |
| 算法/编译原理 | `chalkboard` | 黑板/教学风格 |
| 架构/系统设计 | `blueprint` | 蓝图/架构风格 |
| UI/设计相关 | `elegant` | 优雅设计风格 |
| 性能优化 | `cool` | 清爽冷色风格 |

### 3. 生成封面图

使用选定的风格生成 SVG 封面图。

**封面规格：**
- 尺寸: 1920 x 1080 (16:9)
- 格式: SVG
- 输出目录: `home/public/images/blog-covers/`
- 文件命名: `{slug}-cover.svg`

### 4. 更新文章 frontmatter

在文章的 frontmatter 中添加或更新 `cover` 字段：

```yaml
---
title: 文章标题
cover: /images/blog-covers/{slug}-cover.svg
---
```

## 输出文件

1. **封面 SVG**: `home/public/images/blog-covers/{slug}-cover.svg`
2. **更新后的文章**: `home/src/data/blog/{filename}.md`

## 注意事项

- 封面图需要保持清晰且加载速度快
- SVG 格式确保可缩放不失真
- 使用合适的配色方案与内容匹配
- 确保标题文字在封面上清晰可读
