# Blog Cover Generator

为博客文章生成 SVG 封面图，支持多种风格。

## 使用方法

```
使用 blog-cover-gen 为文章生成封面图

参数：
- 文章路径 (必需)
- 风格选择 (可选，默认: notion)

可用风格:
  minimal     - 极简黑白
  blueprint   - 技术蓝图
  notion      - Notion 风格 (默认)
  refresh     - 清新渐变
  elegant     - 优雅精致
  warm        - 温暖友好
  cool        - 冷调技术
  chalkboard  - 黑板粉笔 (新增)
```

## 工作流程

1. 读取文章 frontmatter 获取标题、标签
2. 选择封面风格
3. 生成 SVG 封面
4. 预览效果
5. 确认后保存，清理临时文件

## 字段说明

### cover 字段（推荐）

封面图会显示在文章正文顶部：

```yaml
---
# 简写格式
cover: /images/blog-covers/article-cover.svg

# 对象格式（带 alt）
cover:
  src: /images/blog-covers/article-cover.svg
  alt: "封面图描述"
---
```

### ogImage 字段

用于社交卡片分享（Twitter/Facebook 等）：

```yaml
---
ogImage:
  src: /images/blog-covers/article-cover.svg
  alt: "封面图描述"
---
```

### 两者同时使用

```yaml
---
cover: /images/blog-covers/article-cover.svg
ogImage:
  src: /images/blog-covers/article-og.png
  alt: "社交分享图"
---
```

## 文件保存位置

生成的封面图保存到：`home/public/images/blog-covers/`

## 支持的风格

| 风格 | 描述 | 主色调 | 渲染 |
|:----:|------|:--------|:-----|
| minimal | 极简黑白 | 黑白灰 | flat-vector |
| blueprint | 技术蓝图 | 深蓝+青色 | digital |
| notion | Notion 风格 | 米白+深灰 | digital |
| refresh | 清新渐变 | 绿蓝渐变 | flat-vector |
| elegant | 优雅精致 | 粉紫+淡紫 | flat-vector |
| warm | 温暖友好 | 橙黄渐变 | flat-vector |
| cool | 冷调技术 | 工程蓝 | flat-vector |
| **chalkboard** | **黑板粉笔** | **深色黑板+粉笔** | **chalk** |

## chalkboard 风格特点

- 🎨 **深色黑板背景** - 模拟真实黑板质感
- ✏️ **粉笔手绘风格** - 不规则线条、粉笔质感
- 🏫 **教育/教室氛围** - 怀念教学场景
- 🌙 **暗色主题** - 适合技术/编程内容

- 装饰元素：AST 树结构、构建图标、代码符号
- 木框边框效果
- 粉笔尘土质感
- 擦除痕迹效果
- 板报格式需要内容密集一些，提取文章关键目录内容作为输入
