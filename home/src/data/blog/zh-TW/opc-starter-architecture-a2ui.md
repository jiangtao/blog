---
title: D2分享- OPC-Starter一個 Agent Studio 項目
pubDatetime: 2026-03-24T10:00:00.000Z
tags:
  - ai
  - agent
  - a2ui
  - supabase
  - react
draft: false
description: "深度拆解 OPC-Starter 的 Agent Studio：從 A2UI 渲染鏈路、Supabase Edge Functions 到整體設計思想，分析它為甚麼有價值、問題在哪裡，以及下一步應該怎麼演進。"
cover: /images/i18n/zh-TW/blog-covers/opc-starter-architecture-a2ui-cover.svg
locale: zh-TW
translationKey: opc-starter-architecture-a2ui
---

D2 分享了[`OPC-Starter`](https://github.com/alibaba/opc-starter)，會把它歸類成“帶聊天助手的 React 後台模板”。如果只看頁面，這麼理解也不算錯；但只要順著源碼往下拆一層，就會發現它的目標明顯更大。

這個項目真正想驗證的，不是“怎麼把一個聊天框嵌進後台”，而是更激進的命題：**能不能把 Agent 變成產品交互層的一部分，而不是一個外掛的對話窗口。**

<!--more-->

本文會重點拆 5 件事：

1. `A2UI` 的渲染鏈路到底是怎麼跑起來的
2. `Supabase Edge Functions` 在整條鏈路里承擔了甚麼職責
3. 這套架構背後的設計思想是甚麼
4. 現在這版實現好在哪裡，又卡在哪裡
5. 如果繼續演進，哪些地方值得重構

如果只想先看結論，可以直接記住一句話：

> `OPC-Starter` 的價值不在於“又一個 React Starter”，而在於它同時在做兩層事情：一層是讓 AI 更容易開發這個倉庫，另一層是讓最終產品本身天然帶有一個可擴展的 Agent Studio。

## 一、先給結論：它不是聊天增強 UI，而是 Agent-First 交互底座

從 `README` 和架構文檔看，這個項目想同時成立兩件事：

- **倉庫層 AI-first**：讓 AI 容易理解並修改代碼
- **產品層 Agent-first**：讓產品界面可以被 Agent 驅動

第一層比較容易理解。它保留了比較完整的 SaaS 底座：認證、組織管理、設置頁、雲存儲入口、本地優先數據層、Supabase 實時同步。這些東西決定了它不是 demo，而是拿來起一個單人 SaaS MVP 的底座。

第二層才是關鍵。項目里內置了一套 Agent Studio：懸浮入口、SSE 通道、tool calling、A2UI 協議、前端組件注冊表，以及後端的 Edge Function Agent Loop。它的目標不是“問答更聰明”，而是“Agent 除了說話，還可以驅動界面、觸發導航、返回結構化 UI”。

這也是為甚麼我更願意把它定義成：

**一個面向單人開發者的 AI-first SaaS Starter，而不是一個普通後台模板。**

## 二、A2UI 渲染鏈路：從文本響應升級到結構化 UI

`A2UI` 是整個項目最值得看的部分，因為它代表了這套架構真正的野心。

普通聊天助手的終點是“返回一段文本”。`OPC-Starter` 想做的則是“返回一棵可渲染、可綁定數據、可交互的組件樹”。

![OPC-Starter A2UI 渲染鏈路](/images/i18n/zh-TW/misc/opc-starter-a2ui-flow.svg)

### 1. 用戶消息從 `useAgentChat` 起步

前端入口在 `app/src/hooks/useAgentChat.ts`。這個 Hook 做了幾件關鍵的事：

- 創建用戶消息和助手佔位消息
- 通過 `useAgentContext()` 採集當前頁面上下文
- 調用 `useAgentSSE()` 打開流式通道
- 在流式過程中分別處理 `text_delta`、`a2ui`、`tool_call`、`done`

它不是一個簡單的“發送字符串” Hook，而是一個對話編排層。代碼里把三類狀態拆得比較清楚：

```ts
const accumulatedTextRef = useRef<string>('')
const accumulatedA2UIRef = useRef<A2UIServerMessage[]>([])
const pendingToolCallsRef = useRef<ToolCall[]>([])
```

這說明前端從一開始就沒有把 Agent 輸出等同成“純文本”，而是把它視為三種並行流：

- 文本流
- UI 協議流
- Tool 調用流

這是這套架構做對的第一個地方。

### 2. SSE Client 負責協議解包，而不是直接碰 UI

真正的網絡層在 `app/src/lib/agent/sseClient.ts`。它做的不是業務邏輯，而是協議轉換：

- 帶上 Supabase session token 調用 Edge Function
- 解析 `text_delta / a2ui / tool_call / done / error`
- 把協議事件回調給上層

這種拆法是合理的。SSE 客戶端只關心“事件是甚麼”，不關心“頁面應該怎麼渲染”。這樣一來，`useAgentChat` 能專心編排消息和狀態，渲染邏輯則繼續下沈。

### 3. Store 把 A2UI 看成 surface，而不是一段 HTML

真正把 A2UI 消息落到前端狀態的是 `app/src/stores/useAgentStore.ts` 里的 `useA2UIMessageHandler()`。

這裡最值得注意的是兩個概念：

- `surface`
- `dataModel`

也就是說，A2UI 返回的不是“直接可插入 DOM 的字符串”，而是“掛載到某個 surface 的組件樹 + 數據模型”。它支持把內容渲染到對話窗口內，也支持渲染到獨立區域。移動端下還會把某些 surface 提升成全屏。

這背後的設計其實很像 server-driven UI，只不過驅動端換成了 Agent。

### 4. `A2UIRenderer` 其實是一個解釋器

最終渲染髮生在 `app/src/components/agent/a2ui/A2UIRenderer.tsx`。

如果只看文件名，容易誤以為它只是一個組件分發器。實際上它更像一個 DSL 解釋器：

- 從 registry 查找合法組件類型
- 通過 `resolveBindings` 用 `dataModel` 解析綁定值
- 通過 `sanitizeProps` 做安全過濾
- 通過 `wrapActions` 把組件動作包裝成統一的 `onAction(componentId, actionId, value)`
- 遞歸渲染 children

這一層的意義很大。因為它把“LLM 直接輸出 UI”這個高風險動作，約束成了“LLM 只能輸出一個受控的 JSON DSL，前端解釋執行”。這會帶來三個好處：

1. 渲染邊界清楚，組件類型由前端白名單控制
2. 安全性更高，不需要信任一段任意 HTML
3. 更容易做增量更新和後續協議演進

### 5. 但這條鏈路里有一個關鍵設計缺口：split-brain tool execution

真正讓我覺得它“思路成熟、實現還沒跟上”的地方，也在這裡。

**問題出在工具調用的執行真相源不統一**,應該是項目MVP 階段，這塊需要在深化。

前端 `useAgentChat.ts` 在 `handleDone()` 里，會在服務端返回 `done` 之後，再去執行 `pendingToolCallsRef` 里的本地工具調用：

```ts
for (const toolCall of pendingToolCallsRef.current) {
  const result = await executeToolCall(toolCall)
}
```

但後端 `app/supabase/functions/ai-assistant/agentLoop.ts` 又已經在服務端把 tool call 收集起來，調用 `processToolCall()`，並把 tool result 回填給模型繼續跑 loop 了。

```ts
const result = processToolCall(tc.name, tc.id, args, sse, agentContext)
toolResults.push(result)
```

這意味著現在的流程不是標準的：

`LLM -> 請求工具 -> 客戶端執行 -> 結果回傳 -> LLM 繼續`

而更像是：

`LLM -> 服務端先假設工具執行成功 -> LLM 繼續 -> 客戶端事後補執行副作用`

這會導致典型的 split-brain 問題：

- 服務端認為導航已經成功，但前端可能失敗
- 服務端看到的上下文和瀏覽器現場上下文並不完全等價
- 後端的“工具已執行”與前端的真實副作用存在時間差

這不是一個小瑕疵，而是這套架構當前最核心的工程風險。

## 三、Supabase Edge Functions：不是 AI API 包裝器，而是最小 Agent Gateway

`app/supabase/functions/ai-assistant` 這組文件非常值得看，因為它沒有把後端做成一個“把 prompt 轉發給模型”的薄代理，而是明確做成了一個 Agent Gateway。

### 1. `index.ts` 負責網關入口和認證

入口文件 `index.ts` 做的事情很標準，也很關鍵：

- 處理 CORS 和 method
- 校驗 `ALIYUN_BAILIAN_API_KEY`
- 通過 Supabase token 做用戶認證
- 把請求內容轉成內部消息結構
- 創建 `TransformStream`，返回 SSE 響應

也就是說，後端從一開始就不是為了“一次性返回 JSON”，而是為了“持續流式輸出 Agent 事件”而設計的。

### 2. `sse.ts` 負責協議橋接

`sse.ts` 的價值在於協議邊界清晰。

它承擔了兩層轉換：

- HTTP/SSE 輸出格式
- OpenAI-compatible message / tool call 的內部拼裝

這一步很重要，因為未來要接 OpenAI、Anthropic、Gemini，理論上最先改的應該是 provider 適配和協議橋接，而不應該把業務邏輯散落到每一層。

### 3. `agentLoop.ts` 是一個很典型、也很乾淨的 MVP

`agentLoop.ts` 里的主循環並不複雜：

1. 調模型
2. 一邊流式返回文本，一邊積累 tool call
3. 如果有工具調用，就執行工具並把結果追加到消息歷史
4. 如果沒有工具調用，就返回 `done`

這套實現最大的優點是清楚、可讀、容易調試。

```ts
const stream = await openai.chat.completions.create({
  model: 'qwen-plus',
  messages: currentMessages,
  tools: TOOLS,
  stream: true,
})
```

但也正因為它是一個“思路正確的 MVP”，所以局限也非常明顯：

- provider 寫死成百煉兼容 OpenAI
- model 寫死成 `qwen-plus`
- `threadId` 沒有形成真正的會話持久化能力
- 工具面太薄，幾乎沒有深入業務的讀寫工具

> 這也是後續在設計項目需要考慮的事情，一方面 Agent Model 來源、成本、效果、穩定性都不同，最好是設計adapter層統一輸出，確保擴展良好，或者 Router 層分發來實現

### 4. `tools.ts` 說明它還停留在非常早期的 Agent Surface

當前工具只有 3 個：

- `navigateToPage`
- `getCurrentContext`
- `renderUI`

這三個工具對於跑通 demo 是足夠的，但對於“真正把 Agent 做成產品能力”還遠遠不夠。

更關鍵的是，`renderUI` 的 schema 只允許很少的組件類型：

```ts
enum: ['card', 'button', 'text', 'badge', 'progress']
```

而前端 registry 其實已經支持更多組件。也就是說，**前端能力已經往前走了，後端協議還停留在更窄的白名單里。**

這會讓系統出現一種很典型的階段性錯位：

- 前端以為自己是“可擴展 A2UI”
- 後端實際上仍然是“有限 UI demo”

> 相比於上古時代的低代碼擴展來說還得加油，但從理念來說相對超前

## 四、整體設計思想：雙層 AI-first

如果把這套系統拔高到設計哲學層面，我覺得它最值得肯定的是：它不是單點 AI 化，而是雙層 AI-first。

### 1. 第一層：倉庫本身對 AI 友好

這一層很多人容易忽略，但其實很重要。

從 `README`、`AGENTS.md`、mock 模式、架構測試、代理腳本來看，這個倉庫明顯在努力降低 AI 進入項目的門檻。它希望 Coding Agent 不是一個“外部幫手”，而是能穩定接手項目上下文、執行修改和驗證的生產力。

### 2. 第二層：最終產品對 Agent 友好

這一層由 Agent Studio 來承載。它讓 Agent 不是一個工具欄插件，而是產品內原生存在的交互入口。對最終用戶來說，這意味著：

- 可以通過對話觸發界面行為
- 可以得到結構化 UI，而不只是文本建議
- 可以把 Agent 逐步擴展成業務操作面板

### 3. 第三根暗線：local-first data

很多人會把注意力都放在 Agent 上，但這個項目還有一條很重要的暗線：`IndexedDB + offline queue + realtime` 的數據策略。

這說明作者並沒有把它做成一個“AI demo 項目”，而是把它當成一個真實業務底座在設計。對單人開發者來說，這一點很重要，因為真正上線的 SaaS，穩定性和弱網體驗比“AI 能不能多說兩句”更重要。

## 五、它現在最大的問題，不是代碼亂，而是目標已經超過了當前實現層級

我對這類項目通常會區分兩類風險：

- 思路錯了
- 思路對了，但實現層級還跟不上目標

`OPC-Starter` 明顯屬於第二種。

它現在最主要的問題不是代碼風格，而是“目標已經長成平台視角，實現還停在 MVP 視角”。

### 1. 工具執行真相源不統一

這已經在上面講過，是優先級最高的問題。

更好的做法只有兩種：

- **客戶端執行工具，服務端等待結果再繼續 loop**
- **服務端執行工具，前端只消費狀態變化**

現在這種“服務端先寫結果，前端再補副作用”的雙軌制，會長期傷害一致性。

### 2. provider 抽象層還沒建立

當前 `agentLoop.ts` 直接寫死 `qwen-plus + Bailian compatible OpenAI`。這對 MVP 沒問題，但一旦你想接 OpenAI、Claude、Gemini，就會發現 provider 邏輯、消息結構、tool capability、stream parsing 都需要被抽象出來。

更好的形態是：

- provider adapter
- model config
- prompt policy
- tool policy
- stream translator

分層後，切模型才會變成“換 adapter”，而不是“改整條鏈路”。

### 3. A2UI schema 沒有共享真相源

後端工具白名單和前端 registry 不是同一份定義，這是典型的協議飄移。

更好的做法是抽出一份共享 schema：

- 組件類型
- props 結構
- action 定義
- render target
- data binding 規則

這樣前後端才不會各長各的。

### 4. 業務工具面太薄

現在的工具更像“Agent demo tool”，而不是“業務操作 tool”。

如果未來想讓這套架構真正有產品價值，應該優先補的是業務能力，比如：

- 組織查詢
- 成員讀寫
- 設置頁配置讀寫
- 存儲狀態查詢
- 同步狀態與錯誤恢復

只有這樣，換更強的模型才真的有意義。否則只是“更會聊天”，不會“更會辦事”。

### 5. 領域殘留會持續污染 starter 敘事

項目里還有一些明顯的 `Photo Wall` 歷史痕跡。短期看它們只是文案殘留，長期看卻會持續影響擴展性，因為它們會讓：

- prompt 敘事不純
- UI 文案不統一
- 新增功能時出現無關領域概念

這類 starter 一旦想成為真正的公共底座，歷史領域殘留就必須盡早清掉。

## 六、如果讓我來迭代下一版，我會怎麼設計

如果讓我給下一階段的演進順序排優先級，我會按下面這條線來做：

### 第一優先級：統一 tool execution 模式

先選定唯一真相源。

如果工具天然需要瀏覽器上下文，比如導航、讀取當前頁面狀態、局部 UI 動作，那麼更推薦：

`server 發 tool request -> client 執行 -> client 發送 tool result -> server 繼續推理`

這樣鏈路雖然更長，但狀態一致性最好。

### 第二優先級：抽 provider adapter

把模型接入抽象成配置驅動：

- `provider`
- `model`
- `baseURL`
- `apiKey`
- `supportsTools`
- `supportsJsonMode`

這一步做完之後，系統才真正開始具備“多模型運行時”能力。

### 第三優先級：共享 A2UI schema

我會把 A2UI 協議抽成單獨包，前後端同時消費。這樣一來：

- 組件新增不會漏後端白名單
- action schema 能同步演進
- data binding 能做類型校驗

### 第四優先級：把 prompt 和 tool policy 從代碼里拿出來

system prompt 深埋在代碼里，短期很方便，長期卻難以治理。更好的方式是：

- prompt 配置化
- 按角色拆分
- 版本化管理
- 支持環境差異

### 第五優先級：從“demo tools”升級到“業務 tools”

這是最晚但也最關鍵的一步。因為只有工具真正觸達業務能力，Agent Studio 才不只是一個漂亮的內置聊天框，而會變成一個真正能替用戶做事的操作層。

## 七、最後的評價：方向是對的，而且骨架已經長出來了

如果今天有人問我，這個項目值不值得看，我的答案是值得，而且不是因為它“已經做完了”，而是因為它已經把最難的方向選對了。

`OPC-Starter` 最值得肯定的地方，不是它已經成為一個成熟平台，而是它已經把三個非常關鍵的命題放進了同一個工程里：

- AI 友好的倉庫結構
- 可擴展的 runtime agent
- 面向真實業務的 local-first 數據底座

它現在的問題也很明確：工具執行一致性、provider 抽象、A2UI 協議統一、業務工具面擴展。這些都不是推翻重來級別的問題，而是“骨架已經對了，接下來要把關鍵關節補強”的問題。

如果你是單人開發者，想快速起一個帶組織管理和 AI 助手的 SaaS 原型，這個項目很有參考價值。
如果你是做 Agent 產品的人，這個項目更值得看的不是 UI，而是它在嘗試回答一個非常重要的問題：

**當 Agent 不再只是聊天框，而成為產品內的交互編排層時，前後端應該怎麼重新分工？**

這也是 `OPC-Starter` 最有價值的地方，對 AGUC嘞應用來說是一個不錯的參考方向
