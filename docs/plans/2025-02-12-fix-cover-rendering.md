# [封面渲染调试] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 调试并修复版本锁封面图片在生产环境下的渲染错误问题

**Architecture:** 使用调试步骤定位问题，然后根据诊断结果选择修复方案并提交

---

## Task 1: 诊断 HTTP 响应

**Files:**
- 命令行工具：curl

**Step 1.1: 检查 Content-Type**
```bash
curl -I https://blog.jerret.me/images/blog-covers/version-lock-cover.svg | grep -i content-type
```

**Step 1.2: 验证 SVG 是否可访问**
```bash
curl -s -o /dev/null https://blog.jerret.me/images/blog-covers/version-lock-cover.svg | head -5
```

**Expected Output:** Content-Type: image/svg+xml

---

## Task 2: 验证 SVG 语法

**Files:**
- 在线验证工具

**Step 2.1: 使用 W3C 验证器**
```bash
# 访问 https://validator.w3.org/
# 上传文件或粘贴 SVG 内容
```

**Step 2.2: 对比其他正常工作的封面**
```bash
# 检查 compiler-in-fe-cover.svg 与 version-lock-cover.svg 的结构差异
```

---

## Task 3: 创建诊断测试文件

**Files:**
- 创建：`home/public/images/blog-covers/test-minimal.svg`

**Step 3.1: 创建最小化测试 SVG**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#f8f9fa"/>
  <text x="50" y="55" text-anchor="middle" font-size="10" fill="#000000">Test</text>
</svg>
```

**Step 3.2: 部署并验证测试文件**
- URL: https://blog.jerret.me/images/blog-covers/test-minimal.svg
- 检查是否能正常渲染

---

## Task 4: 修复方案选择

**根据诊断结果选择：**

**方案 A: 简化水印文本**
- 移除可能引起问题的特殊字符
- 使用 ASCII 字符代替 Unicode

**方案 B: 修改字体声明**
- 将 Segoe UI 改为系统默认字体

**方案 C: 移除水印**
- 如果水印导致问题，暂时移除水印测试

**方案 D: 检查服务器配置**
- 如果是 Vercel 配置问题，需要修改响应头

---

## Task 5: 实施修复

**Files:**
- 修改：`home/src/images/blog-covers/version-lock-cover.svg`

**Step 5.1: 应用选定的修复方案**
- 根据任务 4 的诊断结果选择修复方案

**Step 5.2: 验证修复效果**
- 本地测试修改后的 SVG
- 部署后验证线上效果

---

## Task 6: 提交代码

**Branch:** `fix/cover-rendering-issue`

**Step 6.1: 按照 dev:commit 规范提交**
```bash
git checkout -b fix/cover-rendering-issue
git add home/src/images/blog-covers/version-lock-cover.svg
git commit -m "fix: correct SVG rendering issue for version-lock cover

- 简化/修改水印文本，避免渲染错误
- 验证 Content-Type: image/svg+xml

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 6.2: 推送到远程**
```bash
git push origin fix/cover-rendering-issue
```

**Step 6.3: 创建 Pull Request**
```bash
gh pr create --title "fix: correct SVG rendering issue" --body docs/plans/2025-02-12-fix-cover-rendering.md
```

---

## Task 7: 合并到主分支

**Step 7.1: 合并 PR 到 master**
```bash
git checkout master
git merge fix/cover-rendering-issue
git push origin master
```

---

## Execution顺序

1. 创建调试分支
2. 运行诊断任务（HTTP 检查、SVG 验证、对比分析）
3. 创建测试文件并部署
4. 根据诊断结果选择修复方案
5. 实施修复
6. 提交代码并创建 PR
7. 合并到主分支

---

## Remember

- 遵循 dev:commit 规范：结构化提交信息、清晰的变更描述
- 每个任务都是独立的、可验证的
- 提交前必须确保修改已测试通过
- 使用 Co-Authored-By 签名
