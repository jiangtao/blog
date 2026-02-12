# Draw.io Diagram Generator

为技术文档生成 Draw.io 架构图、流程图，风格与博客封面保持一致（黑板粉笔风格）。

## 使用方法

```
使用 drawio-diagram 为文章生成技术图表

参数：
- 图表类型 (必需): architecture, workflow, sequence, data-flow, component
- 标题 (必需)
- 描述内容 (必需): 图表的各个组件/步骤
- 风格 (可选，默认: chalkboard)

可用风格:
  chalkboard  - 黑板粉笔风格（默认）
  blueprint   - 技术蓝图
  elegant     - 优雅精致
  minimal     - 极简风格
```

## 工作流程

1. 分析图表需求（架构/流程/组件/数据流）
2. 选择 Draw.io 模板
3. 使用 drawio MCP 打开 Draw.io
4. 绘制图表元素
5. 应用黑板风格效果
6. 导出 SVG/PNG
7. 保存到文章目录

## 图表类型

### Architecture (架构图)

系统/应用的技术架构，包含：
- 前端/后端组件
- 数据存储层
- API 接口
- 第三方服务

**示例请求：**
```
draw architecture diagram for blog system
Components:
- Frontend: Astro + React
- Backend: Vercel Edge
- Storage: GitHub + Markdown
- CI/CD: GitHub Actions
```

### Workflow (工作流程)

展示系统的工作流程/步骤：

**示例请求：**
```
draw workflow diagram for blog automation
Steps:
1. Write article (Yuque)
2. AI generates cover (Claude)
3. Auto validation (lint:images)
4. Commit with /dev:commit
5. Auto deploy (Vercel)
```

### Sequence (时序图)

展示组件之间的交互顺序：

**示例请求：**
```
draw sequence diagram for user authentication
Actors:
- User
- Frontend
- Backend
- Database
Flow: Login -> Validate -> Query -> Return Token
```

### Data Flow (数据流图)

展示数据在系统中的流动：

**示例请求：**
```
draw data flow diagram for blog post processing
Sources:
- User input (Yuque API)
- AI generation (Claude API)
- Storage (GitHub)
Destinations: Blog reader
```

### Component (组件图)

展示单个组件的内部结构：

**示例请求：**
```
draw component diagram for Astro blog
Components:
- Layout component
- Header/Footer
- TOC generator
- Image gallery
```

## 风格规范

### Chalkboard 风格（默认）

与博客封面保持一致的黑板粉笔风格：

- **深色黑板背景** - 模拟真实黑板质感
- **粉笔手绘线条** - 不规则、带粉笔质感
- **木框边框** - 增加层次感
- **白色/彩色粉笔字** - 高对比度
- **擦除痕迹** - 增加真实感

### Blueprint 风格

技术蓝图风格，适合架构/系统设计：

- **深蓝背景** (#1a3a52)
- **青色线条** (#4fc3f7)
- **网格装饰** - 模拟图纸
- **等宽字体** - monospace

### Elegant 风格

优雅精致风格，适合演示/分享：

- **渐变背景** - 柔和色彩
- **圆角卡片** - 现代感
- **阴影效果** - 增加层次
- **细线条** - 精致细节

### Minimal 风格

极简风格，适合简单概念：

- **纯色背景** - 单一色调
- **基础图形** - 圆形/方形
- **留白充足** - 突出重点
- **无装饰** - 专注内容

## 输出格式

- **SVG** - 矢量格式，可缩放（推荐）
- **PNG** - 位图格式，兼容性好
- **Draw.io 原生文件** - 可二次编辑

## 文件保存位置

生成的图表保存到文章对应目录：

```
home/public/images/diagrams/
├── architecture-*.svg
├── workflow-*.svg
├── sequence-*.svg
└── component-*.svg
```

文章中引用：
```
![架构图](/images/diagrams/blog-architecture.svg)
```

## Draw.io MCP 集成

使用 drawio MCP 服务直接操作 Draw.io：

```bash
# MCP 服务已安装到 Claude
# 在对话中直接调用：
```

**命令模式：**
- 打开 Draw.io
- 创建新图表
- 选择模板
- 添加元素
- 导出 SVG

## 与博客封面的视觉一致性

为了保持技术文档的专业性和一致性：

1. **相同的色彩体系**
   - 黑板风格：#1a1a2e 背景，#e8eaf6 粉笔
   - 蓝图风格：#1a3a52 背景，#4fc3f7 线条

2. **相同的质感效果**
   - 粉笔纹理
   - 木框边框
   - 擦除痕迹

3. **相同的字体选择**
   - 标题：Arial, sans-serif
   - 代码：monospace
   - 中英文混排支持

4. **相同的水印规范**
   - 所有图表右下角包含来源标识
   - 格式：`来源: 技术文档` 或 `Source: Tech Doc`

## 使用技巧

### 架构图绘制

1. **分层展示**：从上到下或从左到右
2. **使用箭头**：明确数据流/调用关系
3. **颜色编码**：用颜色区分不同层次/模块
4. **添加标签**：每个组件/服务有清晰标签

### 工作流程图

1. **泳道布局**：横向展示不同角色/阶段
2. **箭头连接**：明确流程方向
3. **决策节点**：菱形表示判断/分支
4. **起止点**：圆形表示开始/结束

### 时序图

1. **角色分离**：不同系统/服务在不同泳道
2. **消息箭头**：虚线表示返回，实线表示请求
3. **时间轴**：垂直虚线表示时间流逝
4. **激活框**：高亮当前操作的组件

## 质量检查

生成图表后需验证：

- [ ] SVG 格式正确
- [ ] 文字清晰可读
- [ ] 箭头方向正确
- [ ] 颜色对比足够
- [ ] 导出分辨率适配（推荐 1920x1080 或更高）
- [ ] 文件大小合理（SVG < 500KB）

## 示例输出

**博客架构图（chalkboard 风格）：**
```
描述: Hexo 博客系统架构
风格: chalkboard
组件:
  - Source: source/_posts/ (Markdown)
  - Engine: Hexo (Node.js)
  - Theme: Next (EJS/模板)
  - Deploy: deploy.sh (手动 gh-pages)
装饰: 木框、网格线
水印: Source: Tech Diagram
```

**Astro 架构图（chalkboard 风格）：**
```
描述: Astro 静态博客系统架构
风格: chalkboard
组件:
  - Pages: 路由页面
  - Components: UI 组件
  - Content: data/blog/ (Markdown)
  - Build: npm run build (10s!)
  - Deploy: Vercel 自动部署
装饰: 木框、网格线
水印: Source: Tech Diagram
```

**AI 封面生成流程图（chalkboard 风格）：**
```
描述: AI 自动生成封面流程
风格: chalkboard
流程:
  - 输入: 手动设计 (PS/Canva, 30-60分钟)
  - AI 处理: Claude Code 分析内容
  - 输出: SVG 封面 (1 分钟!)
  - 验证: lint:images 自动检查
装饰: 粉笔质感、对比表格
水印: Source: Tech Diagram
```

**全自动化工作流图（chalkboard 风格）：**
```
描述: 博客全自动化发布流程
风格: chalkboard
步骤:
  1. 写作: 语雀/本地 Markdown
  2. AI 封面: Claude Code (1分钟)
  3. 自动检查: lint:images
  4. 结构化提交: /dev:commit (5步工作流)
  5. CI/CD: GitHub Actions → Vercel
装饰: 箭头连接、渐变背景
水印: Source: Tech Diagram
```

**自动化工作流图（chalkboard 风格）：**
```
描述: 博客自动化发布流程
风格: chalkboard
步骤:
  1. 写作 (Yuque)
  2. AI 封面 (Claude)
  3. 自动检查 (lint:images)
  4. 提交流程 (/dev:commit)
  5. CI/CD (GitHub Actions)
装饰: 箭头连接、流程标签
水印: Jerret's Tech Diagrams
```

## 注意事项

1. **Draw.io 原生文件**：保存 .drawio 格式便于后续修改
2. **SVG 优先**：文章中引用 SVG 格式确保清晰度
3. **简洁原则**：图表要服务于内容，不过度装饰
4. **中英文支持**：技术术语保持英文，描述可用中文
5. **版本控制**：图表文件纳入 Git 管理
