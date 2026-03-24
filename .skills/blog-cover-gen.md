# Blog Cover Generator

为博客文章生成可发布的 SVG 封面图，并同时保留可编辑的 Draw.io 源文件。

> 统一原则：**Draw.io 源文件是本地可编辑主文件，SVG 是仓库发布产物。**

## 使用方法

```text
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
  chalkboard  - 黑板粉笔
```

## 工作流程

1. 读取文章 frontmatter、标题、标签和主要小节
2. 选择合适的封面风格
3. **优先在 Draw.io 中完成构图**，或者至少按可无歧义复刻到 Draw.io 的结构设计
4. 导出最终 SVG 封面
5. 同时保存两份文件：
   - 发布用 SVG
   - 本地可编辑的 `.drawio` 源文件
6. 如任务包含文章修改，则同步更新 frontmatter 中的 `cover`
7. 校验 SVG 和 Draw.io 产物都存在且路径一致

## 可编辑源文件要求

- 每次新生成封面时，默认都要同时产出 `.drawio`
- `.drawio` 是本地主文件，`svg` 是发布文件
- 默认遵循仓库忽略规则，不提交 `.drawio`
- 只有仓库明确要求跟踪 Draw.io 源文件时，才把 `.drawio` 当作正式交付物
- 如果仓库没有约定，推荐：
  - `home/public/images/blog-covers/<slug>-cover.svg`
  - `home/public/images/blog-covers/source-local/<slug>-cover-v1.0-YYYYMMDD.drawio`

## 字段说明

### cover 字段（推荐）

封面图会显示在文章正文顶部：

```yaml
---
cover: /images/blog-covers/article-cover.svg
---
```

或对象格式：

```yaml
---
cover:
  src: /images/blog-covers/article-cover.svg
  alt: "封面图描述"
---
```

### ogImage 字段

如果仓库有社交图需求，可以在需要时额外维护：

```yaml
---
ogImage:
  src: /images/blog-covers/article-cover.svg
  alt: "封面图描述"
---
```

## 文件保存位置

- SVG 封面：`home/public/images/blog-covers/`
- Draw.io 源文件：仅用于本地编辑，默认放在 `home/public/images/blog-covers/source-local/` 并由 git 忽略

## 水印规范

所有封面必须包含 **"Jerret's Blog"** 水印：

- **位置**: 右下角
- **样式**: 半透明、小字号
- **实现**: SVG text 元素

```svg
<text x="1150" y="610" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#ffffff" opacity="0.5" text-anchor="end">Jerret's Blog</text>
```

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
| chalkboard | 黑板粉笔 | 深色黑板+粉笔 | chalk |

## 自然构图规则

封面要像一张干净的 Draw.io 架构板，而不是拥挤的 AI 拼贴图。

- **一个主焦点**：只保留 1 个核心视觉概念，最多 2 组辅助信息
- **间距拉开**：大画布上优先使用 48-96px 的组间距，不要靠缩小元素解决拥挤
- **按网格对齐**：主卡片、标题、图标、说明必须落在清晰网格上，避免漂浮感
- **少而大**：优先使用少量大元素，不要堆很多细碎装饰
- **主次清晰**：
  - 标题第一层
  - 副标题第二层
  - 支撑标签第三层
- **连接线克制**：只有在表达结构时才使用连接线，装饰性线条必须很少
- **线条自然**：优先 Draw.io 风格的圆角或曲线路由；原始 SVG 中优先 `Q` 或 `C` 路径，而不是生硬折线
- **边距稳定**：主要内容不要贴边
- **结构优先于装饰**：结构负责传达信息，装饰只负责氛围
- **一旦显得拥挤，就删元素，不要继续缩小**

## Blueprint / 架构型封面规则

对于 `blueprint`、`cool` 以及偏架构分析的封面：

- 优先使用模块卡片分区
- 只保留 1-2 条明确的流程箭头
- 使用冷静的技术配色，不要做霓虹噪音
- 使用圆角矩形、柔和阴影、清晰分区
- 连线周围要留白，确保不需要“盯着像素看路径”
- 能在 Draw.io 里搭结构，就不要一开始手写复杂 SVG

## chalkboard 风格特点

- 深色黑板背景
- 粉笔手绘风格
- 教学/知识分享氛围
- 允许更明显的手绘感，但仍需保持结构分区清楚

## 校验清单

提交前必须确认：

- [ ] SVG 只有一个 `</svg>` 标签
- [ ] 所有元素都在根 `<svg>` 内
- [ ] `xmllint --noout <file>.svg` 通过（如果环境可用）
- [ ] `Jerret's Blog` 水印存在
- [ ] 对应的 `.drawio` 源文件存在
- [ ] SVG 与 `.drawio` 表达的是同一套构图
- [ ] `.drawio` 位于本地忽略路径中，除非仓库明确要求跟踪
- [ ] 全尺寸下间距、分组、连线密度自然清楚

## 输出

完成时应返回：

- 生成的 SVG 路径
- 生成的 Draw.io 源文件路径
- Draw.io 是否为本地忽略文件
- 选择的风格及理由
- 是否更新了文章 frontmatter
