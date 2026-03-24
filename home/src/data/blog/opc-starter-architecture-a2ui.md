---
title: OPC-Starter 架构拆解：A2UI 渲染链路、Supabase Functions 与 AI-First SaaS 底座
pubDatetime: 2026-03-24T10:00:00.000Z
tags:
  - ai
  - agent
  - a2ui
  - supabase
  - react
draft: false
description: "深度拆解 OPC-Starter 的 Agent Studio：从 A2UI 渲染链路、Supabase Edge Functions 到整体设计思想，分析它为什么有价值、问题在哪里，以及下一步应该怎么演进。"
cover: /images/blog-covers/opc-starter-architecture-cover.svg
---

很多人第一次看到 `OPC-Starter`，会把它归类成“带聊天助手的 React 后台模板”。如果只看页面，这么理解也不算错；但只要顺着源码往下拆一层，就会发现它的目标明显更大。

这个项目真正想验证的，不是“怎么把一个聊天框嵌进后台”，而是更激进的命题：**能不能把 Agent 变成产品交互层的一部分，而不是一个外挂的对话窗口。**

<!--more-->

本文会重点拆 5 件事：

1. `A2UI` 的渲染链路到底是怎么跑起来的
2. `Supabase Edge Functions` 在整条链路里承担了什么职责
3. 这套架构背后的设计思想是什么
4. 现在这版实现好在哪里，又卡在哪里
5. 如果继续演进，哪些地方值得重构

如果只想先看结论，可以直接记住一句话：

> `OPC-Starter` 的价值不在于“又一个 React Starter”，而在于它同时在做两层事情：一层是让 AI 更容易开发这个仓库，另一层是让最终产品本身天然带有一个可扩展的 Agent Studio。

## 一、先给结论：它不是聊天增强 UI，而是 Agent-First 交互底座

从 `README` 和架构文档看，这个项目想同时成立两件事：

- **仓库层 AI-first**：让 AI 容易理解并修改代码
- **产品层 Agent-first**：让产品界面可以被 Agent 驱动

第一层比较容易理解。它保留了比较完整的 SaaS 底座：认证、组织管理、设置页、云存储入口、本地优先数据层、Supabase 实时同步。这些东西决定了它不是 demo，而是拿来起一个单人 SaaS MVP 的底座。

第二层才是关键。项目里内置了一套 Agent Studio：悬浮入口、SSE 通道、tool calling、A2UI 协议、前端组件注册表，以及后端的 Edge Function Agent Loop。它的目标不是“问答更聪明”，而是“Agent 除了说话，还可以驱动界面、触发导航、返回结构化 UI”。

这也是为什么我更愿意把它定义成：

**一个面向单人开发者的 AI-first SaaS Starter，而不是一个普通后台模板。**

## 二、A2UI 渲染链路：从文本响应升级到结构化 UI

`A2UI` 是整个项目最值得看的部分，因为它代表了这套架构真正的野心。

普通聊天助手的终点是“返回一段文本”。`OPC-Starter` 想做的则是“返回一棵可渲染、可绑定数据、可交互的组件树”。

![OPC-Starter A2UI 渲染链路](/images/misc/opc-starter-a2ui-flow.svg)

### 1. 用户消息从 `useAgentChat` 起步

前端入口在 `app/src/hooks/useAgentChat.ts`。这个 Hook 做了几件关键的事：

- 创建用户消息和助手占位消息
- 通过 `useAgentContext()` 采集当前页面上下文
- 调用 `useAgentSSE()` 打开流式通道
- 在流式过程中分别处理 `text_delta`、`a2ui`、`tool_call`、`done`

它不是一个简单的“发送字符串” Hook，而是一个对话编排层。代码里把三类状态拆得比较清楚：

```ts
const accumulatedTextRef = useRef<string>('')
const accumulatedA2UIRef = useRef<A2UIServerMessage[]>([])
const pendingToolCallsRef = useRef<ToolCall[]>([])
```

这说明前端从一开始就没有把 Agent 输出等同成“纯文本”，而是把它视为三种并行流：

- 文本流
- UI 协议流
- Tool 调用流

这是这套架构做对的第一个地方。

### 2. SSE Client 负责协议解包，而不是直接碰 UI

真正的网络层在 `app/src/lib/agent/sseClient.ts`。它做的不是业务逻辑，而是协议转换：

- 带上 Supabase session token 调用 Edge Function
- 解析 `text_delta / a2ui / tool_call / done / error`
- 把协议事件回调给上层

这种拆法是合理的。SSE 客户端只关心“事件是什么”，不关心“页面应该怎么渲染”。这样一来，`useAgentChat` 能专心编排消息和状态，渲染逻辑则继续下沉。

### 3. Store 把 A2UI 看成 surface，而不是一段 HTML

真正把 A2UI 消息落到前端状态的是 `app/src/stores/useAgentStore.ts` 里的 `useA2UIMessageHandler()`。

这里最值得注意的是两个概念：

- `surface`
- `dataModel`

也就是说，A2UI 返回的不是“直接可插入 DOM 的字符串”，而是“挂载到某个 surface 的组件树 + 数据模型”。它支持把内容渲染到对话窗口内，也支持渲染到独立区域。移动端下还会把某些 surface 提升成全屏。

这背后的设计其实很像 server-driven UI，只不过驱动端换成了 Agent。

### 4. `A2UIRenderer` 其实是一个解释器

最终渲染发生在 `app/src/components/agent/a2ui/A2UIRenderer.tsx`。

如果只看文件名，容易误以为它只是一个组件分发器。实际上它更像一个 DSL 解释器：

- 从 registry 查找合法组件类型
- 通过 `resolveBindings` 用 `dataModel` 解析绑定值
- 通过 `sanitizeProps` 做安全过滤
- 通过 `wrapActions` 把组件动作包装成统一的 `onAction(componentId, actionId, value)`
- 递归渲染 children

这一层的意义很大。因为它把“LLM 直接输出 UI”这个高风险动作，约束成了“LLM 只能输出一个受控的 JSON DSL，前端解释执行”。这会带来三个好处：

1. 渲染边界清楚，组件类型由前端白名单控制
2. 安全性更高，不需要信任一段任意 HTML
3. 更容易做增量更新和后续协议演进

### 5. 但这条链路里有一个关键设计缺口：split-brain tool execution

真正让我觉得它“思路成熟、实现还没跟上”的地方，也在这里。

问题出在工具调用的执行真相源不统一。

前端 `useAgentChat.ts` 在 `handleDone()` 里，会在服务端返回 `done` 之后，再去执行 `pendingToolCallsRef` 里的本地工具调用：

```ts
for (const toolCall of pendingToolCallsRef.current) {
  const result = await executeToolCall(toolCall)
}
```

但后端 `app/supabase/functions/ai-assistant/agentLoop.ts` 又已经在服务端把 tool call 收集起来，调用 `processToolCall()`，并把 tool result 回填给模型继续跑 loop 了。

```ts
const result = processToolCall(tc.name, tc.id, args, sse, agentContext)
toolResults.push(result)
```

这意味着现在的流程不是标准的：

`LLM -> 请求工具 -> 客户端执行 -> 结果回传 -> LLM 继续`

而更像是：

`LLM -> 服务端先假设工具执行成功 -> LLM 继续 -> 客户端事后补执行副作用`

这会导致典型的 split-brain 问题：

- 服务端认为导航已经成功，但前端可能失败
- 服务端看到的上下文和浏览器现场上下文并不完全等价
- 后端的“工具已执行”与前端的真实副作用存在时间差

这不是一个小瑕疵，而是这套架构当前最核心的工程风险。

## 三、Supabase Edge Functions：不是 AI API 包装器，而是最小 Agent Gateway

`app/supabase/functions/ai-assistant` 这组文件非常值得看，因为它没有把后端做成一个“把 prompt 转发给模型”的薄代理，而是明确做成了一个 Agent Gateway。

### 1. `index.ts` 负责网关入口和认证

入口文件 `index.ts` 做的事情很标准，也很关键：

- 处理 CORS 和 method
- 校验 `ALIYUN_BAILIAN_API_KEY`
- 通过 Supabase token 做用户认证
- 把请求内容转成内部消息结构
- 创建 `TransformStream`，返回 SSE 响应

也就是说，后端从一开始就不是为了“一次性返回 JSON”，而是为了“持续流式输出 Agent 事件”而设计的。

### 2. `sse.ts` 负责协议桥接

`sse.ts` 的价值在于协议边界清晰。

它承担了两层转换：

- HTTP/SSE 输出格式
- OpenAI-compatible message / tool call 的内部拼装

这一步很重要，因为未来要接 OpenAI、Anthropic、Gemini，理论上最先改的应该是 provider 适配和协议桥接，而不应该把业务逻辑散落到每一层。

### 3. `agentLoop.ts` 是一个很典型、也很干净的 MVP

`agentLoop.ts` 里的主循环并不复杂：

1. 调模型
2. 一边流式返回文本，一边积累 tool call
3. 如果有工具调用，就执行工具并把结果追加到消息历史
4. 如果没有工具调用，就返回 `done`

这套实现最大的优点是清楚、可读、容易调试。

```ts
const stream = await openai.chat.completions.create({
  model: 'qwen-plus',
  messages: currentMessages,
  tools: TOOLS,
  stream: true,
})
```

但也正因为它是一个“思路正确的 MVP”，所以局限也非常明显：

- provider 写死成百炼兼容 OpenAI
- model 写死成 `qwen-plus`
- `threadId` 没有形成真正的会话持久化能力
- 工具面太薄，几乎没有深入业务的读写工具

### 4. `tools.ts` 说明它还停留在非常早期的 Agent Surface

当前工具只有 3 个：

- `navigateToPage`
- `getCurrentContext`
- `renderUI`

这三个工具对于跑通 demo 是足够的，但对于“真正把 Agent 做成产品能力”还远远不够。

更关键的是，`renderUI` 的 schema 只允许很少的组件类型：

```ts
enum: ['card', 'button', 'text', 'badge', 'progress']
```

而前端 registry 其实已经支持更多组件。也就是说，**前端能力已经往前走了，后端协议还停留在更窄的白名单里。**

这会让系统出现一种很典型的阶段性错位：

- 前端以为自己是“可扩展 A2UI”
- 后端实际上仍然是“有限 UI demo”

## 四、整体设计思想：双层 AI-first

如果把这套系统拔高到设计哲学层面，我觉得它最值得肯定的是：它不是单点 AI 化，而是双层 AI-first。

### 1. 第一层：仓库本身对 AI 友好

这一层很多人容易忽略，但其实很重要。

从 `README`、`AGENTS.md`、mock 模式、架构测试、代理脚本来看，这个仓库明显在努力降低 AI 进入项目的门槛。它希望 Coding Agent 不是一个“外部帮手”，而是能稳定接手项目上下文、执行修改和验证的生产力。

### 2. 第二层：最终产品对 Agent 友好

这一层由 Agent Studio 来承载。它让 Agent 不是一个工具栏插件，而是产品内原生存在的交互入口。对最终用户来说，这意味着：

- 可以通过对话触发界面行为
- 可以得到结构化 UI，而不只是文本建议
- 可以把 Agent 逐步扩展成业务操作面板

### 3. 第三根暗线：local-first data

很多人会把注意力都放在 Agent 上，但这个项目还有一条很重要的暗线：`IndexedDB + offline queue + realtime` 的数据策略。

这说明作者并没有把它做成一个“AI demo 项目”，而是把它当成一个真实业务底座在设计。对单人开发者来说，这一点很重要，因为真正上线的 SaaS，稳定性和弱网体验比“AI 能不能多说两句”更重要。

## 五、它现在最大的问题，不是代码乱，而是目标已经超过了当前实现层级

我对这类项目通常会区分两类风险：

- 思路错了
- 思路对了，但实现层级还跟不上目标

`OPC-Starter` 明显属于第二种。

它现在最主要的问题不是代码风格，而是“目标已经长成平台视角，实现还停在 MVP 视角”。

### 1. 工具执行真相源不统一

这已经在上面讲过，是优先级最高的问题。

更好的做法只有两种：

- **客户端执行工具，服务端等待结果再继续 loop**
- **服务端执行工具，前端只消费状态变化**

现在这种“服务端先写结果，前端再补副作用”的双轨制，会长期伤害一致性。

### 2. provider 抽象层还没建立

当前 `agentLoop.ts` 直接写死 `qwen-plus + Bailian compatible OpenAI`。这对 MVP 没问题，但一旦你想接 OpenAI、Claude、Gemini，就会发现 provider 逻辑、消息结构、tool capability、stream parsing 都需要被抽象出来。

更好的形态是：

- provider adapter
- model config
- prompt policy
- tool policy
- stream translator

分层后，切模型才会变成“换 adapter”，而不是“改整条链路”。

### 3. A2UI schema 没有共享真相源

后端工具白名单和前端 registry 不是同一份定义，这是典型的协议飘移。

更好的做法是抽出一份共享 schema：

- 组件类型
- props 结构
- action 定义
- render target
- data binding 规则

这样前后端才不会各长各的。

### 4. 业务工具面太薄

现在的工具更像“Agent demo tool”，而不是“业务操作 tool”。

如果未来想让这套架构真正有产品价值，应该优先补的是业务能力，比如：

- 组织查询
- 成员读写
- 设置页配置读写
- 存储状态查询
- 同步状态与错误恢复

只有这样，换更强的模型才真的有意义。否则只是“更会聊天”，不会“更会办事”。

### 5. 领域残留会持续污染 starter 叙事

项目里还有一些明显的 `Photo Wall` 历史痕迹。短期看它们只是文案残留，长期看却会持续影响扩展性，因为它们会让：

- prompt 叙事不纯
- UI 文案不统一
- 新增功能时出现无关领域概念

这类 starter 一旦想成为真正的公共底座，历史领域残留就必须尽早清掉。

## 六、如果让我来迭代下一版，我会怎么设计

如果让我给下一阶段的演进顺序排优先级，我会按下面这条线来做：

### 第一优先级：统一 tool execution 模式

先选定唯一真相源。

如果工具天然需要浏览器上下文，比如导航、读取当前页面状态、局部 UI 动作，那么更推荐：

`server 发 tool request -> client 执行 -> client 发送 tool result -> server 继续推理`

这样链路虽然更长，但状态一致性最好。

### 第二优先级：抽 provider adapter

把模型接入抽象成配置驱动：

- `provider`
- `model`
- `baseURL`
- `apiKey`
- `supportsTools`
- `supportsJsonMode`

这一步做完之后，系统才真正开始具备“多模型运行时”能力。

### 第三优先级：共享 A2UI schema

我会把 A2UI 协议抽成单独包，前后端同时消费。这样一来：

- 组件新增不会漏后端白名单
- action schema 能同步演进
- data binding 能做类型校验

### 第四优先级：把 prompt 和 tool policy 从代码里拿出来

system prompt 深埋在代码里，短期很方便，长期却难以治理。更好的方式是：

- prompt 配置化
- 按角色拆分
- 版本化管理
- 支持环境差异

### 第五优先级：从“demo tools”升级到“业务 tools”

这是最晚但也最关键的一步。因为只有工具真正触达业务能力，Agent Studio 才不只是一个漂亮的内置聊天框，而会变成一个真正能替用户做事的操作层。

## 七、最后的评价：方向是对的，而且骨架已经长出来了

如果今天有人问我，这个项目值不值得看，我的答案是值得，而且不是因为它“已经做完了”，而是因为它已经把最难的方向选对了。

`OPC-Starter` 最值得肯定的地方，不是它已经成为一个成熟平台，而是它已经把三个非常关键的命题放进了同一个工程里：

- AI 友好的仓库结构
- 可扩展的 runtime agent
- 面向真实业务的 local-first 数据底座

它现在的问题也很明确：工具执行一致性、provider 抽象、A2UI 协议统一、业务工具面扩展。这些都不是推翻重来级别的问题，而是“骨架已经对了，接下来要把关键关节补强”的问题。

如果你是单人开发者，想快速起一个带组织管理和 AI 助手的 SaaS 原型，这个项目很有参考价值。  
如果你是做 Agent 产品的人，这个项目更值得看的不是 UI，而是它在尝试回答一个非常重要的问题：

**当 Agent 不再只是聊天框，而成为产品内的交互编排层时，前后端应该怎么重新分工？**

这也是我认为 `OPC-Starter` 最有价值的地方。
