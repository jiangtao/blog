---
title: "A Technical Review of OPC-Starter, an Agent Studio Project"
pubDatetime: 2026-03-24T10:00:00.000Z
tags:
  - "ai"
  - "agent"
  - "a2ui"
  - "supabase"
  - "react"
draft: false
description: "A technical analysis of OPC-Starter's Agent Studio: its A2UI rendering pipeline, Supabase Edge Functions, architectural value, current limitations, and possible next steps."
cover: /images/i18n/en/blog-covers/opc-starter-architecture-a2ui-cover.svg
locale: en
translationKey: opc-starter-architecture-a2ui
---
At D2, I presented [`OPC-Starter`](https://github.com/alibaba/opc-starter). At first glance, it looks like a React administration template with a chat assistant. That description is not wrong, but the source code points to a more ambitious goal.

The project is not testing how to add a chat box to an admin console. It is testing whether an agent can become part of the product interaction layer rather than remain an isolated conversational add-on.

<!--more-->

This article will focus on 5 things:

1. How does the rendering link of `A2UI` work?
2. What responsibilities does `Supabase Edge Functions` undertake in the entire link?
3. What is the design idea behind this architecture?
4. What the current implementation does well, and where it is constrained.
5. If we continue to evolve, which areas are worth refactoring?

If you only need the conclusion, it is this:

> `OPC-Starter` is valuable not because it is another React starter, but because it works at two levels: it makes the repository easier for AI to understand and change, and it makes the product itself an extensible Agent Studio.

## 1. The core idea: an agent-first interaction foundation, not chat-enhanced UI

Judging from the `README` and architecture documents, this project wants to establish two things at the same time:

- **AI-first repository**: make the codebase easier for AI to understand and modify.
- **Agent-first product**: let agents drive parts of the product interface.

The first level is easier to understand. It retains a relatively complete SaaS base: authentication, organization management, settings page, cloud storage portal, local-first data layer, and Supabase real-time synchronization. These things determine that it is not a demo, but a base for a single-person SaaS MVP.

The second level is the key. A set of Agent Studio is built into the project: floating portal, SSE channel, tool calling, A2UI protocol, front-end component registry, and back-end Edge Function Agent Loop. Its goal is not "Q&A is smarter", but "In addition to speaking, Agent can also drive the interface, trigger navigation, and return to structured UI."

This is why I prefer to define it as:

**An AI-first SaaS Starter for single developers, rather than a normal backend template. **

## 2. A2UI rendering link: upgrade from text response to structured UI

`A2UI` is the most worth-seeing part of the entire project, because it represents the true ambition of this architecture.

The end point of a normal chat assistant is "return a piece of text". What `OPC-Starter` wants to do is "return a renderable, data-bindable, and interactive component tree."

![OPC-Starter A2UI rendering link](/images/i18n/en/misc/opc-starter-a2ui-flow.svg)

### 1. User messages start from `useAgentChat`

The front-end entry is in `app/src/hooks/useAgentChat.ts`. This Hook does several key things:

- Create user messages and assistant placeholder messages
- Collect the current page context through `useAgentContext()`
- Call `useAgentSSE()` to open the streaming channel
- Process `text_delta`, `a2ui`, `tool_call`, and `done` respectively during the streaming process

It's not a simple "send a string" Hook, but a conversation orchestration layer. The three types of states are broken down more clearly in the code:

```ts
const accumulatedTextRef = useRef<string>('')
const accumulatedA2UIRef = useRef<A2UIServerMessage[]>([])
const pendingToolCallsRef = useRef<ToolCall[]>([])
```

This shows that the front end did not equate Agent output to "plain text" from the beginning, but regarded it as three parallel streams:

- text flow
- UI protocol flow
- Tool call flow

This is the first thing this architecture does right.

### 2. SSE Client is responsible for protocol unpacking, rather than directly touching the UI

The real network layer is in `app/src/lib/agent/sseClient.ts`. What it does is not business logic, but protocol conversion:

- Call Edge Function with Supabase session token
- Parse `text_delta/a2ui/tool_call/done/error`
- Call back protocol events to the upper layer

This disassembly method is reasonable. The SSE client only cares about "what the event is" and not "how the page should be rendered". In this way, `useAgentChat` can focus on arranging messages and status, while the rendering logic continues to sink in.

### 3. Store treats A2UI as a surface instead of a piece of HTML

What actually puts A2UI messages into the front-end state is `useA2UIMessageHandler()` in `app/src/stores/useAgentStore.ts`.

The most noteworthy here are two concepts:

- `surface`
- `dataModel`

In other words, what A2UI returns is not a "string that can be directly inserted into the DOM", but a "component tree + data model mounted to a surface". It supports rendering content into the dialog window and into an independent area. On the mobile side, some surfaces will also be upgraded to full screen.

The design behind this is actually very similar to a server-driven UI, except that the driver is replaced by an Agent.

### 4. `A2UIRenderer` is actually an interpreter

Final rendering occurs in `app/src/components/agent/a2ui/A2UIRenderer.tsx`.

If you just look at the file name, it's easy to mistake it for just a component distributor. Actually it's more like a DSL interpreter:

- Find legal component types from registry
- Resolve binding values using `dataModel` via `resolveBindings`
- Security filtering through `sanitizeProps`
- Use `wrapActions` to wrap component actions into unified `onAction(componentId, actionId, value)`
- Render children recursively

This level is of great significance. Because it restricts the high-risk action of "LLM directly outputting the UI" to "LLM can only output a controlled JSON DSL, which is interpreted and executed by the front end". This brings three benefits:

1. The rendering boundary is clear, and component types are controlled by the front-end whitelist.
2. Higher security, no need to trust any piece of HTML
3. Easier to do incremental updates and subsequent protocol evolution

### 5. But there is a key design gap in this link: split-brain tool execution

What really makes me feel that its "ideas are mature and its implementation has not yet caught up" is here.

**The problem lies in the fact that the execution truth source of tool calls is not unified**, it should be the project MVP stage, this area needs to be deepened.

The front-end `useAgentChat.ts` in `handleDone()` will execute the local tool call in `pendingToolCallsRef` after the server returns `done`:

```ts
for (const toolCall of pendingToolCallsRef.current) {
  const result = await executeToolCall(toolCall)
}
```

But the backend `app/supabase/functions/ai-assistant/agentLoop.ts` has collected tool calls on the server side, called `processToolCall()`, and backfilled the tool results to the model to continue running the loop.

```ts
const result = processToolCall(tc.name, tc.id, args, sse, agentContext)
toolResults.push(result)
```

This means that the current process is not standard:

`LLM -> Request Tool -> Client Execution -> Result Return -> LLM Continue`

Rather it's more like:

`LLM -> The server first assumes that the tool execution is successful -> LLM continues -> The client executes the side effects afterwards`

This leads to typical split-brain problems:

- The server thinks the navigation has been successful, but the front end may fail
- The context seen by the server and the live context of the browser are not completely equivalent
- There is a time lag between the "tool executed" on the backend and the real side effects on the frontend

This is not a small flaw, but the core engineering risk of this architecture.

## 3. Supabase Edge Functions: Not an AI API wrapper, but a minimal Agent Gateway

`app/supabase/functions/ai-assistant` This set of files is worth reading because it does not make the backend a thin proxy that "forwards prompts to the model", but explicitly makes it an Agent Gateway.

### 1. `index.ts` is responsible for gateway entry and authentication

What the entry file `index.ts` does is very standard and critical:

- Handling CORS and methods
- Verify `ALIYUN_BAILIAN_API_KEY`
- User authentication through Supabase token
- Convert request content into internal message structure
- Create `TransformStream` to return SSE response

In other words, the backend was not designed from the beginning to "return JSON once", but to "continuously stream output of Agent events".

### 2. `sse.ts` is responsible for protocol bridging

The value of `sse.ts` lies in clear protocol boundaries.

It undertakes two levels of conversion:

- HTTP/SSE output format
- Internal assembly of OpenAI-compatible message / tool call

This step is very important, because in the future, OpenAI, Anthropic, and Gemini will be connected. In theory, the first thing to change should be provider adaptation and protocol bridging, rather than spreading business logic to each layer.

### 3. `agentLoop.ts` is a very typical and clean MVP

The main loop in `agentLoop.ts` is not complicated:

1. Adjust the model
2. Streaming text is returned while accumulating tool calls
3. If there is a tool call, execute the tool and append the results to the message history
4. If there is no tool call, return `done`

The biggest advantage of this implementation is that it is clear, readable, and easy to debug.

```ts
const stream = await openai.chat.completions.create({
  model: 'qwen-plus',
  messages: currentMessages,
  tools: TOOLS,
  stream: true,
})
```

But precisely because it is a "MVP with the right ideas", its limitations are also very obvious:

- Provider is programmed to be compatible with OpenAI
- The model is programmed into `qwen-plus`
- `threadId` does not form a real session persistence capability
- The tool surface is too thin, and there are almost no reading and writing tools that go deep into the business

> This is also something that needs to be considered in subsequent design projects. On the one hand, Agent Model sources, costs, effects, and stability are different. It is best to design the adapter layer for unified output to ensure good expansion, or implement it through Router layer distribution.

### 4. `tools.ts` shows that it is still in the very early stage of Agent Surface

Currently there are only 3 tools:

- `navigateToPage`
- `getCurrentContext`
- `renderUI`

These three tools are enough for running through the demo, but they are far from enough for "the ability to truly turn Agent into a product."

More importantly, `renderUI`'s schema only allows a few component types:

```ts
enum: ['card', 'button', 'text', 'badge', 'progress']
```

The front-end registry actually supports more components. In other words, **front-end capabilities have moved forward, while back-end protocols still remain in a narrower whitelist. **

This will cause a very typical phase dislocation in the system:

- The front end thinks it is "extensible A2UI"
- The backend is still effectively a "limited UI demo"

> Compared with the low-code extensions of ancient times, it has to be improved, but it is relatively advanced in terms of concept.

## 4. Overall design idea: double-layer AI-first

If we elevate this system to the level of design philosophy, I think the most worthy of recognition is that it is not a single-point AI, but a two-layer AI-first.

### 1. The first layer: the warehouse itself is AI-friendly

Many people tend to overlook this layer, but it is actually very important.

Judging from `README`, `AGENTS.md`, mock mode, architecture testing, and agent scripts, this warehouse is obviously trying to lower the threshold for AI to enter the project. It hopes that the Coding Agent will not be an "external helper", but a productivity that can stably take over the project context, perform modifications and verifications.

### 2. Second level: The final product is Agent-friendly

This layer is hosted by Agent Studio. It makes Agent not a toolbar plug-in, but a native interactive portal within the product. For end users, this means:

- Interface behavior can be triggered through dialogue
- Can get structured UI instead of just text suggestions
- Agent can be gradually expanded into a business operation panel

### 3. The third dark line: local-first data

Many people will focus on Agent, but this project also has a very important hidden line: the data strategy of `IndexedDB + offline queue + realtime`.

This shows that the author did not make it an "AI demo project", but designed it as a real business base. This is very important for a single developer, because for a truly online SaaS, stability and weak network experience are more important than "can the AI ​​say a few more words?"

## 5. Its biggest problem now is not that the code is messy, but that the goal has exceeded the current implementation level.

I usually distinguish two types of risks for this type of project:

- Wrong idea
- The idea is right, but the implementation level cannot keep up with the goal.

`OPC-Starter` obviously belongs to the second type.

Its main problem now is not the coding style, but "the goal has grown into a platform perspective, and the implementation is still stuck at the MVP perspective."

### 1. The source of tool execution truth is not unified

This has been mentioned above and is the highest priority issue.

There are only two better ways:

- **The client executes the tool, and the server waits for the result before continuing the loop**
- **Server-side execution tool, the front-end only consumes status changes**

The current dual-track system of "the server writes the results first, and the front-end adds the side effects" will harm consistency in the long term.

### 2. The provider abstraction layer has not been established yet.

Currently `agentLoop.ts` is directly programmed into `qwen-plus + Bailian compatible OpenAI`. This is no problem for MVP, but once you want to connect to OpenAI, Claude, and Gemini, you will find that provider logic, message structure, tool capability, and stream parsing all need to be abstracted.

A better form is:

- provider adapter
-model config
-prompt policy
- tool policy
- stream translator

After layering, changing the model will become "changing the adapter" instead of "changing the entire link".

### 3. A2UI schema does not share the source of truth

The back-end tool whitelist and the front-end registry have different definitions. This is a typical protocol drift.

A better approach is to extract a shared schema:

- Component type
- props structure
- action definition
- render target
- data binding rules

In this way, the front and back ends will not have their own differences.

### 4. Business tools are too thin

Today's tools are more like "Agent demo tools" than "business operations tools."

If you want this architecture to truly have product value in the future, you should prioritize business capabilities, such as:

- Organizational inquiries
- Members read and write
- Setting page configuration reading and writing
- Storage status query
- Sync status and error recovery

Only then does it really make sense to switch to a stronger model. Otherwise, they are just "better at chatting" but not "better at doing things".

### 5. Domain residue will continue to contaminate the starter narrative

There are also some obvious traces of the `Photo Wall` history in the project. In the short term, they are just copywriting residues, but in the long term, they will continue to affect scalability because they will make:

- prompt narrative is impure
- UI copywriting is not uniform
-Irrelevant domain concepts appear when adding new functions

Once this kind of starter wants to become a real public base, the remnants of the historical field must be cleared away as soon as possible.

## 6. If I were asked to iterate the next version, how would I design it?

If I were to prioritize the next phase of evolution, I would do it along the following lines:

### First priority: unified tool execution mode

Start by choosing a single source of truth.

If the tool naturally requires browser context, such as navigation, reading the current page state, and local UI actions, then it is more recommended:

`server sends tool request -> client executes -> client sends tool result -> server continues inference`

In this way, although the link is longer, the state consistency is the best.

### Second priority: pump provider adapter

Abstract model access into configuration driver:

- `provider`
- `model`
- `baseURL`
- `apiKey`
- `supportsTools`
- `supportsJsonMode`

After this step is completed, the system truly begins to have "multi-model runtime" capabilities.

### Third priority: Sharing A2UI schema

I will extract the A2UI protocol into a separate package and consume it at the same time on the front and back ends. This way:

- New components will not miss the backend whitelist
- action schema can evolve simultaneously
- data binding can do type checking

### Fourth priority: take prompt and tool policy out of the code

System prompt is buried deep in the code. It is convenient in the short term but difficult to manage in the long term. A better way is:

- prompt configuration
- Split by role
- Version management
- Support environment differences

### Fifth priority: Upgrade from "demo tools" to "business tools"

This is the latest but most critical step. Because only when tools truly touch business capabilities, Agent Studio will not just be a beautiful built-in chat box, but will become an operation layer that can truly do things for users.

## 7. Final evaluation: The direction is right, and the skeleton has grown.

If someone asks me today whether this project is worth watching, my answer is that it is worth it, and not because it is "already finished", but because it has taken the most difficult direction in the right direction.

The most commendable thing about `OPC-Starter` is not that it has become a mature platform, but that it has put three very key propositions into the same project:

- AI friendly warehouse structure
- Extensible runtime agent
- Local-first data base for real business

Its current problems are also very clear: tool execution consistency, provider abstraction, A2UI protocol unification, and business tool surface expansion. These are not issues of overthrowing the level and starting over, but rather issues of "the skeleton is correct, now we need to strengthen the key joints."

If you are a single developer and want to quickly create a SaaS prototype with organizational management and AI assistant, this project is of great reference value.
If you are making Agent products, what is more worth looking at in this project is not the UI, but its attempt to answer a very important question:

**When Agent is no longer just a chat box, but becomes the interaction orchestration layer within the product, how should the front-end and back-end re-divide the work? **

This is also the most valuable part of `OPC-Starter` and is a good reference direction for AGUC applications.
