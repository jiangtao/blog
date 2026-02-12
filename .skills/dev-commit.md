# /dev:commit

> **强制遵循 5 步提交流程（MANDATORY）**
>
> 所有代码变更必须遵循此工作流，确保质量和可追溯性。

## 使用方法

在包含此 skill 的项目中，执行：
```bash
/dev:commit
```

## 工作流程

### Step 1: 创建分支

```bash
# 创建新分支，命名规范：<type>/<short-description>
git checkout -b feat/feature-name
git checkout -b fix/bug-description
git checkout -b refactor/cleanup-code
git checkout -b docs/update-readme
git checkout -b test/add-unit-tests
```

**分支命名规范：**
- `feat/` - 新功能
- `fix/` - Bug 修复
- `refactor/` - 代码重构（无行为变更）
- `docs/` - 文档更新
- `test/` - 测试相关
- `chore/` - 构建/配置变更

### Step 2: 创建 PR

**命令：**
```bash
git push -u origin feat/feature-name
gh pr create --title "feat/feature-name: 变更摘要" --body "## 摘要

## Changes

- [ ] File path - Description of change

## Type
- [ ] feat - 新功能
- [ ] fix - Bug fix
- [ ] refactor - Code restructuring (no behavior change)
- [ ] docs - Documentation only
- [ ] test - Tests only
- [ ] chore - Build/config changes

## Related Issue
Closes #(issue number) or Relates to #(issue number)

---

## 详细说明

### 1. **新增功能**
- 实现结构化 5 步 Git commit 工作流
- 强制 Code Review 和质量检查

### 2. **技术栈**
- Bash + Git + GitHub CLI (gh)
- 基于 Conventional Commits 规范验证

### 3. **使用方式**
```bash
# 1. 创建分支并切换
/dev:commit

# 2. 创建 PR（自动生成变更摘要）
# 3. 定义测试计划
# 4. 运行测试和验证
# 5. 用户审核
```

### Step 3: 定义测试

**测试清单：**
- [ ] 代码变更符合分支命名规范
- [ ] Commit messages 遵循 Conventional Commits 规范
- [ ] 无引入新的依赖
- [ ] 所有现有测试通过
- [ ] 代码符合项目风格指南
- [ ] 无明显性能下降
- [ ] 文档更新完整（如有需要）

### Step 4: 运行测试

**命令：**
```bash
npm test                              # 运行单元测试
npm run build                           # 运行构建（如适用）
npm run lint:images                  # 图片检查
```

### Step 5: 用户审核

**审核清单：**
- [ ] 代码变更与摘要一致
- [ ] 所有测试通过
- [ ] 无意外副作用
- [ ] 代码符合项目风格指南
- [ ] 文档更新完整（如有需要）
- [ ] 边界情况已考虑

**完成标准：**
只有当以下条件全部满足时，才可合并：
- [ ] 所有测试通过
- [ ] 代码审查通过
- [ ] 用户审核确认

## 示例

### 新功能提交
```bash
# 示例：添加博客文章
/dev:commit
```

## 核心功能

### 1. Conventional Commits 验证
- 自动检查 commit message 格式
- 支持 GitHub Actions 触发
- 支持 PR 评论反馈

### 2. 分支管理
- 自动创建符合规范的分支名
- 防止直接在 main 操作

### 3. 测试集成
- 运行测试脚本
- 生成测试报告

### 4. PR 工作流
- 自动生成变更摘要
- 链接相关 issue

### 5. 质量保障
- 多级检查机制
- 强制 Code Review

## 相关文件

- `.github/workflows/commit-check.yml` - GitHub Actions 配置
- `bin/commit-check.sh` - 可选的本地检查脚本

## 技术参考

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions: commit check](https://github.com/marketplace/actions/conventional-commit-in-pull-requests)
