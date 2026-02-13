# Draw.io Diagram Generator

为技术文档生成 Draw.io 架构图、流程图。

## 使用方法

```
使用 drawio-diagram 为文章生成技术图表

参数：
- 图表类型 (必需): architecture, workflow, sequence, data-flow, component
- 标题 (必需)
- 描述内容 (必需): 图表的各个组件/步骤
- 风格 (可选，默认: default)

可用风格:
  default     - 默认自然风格（推荐，清爽简洁）
  chalkboard  - 黑板粉笔风格（博客封面专用）
  blueprint   - 技术蓝图
  elegant     - 优雅精致
  minimal     - 极简风格
```

> **注意：博客文章中的技术图表请使用 `default` 风格（白色背景、柔和配色），只有封面图片使用 `chalkboard` 风格。**

## 工作流程

1. 分析图表需求（架构/流程/组件/数据流）
2. 选择 Draw.io 模板
3. 使用 drawio MCP 打开 Draw.io
4. 绘制图表元素
5. 应用自然风格效果（默认）或黑板风格（封面专用）
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

### Default 默认自然风格（推荐用于文章技术图表）

清爽简洁的默认风格，适合技术文档：

- **白色背景** (#ffffff) - 清爽简洁
- **柔和配色** - 使用 Draw.io 默认色板：
  - 蓝色: #dae8fc / #6c8ebf
  - 绿色: #d5e8d4 / #82b366
  - 黄色: #fff2cc / #d6b656
  - 紫色: #e1d5e7 / #9673a6
  - 红色: #f8cecc / #b85450
  - 青色: #b0e3e6 / #0e8088
- **圆角节点** (rx="8") - 柔和友好
- **阴影效果** - 增加层次感
- **贝塞尔曲线** (Q 指令) - 平滑过渡
- **清晰箭头** - 方向明确
- **统一水印** - "Jerret's Blog" (灰色 #999999)

### Chalkboard 风格（博客封面专用）

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

## Draw.io 自然风格原则

> **参考：[Draw.io Animated Connectors 示例](https://raw.githubusercontent.com/DayuanJiang/next-ai-draw-io/ac3570c1b01d4c3cbe75b5b91b04cdb61202708f/public/animated_connectors.svg)**

### 四大核心特征

#### 1. 线条流畅自然

Draw.io 原生图表使用**贝塞尔曲线**而非折线：

```
# Draw.io 自动生成的路径（自然流畅）
<path d="M 50 244 L 30 244 Q 20 244 20 254 L 20 296.56 Q 20 306.56 30 306.54 L 42.7 306.51"/>
      ^^^^^^^^^^^               ^^^^^^^^^^^^^^^             ^^^^^^^^^^^^^^^
      直线段                     二次贝塞尔曲线                平滑过渡
```

**对比手写 SVG：**
- ❌ 手写：`<path d="M 100 200 L 200 300 L 300 400"/>` （生硬折线）
- ✅ Draw.io：使用 `Q` 或 `C` 指令实现平滑曲线

#### 2. 结构分明

**节点样式特征：**
- **圆角矩形**（`rounded=1`）：柔和友好
- **柔和配色**：淡色填充 + 深色边框
- **清晰层次**：组件分组、嵌套结构

**Draw.io 配色示例：**
```
蓝色系:  fillColor=#dae8fc  strokeColor=#6c8ebf
绿色系:  fillColor=#d5e8d4  strokeColor=#82b366
红色系:  fillColor=#f8cecc  strokeColor=#b85450
黄色系:  fillColor=#fff2cc  strokeColor=#d6b656
紫色系:  fillColor=#e1d5e7  strokeColor=#9673a6
```

#### 3. 方向明确

**箭头和流向指示：**
- **菱形箭头**：`M 110 126.76 L 106 118.76 L 110 120.76 L 114 118.76 Z`
- **方向标记**：`endArrow=classic` 或 `endArrow=block`
- **路径连贯性**：从起点到终点，清晰的数据/控制流

**Draw.io 自动处理的流向：**
```
输入 → 处理 → 输出  （自动路由连线）
  ↓      ↓      ↓
 异常   验证   日志  （分支自然展开）
```

#### 4. 矩阵协调

**布局对齐原则：**
- **对称布局**：左右镜像或上下对称
- **网格对齐**：基于 grid (gridSize=10) 对齐
- **统一间距**：组件间距一致
- **比例协调**：元素大小成比例

**Draw.io 自动布局功能：**
- `horizontal` / `vertical` - 自动水平/垂直排列
- `tree` / `parallel` - 树状/并行布局
- `organic` - 自然有机布局

## Draw.io MCP 集成

> **重点：使用 Draw.io MCP 工具绘制图表，保持 Draw.io 原生流程图的自然风格**

### 使用方式

通过 MCP 服务直接操作 Draw.io，**无需手工编写 SVG 代码**：

```
用户请求：
  drawio-diagram workflow [type] [title] [description] --style chalkboard

AI 处理：
  1. 解析需求（图表类型、标题、内容）
  2. 调用 Draw.io MCP 打开 Draw.io
  3. 选择合适的 Draw.io 模板
  4. 使用 Draw.io 原生图形库绘制元素
  5. 应用 chalkboard 风格效果（黑板、粉笔、木框）
  6. 添加 "Jerret's Blog" 水印
  7. 导出 SVG/PNG
```

**优势**：
- ✅ **自然流畅** - Draw.io 原生连线、自动布局
- ✅ **专业美观** - 使用 Draw.io 图形库而非基础形状
- ✅ **易于修改** - Draw.io 原生文件可二次编辑
- ✅ **风格统一** - 与 chalkboard 封面保持视觉一致

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

### 架构图绘制技巧

使用 Draw.io 原生模板和图形库：
- **分层展示** - 使用 Draw.io 分层功能自动组织
- **使用箭头** - 选择 Draw.io 原生智能箭头（带自动路由）
- **颜色编码** - 应用 Draw.io 预设配色方案
- **添加标签** - 拖拽文本标签，自动对齐

**关键**：让 Draw.io 处理布局和连线，确保自然流畅

### 手写 SVG vs Draw.io 原生对比

| 特征 | 手写 SVG | Draw.io 原生 |
|:-----|----------|--------------|
| 连线方式 | 折线 `<path d="M 0 0 L 100 100"/>` | 贝塞尔曲线 `Q 20 0 20 10` |
| 节点样式 | 基础矩形 | 圆角 + 阴影 + 渐变 |
| 箭头 | 手绘多边形 | 智能箭头（自动路由） |
| 布局 | 手动计算坐标 | 自动对齐、自动布局 |
| 可编辑性 | 需重新编写代码 | 拖拽修改 |
| 视觉效果 | 生硬机械 | 自然流畅 |

**推荐做法：**
```
✅ 使用 Draw.io MCP → 导出 SVG → 保持原生风格
❌ 手写 SVG 代码 → 难以达到自然流畅效果
```

### 工作流程图技巧

使用 Draw.io 工作流图模板：
- **泳道布局** - 自动横向泳道，拖拽调整
- **智能连接** - Draw.io 自动路由连线（无需手动画箭头）
- **决策节点** - 使用 Draw.io 原生菱形决策符号
- **起止点** - 使用 Draw.io 终点圆形（自动流入/流出）

**关键**：充分利用 Draw.io 的自动对齐和智能连线功能

### 时序图技巧

使用 Draw.io 序列图模板：
- **角色分离** - Draw.io 自动角色泳道
- **消息箭头** - 选择智能箭头（实线/虚线自动切换）
- **时间轴** - Draw.io 自动时间标记（可配置格式）
- **激活框** - 拖拽激活框到消息/对象上

**关键**：让 Draw.io 自动处理时序逻辑

## 博客文章中的图表应用

### 推荐使用方式

```
drawio-diagram workflow [type] [title] [description] --style chalkboard
```

### 关键原则

1. **优先使用 Draw.io MCP** - 让 AI 通过 drawio-diagram skill 调用 Draw.io
2. **保持视觉一致性** - 所有技术图表使用 chalkboard 风格
3. **自然流畅** - 利用 Draw.io 原生智能连线和布局
4. **统一水印** - 所有图表包含 "Jerret's Blog" 标识

### 图表类型参考

| 类型 | Draw.io 模板 | 用途 |
|------|--------------|------|
| Flowchart | 流程图 | 自动化工作流、数据流 |
| Sequence | 序列图 | 组件交互顺序 |
| Network | 网络图 | 系统架构、服务调用 |
| Mind Map | 思维导图 | 技术点梳理、知识结构 |
| Entity Relationship | 实体关系 | 数据模型、ER 图 |

### 文章示例

在博客文章中需要添加流程图的位置：

```
阶段二 (Astro 迁移): 添加架构图
阶段三 (AI 封面): 添加封面生成流程图
阶段四 (全自动化): 添加完整工作流图
```

生成图表后需验证：

- [ ] SVG 格式正确
- [ ] 文字清晰可读
- [ ] 箭头方向正确
- [ ] 颜色对比足够
- [ ] 导出分辨率适配（推荐 1920x1080 或更高）
- [ ] 文件大小合理（SVG < 500KB）

## 示例输出

**博客架构图（默认自然风格）：**
```
描述: Hexo 博客系统架构
风格: default
组件:
  - Source: source/_posts/ (Markdown)
  - Engine: Hexo (Node.js)
  - Theme: Next (EJS/模板)
  - Deploy: deploy.sh (手动 gh-pages)
特征: 白色背景、柔和配色、圆角节点、贝塞尔曲线
水印: Jerret's Blog
```

**Astro 架构图（默认自然风格）：**
```
描述: Astro 静态博客系统架构
风格: default
组件:
  - Pages: 路由页面
  - Components: UI 组件
  - Content: data/blog/ (Markdown)
  - Build: npm run build (10s!)
  - Deploy: Vercel 自动部署
特征: 白色背景、柔和配色、圆角节点、贝塞尔曲线
水印: Jerret's Blog
```

**AI 封面生成流程图（默认自然风格）：**
```
描述: AI 自动生成封面流程
风格: default
流程:
  - 输入: 手动设计 (PS/Canva, 30-60分钟)
  - AI 处理: Claude Code 分析内容
  - 输出: SVG 封面 (1 分钟!)
  - 验证: lint:images 自动检查
特征: 白色背景、柔和配色、圆角节点、贝塞尔曲线
水印: Jerret's Blog
```

**全自动化工作流图（默认自然风格）：**
```
描述: 博客全自动化发布流程
风格: default
步骤:
  1. 写作: 语雀/本地 Markdown
  2. AI 封面: Claude Code (1分钟)
  3. 自动检查: lint:images
  4. 结构化提交: /dev:commit (5步工作流)
  5. CI/CD: GitHub Actions → Vercel
特征: 白色背景、柔和配色、圆角节点、贝塞尔曲线
水印: Jerret's Blog
```

## Draw.io 原生风格生成示例

### 示例：工作流程图（默认自然风格）

**请求：**
```
drawio-diagram workflow "博客自动化流程" "写作 → AI封面 → 自动检查 → 提交 → CI/CD" --style default
```

**Draw.io 生成要点：**
- 使用 Flowchart 模板
- 启用 **Smooth Connectors**（平滑连接器）
- 设置 **Rounded**（圆角）= 5-10
- 使用 **Curved**（曲线）连接风格
- 应用默认柔和配色方案（蓝、绿、黄、紫、红等）

**结果特征：**
- 线条使用贝塞尔曲线，平滑过渡
- 节点自动对齐，间距均匀
- 箭头自动路由，避免交叉

### 示例 2：架构图（自然风格）

**请求：**
```
drawio-diagram architecture "Astro 博客系统" "Pages + Components + Content + Build + Deploy" --style chalkboard
```

**Draw.io 生成要点：**
- 使用 Network 图模板
- 分层展示：上→下 或 左→右
- 使用 **Auto Layout**（自动布局）
- 设置 **Spacing**（间距）= 40-60px
- 对称布局保持视觉平衡

### 示例 3：时序图（自然风格）

**请求：**
```
drawio-diagram sequence "用户认证流程" "User → Frontend → Backend → Database" --style chalkboard
```

**Draw.io 生成要点：**
- 使用 Sequence Diagram 模板
- 角色自动泳道分隔
- 消息线自动添加箭头
- 时间轴从上到下自然流动

## 自然风格检查清单

生成图表后验证：

- [ ] **线条流畅**：使用曲线而非折线
- [ ] **节点圆角**：`rounded` 属性启用
- [ ] **箭头清晰**：箭头标记明显
- [ ] **布局对称**：左右或上下平衡
- [ ] **间距统一**：组件间距一致
- [ ] **配色和谐**：使用 Draw.io 预设配色
- [ ] **水印完整**：包含 "Jerret's Blog"

## 注意事项

1. **Draw.io 原生文件**：保存 .drawio 格式便于后续修改
2. **SVG 优先**：文章中引用 SVG 格式确保清晰度
3. **简洁原则**：图表要服务于内容，不过度装饰
4. **中英文支持**：技术术语保持英文，描述可用中文
5. **版本控制**：图表文件纳入 Git 管理
