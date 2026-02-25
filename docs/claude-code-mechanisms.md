# Claude Code 机制详解

> **创建时间:** 2025-02-25
> **适用版本:** Claude Code CLI
> **文档目的:** 全面理解 Claude Code 的会话、消息、Skill、MCP、Agent、Team、Memory 等机制

---

## 目录

1. [会话机制](#1-会话机制)
2. [消息传递](#2-消息传递)
3. [Skill 系统](#3-skill-系统)
4. [MCP 集成](#4-mcp-集成)
5. [Agent 通信](#5-agent-通信)
6. [Agent Team](#6-agent-team)
7. [Memory 系统](#7-memory-系统)
8. [Hooks 系统](#8-hooks-系统)
9. [通信架构图](#9-通信架构图)

---

## 1. 会话机制

### 1.1 会话生命周期

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code 会话                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  启动 → 初始化 → 对话循环 → Compact/结束 → 清理               │
│   │       │         │           │          │                │
│   │       │         │           │          │                │
│   ▼       ▼         ▼           ▼          ▼                │
│ Session  加载    API调用    Context    释放资源                ││
│  ID    配置    交互       管理        (history)               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 会话存储位置

```bash
~/.claude/
├── history.jsonl              # 全局会话历史
├── session-env/               # 会话环境变量
│   └── <session-id>/         # 单个会话的环境
├── projects/                  # 项目级存储
│   └── <project-path>/
│       └── memory/           # 项目记忆
└── teams/                     # Agent Team
    └── <team-name>/
        ├── config.json
        ├── inboxes/
        └── handoffs/
```

### 1.3 history.jsonl 格式

```json
{
  "type": "message",
  "timestamp": 1763571863127,
  "message": {
    "role": "user",
    "content": "用户消息内容"
  }
}
```

**特点：**
- JSON Lines 格式（每行一个 JSON）
- 追加写入，不修改历史
- 包含所有会话的完整记录
- `/Compact` 会清理此文件

### 1.4 Session 环境

```
~/.claude/session-env/<session-id>/
├── CLAUDE_PROJECT_DIR        # 当前项目目录
├── CWD                       # 工作目录
├── GIT_BRANCH               # Git 分支
└── ...其他环境变量
```

---

## 2. 消息传递

### 2.1 消息流向

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code 消息流                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  用户输入                                                    │
│     │                                                         │
│     ▼                                                         │
│  ┌─────────────┐                                             │
│  │ 当前 Session │                                           │
│  └──────┬──────┘                                             │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ API 调用    │────▶│ Anthropic   │                        │
│  └─────────────┘     │   API       │                        │
│         │            └─────────────┘                        │
│         │                     │                             │
│         ▼                     ▼                             │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ Tool Use    │────▶│ 子进程/外部  │                        │
│  │ (Bash/等)   │     │   工具       │                        │
│  └─────────────┘     └─────────────┘                        │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐                                             │
│  │ 记录到      │                                             │
│  │history.jsonl│                                             │
│  └─────────────┘                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Agent Team 内部消息流

```
┌─────────────────────────────────────────────────────────────┐
│                 Agent Team 消息传递                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Team Lead ──1. SendMessage──▶ Agent A                      │
│       │                                                   │    │
│       │                                              ┌─────┴─────┐│
│       │                                              │  Inbox A  ││
│       ▼                                              └───────────┘│
│  ┌─────────────┐                                                      │
│  │ Hook 触发   │ ◀── PostToolUse Event                        │
│  └──────┬──────┘                                                      │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────┐     ┌──────────────┐                            │
│  │auto-handoff │────▶│ Handoff File  │                            │
│  │   脚本      │     │ (状态持久化)  │                            │
│  └─────────────┘     └──────────────┘                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Inbox 消息格式

```json
[
  {
    "from": "team-lead",
    "text": "请执行任务 A",
    "timestamp": "2025-02-24T12:00:00Z",
    "read": false,
    "color": "blue"
  },
  {
    "from": "agent-a",
    "text": "任务 A 已完成",
    "timestamp": "2025-02-24T12:05:00Z",
    "read": true
  }
]
```

---

## 3. Skill 系统

### 3.1 Skill 层级

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill 三级架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Level 1: 全局 Skills (~/.claude/skills/)                    │
│  ├── brainstorming                                           │
│  ├── handoff                                                 │
│  ├── writing-plans                                           │
│  └── ...                                                    │
│                                                               │
│  Level 2: 项目 Skills (项目/.skills/)                         │
│  ├── blog-cover-gen    ← Blog 项目专属                       │
│  ├── dev-commit       ← Blog 项目专属                       │
│  └── drawio-diagram   ← Blog 项目专属                       │
│                                                               │
│  Level 3: Plugin Skills (~/.claude/plugins/)                  │
│  ├── superpowers/                                             │
│  │   ├── subagent-driven-development                         │
│  │   ├── systematic-debugging                                │
│  │   └── ...                                                │
│  └── claude-plugins-official/                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Skill 触发机制

```
用户输入 → Skill 匹配 → Skill 加载 → 执行 → 返回结果
    │           │             │          │        │
    │           │             │          │        ▼
    │           ▼             ▼          ▼    更新 Context
    │    ┌─────────┐    ┌──────────┐ ┌─────────┐
    │    │ 名称匹配 │    │ 优先级  │ │ 执行函数 │
    │    │ /命令名  │    │  项目级  │ │  生成代码 │
    │    └─────────┘    │ > 全局  │ └─────────┘
    │                   └──────────┘
    ▼
触发 Skill
```

### 3.3 Skill 文件结构

**项目级 Skill 示例：** `.skills/blog-cover-gen.md`

```markdown
---
name: blog-cover-gen
description: 为博客文章生成 SVG 封面图
---

# Blog Cover Generator

## 使用方法

使用 blog-cover-gen 为文章生成封面图

参数：
- 文章路径 (必需)
- 风格选择 (可选)

## 工作流程
...
```

### 3.4 Skill 优先级

```
1. 项目 Skills (最高优先级)
   ↓ (未找到)
2. 全局 Skills (中等优先级)
   ↓ (未找到)
3. Plugin Skills (默认优先级)
```

---

## 4. MCP 集成

### 4.1 MCP (Model Context Protocol)

**MCP 是什么？**

MCP (Model Context Protocol) 是 Claude Code 用于与外部工具和服务通信的协议。

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP 通信架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Claude Code ──┬── MCP Server 1 ──► Figma API               │
│               │                                              │
│               ├── MCP Server 2 ──► Drawio                   │
│               │                                              │
│               └── MCP Server N ──► 自定义服务                │
│                                                               │
│  配置: ~/.claude/mcp.json                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 MCP 配置示例

**`~/.claude/mcp.json`:**

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_API_KEY": "your-api-key"
      }
    },
    "drawio": {
      "command": "npx",
      "args": ["-y", "@next-ai-drawio/mcp-server@latest"]
    }
  }
}
```

### 4.3 MCP 通信流程

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP 请求响应流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Claude Code 发送请求                                     │
│     {                                                        │
│       "method": "tools/call",                               │
│       "params": {                                          │
│         "name": "figma_get_file",                           │
│         "arguments": {"file_key": "..."}                    │
│       }                                                     │
│     }                                                        │
│          │                                                   │
│          ▼                                                   │
│  2. MCP Server 处理                                          │
│     ├── 认证                                                 │
│     ├── 调用外部 API (Figma/Drawio/etc)                      │
│     └── 格式化返回                                            │
│          │                                                   │
│          ▼                                                   │
│  3. 返回结果到 Claude Code                                    │
│     {                                                        │
│       "result": {                                           │
│         "content": [                                       │
│           {"type": "text", "text": "..."}                   │
│         ]                                                  │
│       }                                                     │
│     }                                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Agent 通信

### 5.1 Agent 类型

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Agents                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  类型 1: Subagent (临时派发)                                  │
│  ├── 通过 Task tool 派发                                     │
│  ├── 独立上下文，无状态                                       │
│  └── 完成后返回结果                                           │
│                                                               │
│  类型 2: Team Agent (持久化)                                  │
│  ├── 通过 TeamCreate 创建                                    │
│  ├── 有独立的 inbox 和状态                                    │
│  └── 可以互相通信                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Subagent 通信

```
┌─────────────────────────────────────────────────────────────┐
│                 Subagent 派发与通信                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  主 Agent ──Task tool──▶ Subagent A                           │
│     │                                                           │
│     ├── 提供完整上下文                                         │
│     ├── 指定任务范围                                           │
│     └── 等待返回结果                                           │
│          │                                                      │
│          ▼                                                      │
│     ┌─────────────┐                                           │
│     │ Subagent A  │                                           │
│     │ 独立执行     │                                           │
│     │ (无状态)    │                                           │
│     └─────────────┘                                           │
│          │                                                      │
│          ▼                                                      │
│     返回结果                                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**示例：派发 Subagent**

```markdown
# 使用 Task tool 派发
Task "分析这个 React 组件的性能问题" {
  - 检查不必要的重渲染
  - 建议优化方案
  - 返回详细报告
}

# Subagent 执行...
# Subagent: "我发现了 3 个性能问题..."
```

### 5.3 Team Agent 通信

```
┌─────────────────────────────────────────────────────────────┐
│                Team Agent 通信机制                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐                                                │
│  │Team Lead │                                                │
│  └─────┬────┘                                                │
│        │                                                       │
│        ├── SendMessage ──▶ ┌─────────────┐                   │
│        │                      │ Agent A     │                   │
│        │                      └──────┬──────┘                   │
│        │                             │                         │
│        │                             │ Receive + Process   │
│        │                             │                         │
│        │                             ▼                         │
│        │                      ┌─────────────┐                   │
│        │                      │ Agent A     │                   │
│        │                      │ Inbox       │                   │
│        │                      └──────┬──────┘                   │
│        │                             │                         │
│        │                             │ SendMessage ──▶ Agent B│
│        │                             │                         │
│        │           ◀─────────────────                         │
│        │                                                       │
│  消息持久化在 ~/.claude/teams/<team>/inboxes/                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Agent Team

### 6.1 Team 架构

```
~/.claude/teams/<team-name>/
├── config.json              # Team 配置
├── inboxes/                 # Agent 消息存储
│   ├── agent-a.json        # Agent A 的 inbox
│   └── agent-b.json        # Agent B 的 inbox
└── handoffs/               # 状态持久化 (我们的实现)
    ├── agent-a.json
    └── agent-b.json
```

### 6.2 Team 配置示例

```json
{
  "name": "blog-team",
  "description": "博客生产团队",
  "createdAt": 1763571863127,
  "leadAgentId": "team-lead@blog-team",
  "members": [
    {
      "agentId": "team-lead@blog-team",
      "name": "team-lead",
      "agentType": "general-purpose",
      "model": "glm-4.7",
      "cwd": "/Users/jt/places/personal/blog"
    },
    {
      "agentId": "writer@blog-team",
      "name": "writer",
      "agentType": "general-purpose",
      "model": "sonnet"
    }
  ]
}
```

### 6.3 Team 工作流

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Team 工作流                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Team 创建                                                 │
│     TeamCreate("blog-team", "Blog 生产团队")                  │
│          │                                                   │
│          ▼                                                   │
│  2. Agent 激活                                               │
│     ├── Team Lead (协调者)                                    │
│     ├── Writer (内容创作)                                     │
│     └── Reviewer (审核)                                       │
│          │                                                   │
│          ▼                                                   │
│  3. 任务分配                                                 │
│     Lead ──SendMessage──▶ Writer: "写一篇关于 X 的文章"       │
│          │                                                   │
│          ▼                                                   │
│  4. Agent 执行                                               │
│     Writer 收到消息 → 执行任务 → SendMessage → Lead: "完成"    │
│          │                                                   │
│          ▼                                                   │
│  5. 状态同步                                                 │
│     所有 Agent 状态记录在 config.json                         │
│     消息记录在 inboxes/                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Team 消息累积问题

**问题：**

```
Agent A ──发送消息──▶ Agent B
  │                     │
  │                     ▼
  │              存入 inbox
  │                     │
  │                 消息累积
  │                     │
  ▼                     ▼
Context Low        Context Low
  │                     │
  └─────────┬───────────┘
          ▼
    需要手动 /Compact
          │
          ▼
     Team 被中断 ❌
```

**我们的解决方案：**

```
Agent A ──发送消息──▶ Agent B
  │                     │
  │                     ▼
  │              存入 inbox
  │                     │
  │               PostToolUse Hook 触发
  │                     │
  ▼                     ▼
检查 inbox > 50?    消息累积
  │                     │
  Yes                   │
  │                     ▼
  ▼              ┌─────────────┐
生成 handoff       │ auto-handoff│
  │              └──────┬──────┘
  │                     │
  ▼                     ▼
清理到 10 条      Team 继续运行 ✅
```

---

## 7. Memory 系统

### 7.1 Memory 层级

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Memory                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Level 1: 会话历史 (全局)                                    │
│  ├── ~/.claude/history.jsonl                                │
│  └── 所有会话的完整记录                                       │
│                                                               │
│  Level 2: 项目记忆 (项目级)                                  │
│  ├── ~/.claude/projects/<project>/memory/                    │
│  └── 项目相关的持久化信息                                     │
│                                                               │
│  Level 3: Handoff (状态迁移)                                  │
│  ├── ~/.claude/handoffs/                                     │
│  └── 跨会话的状态传递                                         │
│                                                               │
│  Level 4: Team Handoff (Team 级)                             │
│  ├── ~/.claude/teams/<team>/handoffs/                        │
│  └── Agent 的状态快照                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Handoff 机制

**使用 handoff skill：**

```
会话 A                                      会话 B
  │                                            ▲
  │  ┌──────────────────┐                    │
  └─▶│ /handoff:save     │                    │
     │ --name feature-x  │                    │
     └────────┬─────────┘                    │
              │                               │
              ▼                               │
        docs/handoffs/                        │
        feature-x-v1.md                       │
              │                               │
              │     ┌──────────────────┐     │
              └────▶│ /handoff:continue │─────┘
                     │ --name feature-x │
                     └──────────────────┘
```

**Handoff 文档结构：**

```markdown
# Feature X Handoff - v1

## 1. Context Overview
### Project Background
- Repository: blog
- Branch: feature/draw-skill-fix

### Key Objectives
1. 实现 draw skill 修复
2. 优化上下文管理

## 2. Current Status
### Completed
- [x] 调研问题根因
- [x] 设计解决方案

### In Progress
- [ ] 实现代码
  - 文件: src/skills/draw-skill-fix.md

## 3. Key Decisions & Rationale
### Decision 1: 使用 Hook 驱动
- **Choice:** PostToolUse Hook
- **Why:** 自动触发，不中断 Team
```

### 7.3 Team Handoff (我们实现的)

**与普通 Handoff 的区别：**

| 特性 | 普通 Handoff | Team Handoff |
|------|--------------|--------------|
| 触发方式 | 手动调用命令 | Hook 自动触发 |
| 存储位置 | `docs/handoffs/` | `teams/<team>/handoffs/` |
| 格式 | Markdown | JSON |
| 目的 | 跨会话传递 | Agent 状态快照 |

**Team Handoff JSON 结构：**

```json
{
  "agentId": "writer",
  "lastHandoffAt": "2025-02-24T12:00:00Z",
  "inboxCursor": 60,
  "latestMessages": [
    // 保留的最新消息
  ],
  "contextSnapshot": {
    "note": "Auto-generated handoff due to inbox size limit",
    "lastMessage": "最后一条消息内容",
    "messagesKept": 10
  },
  "metadata": {
    "generatedBy": "team-context-manager",
    "version": "1.0.0"
  }
}
```

---

## 8. Hooks 系统

### 8.1 Hook 事件类型

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Hooks                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SessionStart: 启动、恢复、清理、compact 后                    │
│  ├── matcher: "startup|resume|clear|compact"                 │
│  └── 用途: 初始化环境、恢复状态                                │
│                                                               │
│  PreToolUse: 工具调用前                                       │
│  ├── matcher: "Bash" / "Read" / ...                         │
│  └── 用途: 参数验证、权限检查                                  │
│                                                               │
│  PostToolUse: 工具调用后 (我们使用的)                          │
│  ├── matcher: "SendMessage"                                 │
│  └── 用途: 自动清理、状态保存                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Hook 配置

**`~/.claude/hooks/hooks.json`:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "SendMessage",
        "hooks": [
          {
            "type": "command",
            "command": "\"${HOME}/.claude/skills/team-context-manager/auto-handoff.sh\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### 8.3 Hook 执行流程

```
SendMessage 调用
      │
      ▼
检查 Hook 配置
      │
      ▼
执行 Hook 脚本 (异步)
      │
      ├─▶ 检查 inbox 大小
      ├─▶ 超过阈值？
      ├─▶ Yes → 生成 handoff
      ├─▶ 清理 inbox
      └─▶ 记录日志
      │
      ▼
继续 Agent 执行 (不等待 Hook 完成)
```

---

## 9. 通信架构图

### 9.1 完整通信架构

```
┌─────────────────────────────────────────────────────────────┐
│                 Claude Code 完整通信架构                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  用户界面层                          │    │
│  │  (CLI / IDE Plugin)                                  │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                          │
│                     ▼                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                Claude Code 核心                       │    │
│  │  ┌───────────────┐  ┌───────────────┐                │    │
│  │  │  Session 管理  │  │   Skill 系统   │                │    │
│  │  └───────┬───────┘  └───────┬───────┘                │    │
│  │          │                  │                          │    │
│  │          ▼                  ▼                          │    │
│  │  ┌───────────────┐  ┌───────────────┐                │    │
│  │  │  消息处理      │  │  Hook 系统     │                │    │
│  │  └───────┬───────┘  └───────┬───────┘                │    │
│  └──────────┼──────────────────┼──────────────────────────┘    │
│             │                  │                              │
│    ┌────────┴────────┐   ┌────┴────────┐                   │
│    ▼                 ▼   ▼             ▼                       │
│  ┌─────────┐    ┌──────────┐  ┌──────────────┐           │
│  │Anthropic│    │  Subagent│  │  Agent Team  │           │
│  │   API   │    │   (Task) │  │  (持久化)    │           │
│  └────┬────┘    └────┬─────┘  └──────┬───────┘           │
│       │              │              │                        │
│       ▼              ▼              ▼                        │
│  ┌─────────┐    ┌──────────┐  ┌──────────────────┐       │
│  │Tools/   │    │独立上下文│  │  Inbox 通信     │       │
│  │MCP Server│   │无状态    │  │  消息持久化     │       │
│  └─────────┘    └──────────┘  └──────────────────┘       │
│       │              │              │                        │
│       ▼              ▼              ▼                        │
│  ┌─────────────────────────────────────────────┐          │
│  │           持久化存储                        │          │
│  │  ├── history.jsonl    (会话历史)           │          │
│  │  ├── projects/         (项目记忆)           │          │
│  │  ├── teams/            (Team 状态)           │          │
│  │  └── handoffs/         (状态迁移)           │          │
│  └─────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 数据流详解

```
┌─────────────────────────────────────────────────────────────┐
│                     数据流向详解                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. 用户 → Claude Code                                       │
│     输入命令/代码                                              │
│          │                                                  │
│          ▼                                                  │
│  2. Claude Code → Anthropic API                              │
│     发送消息 (含上下文)                                       │
│          │                                                  │
│          ▼                                                  │
│  3. API → Tools/MCP (如需要)                                  │
│     调用外部工具                                              │
│          │                                                  │
│          ▼                                                  │
│  4. Tools → Claude Code                                       │
│     返回结果                                                  │
│          │                                                  │
│          ▼                                                  │
│  5. Claude Code → history.jsonl                               │
│     记录完整对话                                              │
│          │                                                  │
│          ▼                                                  │
│  6. Hook 触发 (如 SendMessage)                                 │
│     └─> auto-handoff.sh                                      │
│          │                                                  │
│          ▼                                                  │
│  7. 更新 Team 状态                                           │
│     └─> teams/<team>/inboxes/                                │
│     └─> teams/<team>/handoffs/                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 实用技巧

### 10.1 查看 Agent Team 状态

```bash
# 查看所有 Team
~/.claude/skills/team-context-manager/metrics.sh

# 查看特定 Team
CLAUDE_TEAM_NAME=my-team bash -c '
  for inbox in ~/.claude/teams/$CLAUDE_TEAM_NAME/inboxes/*.json; do
    agent=$(basename "$inbox" .json)
    count=$(jq length "$inbox")
    echo "$agent: $count messages"
  done
'
```

### 10.2 手动触发 Handoff

```bash
# 单个 Agent
CLAUDE_TEAM_NAME=my-team CLAUDE_AGENT_NAME=agent-a \
  ~/.claude/skills/team-context-manager/auto-handoff.sh

# 整个 Team
CLAUDE_TEAM_NAME=my-team \
  ~/.claude/skills/team-context-manager/auto-handoff.sh
```

### 10.3 查看会话历史

```bash
# 最近的对话
tail -20 ~/.claude/history.jsonl | jq -r '.message.content // empty'

# 统计消息数
wc -l ~/.claude/history.jsonl
```

### 10.4 禁用/启用 Hook

```bash
# 禁用
mv ~/.claude/hooks/hooks.json ~/.claude/hooks/hooks.json.disabled

# 启用
mv ~/.claude/hooks/hooks.json.disabled ~/.claude/hooks/hooks.json
```

---

## 11. 常见问题

### Q1: Agent Team 消息会无限累积吗？

**A:** 不会。有了 Team Context Manager 后：
- 超过 50 条消息自动清理
- 保留最新 10 条 + 所有未读消息
- 状态保存在 handoff 文件中

### Q2: Compact 会删除哪些数据？

**A:** `/Compact` 会清理：
- `history.jsonl` 的旧内容
- 当前会话的对话历史
- 但**不会**删除：
  - Team handoffs (在 `teams/<team>/handoffs/`)
  - 项目 memory (在 `projects/<project>/memory/`)
  - 普通 handoffs (在 `docs/handoffs/`)

### Q3: 如何在项目中使用自定义 Skill？

**A:** 在项目根目录创建 `.skills/` 目录，添加 `.md` 文件：

```markdown
---
name: my-skill
description: 我的自定义技能
---

# My Skill

使用方法...
```

### Q4: MCP 和 Skill 有什么区别？

| 特性 | MCP | Skill |
|------|-----|-------|
| 用途 | 与外部服务通信 | 封装工作流程 |
| 语言 | 任意 (通过 npx) | Markdown |
| 配置位置 | `~/.claude/mcp.json` | `~/.claude/skills/` 或 `.skills/` |
| 执行方式 | 自动启动服务 | 手动调用 |

---

## 12. 总结

```
┌─────────────────────────────────────────────────────────────┐
│                  Claude Code 机制总结                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  层级           组件                    作用                 │
│  ─────────────────────────────────────────────────────      │
│  会话层         history.jsonl         全局历史记录           │
│                 session-env            环境变量               │
│                                                               │
│  消息层         SendMessage           Agent Team 通信        │
│                 inboxes/              消息持久化             │
│                                                               │
│  技能层         Skills                工作流封装             │
│                 (全局/项目/plugin)                          │
│                                                               │
│  扩展层         MCP                   外部服务集成           │
│                 Hooks                事件驱动               │
│                                                               │
│  Agent 层       Subagent              临时任务派发           │
│                 Agent Team            持久化协作             │
│                                                               │
│  记忆层         handoffs              跨会话状态传递         │
│                 team handoffs         Agent 状态快照         │
│                 project memory         项目级记忆            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 文件位置速查

| 文件/目录 | 位置 | 用途 |
|----------|------|------|
| `history.jsonl` | `~/.claude/` | 全局会话历史 |
| `settings.json` | `~/.claude/` | Claude Code 配置 |
| `mcp.json` | `~/.claude/` | MCP 服务器配置 |
| `hooks.json` | `~/.claude/hooks/` | Hook 配置 |
| `<skill>.md` | `~/.claude/skills/` | 全局 Skills |
| `<skill>.md` | `.skills/` | 项目 Skills |
| `config.json` | `~/.claude/teams/<team>/` | Team 配置 |
| `inbox.json` | `~/.claude/teams/<team>/inboxes/` | Agent 消息 |
| `handoff.json` | `~/.claude/teams/<team>/handoffs/` | Team Handoff |

### B. 相关文档

- [Team Context Manager 设计文档](~/.claude/docs/plans/2025-02-24-team-context-manager-design.md)
- [handoff skill 使用指南](~/.claude/plugins/cache/superpowers-marketplace/superpowers/4.0.3/skills/handoff/skill.md)
- [subagent-driven-development](~/.claude/plugins/cache/superpowers-marketplace/superpowers/4.3.1/skills/subagent-driven-development/SKILL.md)

---

**文档版本:** 1.0
**最后更新:** 2025-02-25
**维护者:** Jerret
