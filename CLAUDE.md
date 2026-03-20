# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal knowledge management repository containing:
- **home/** - Astro-powered blog (blog.jerret.me) with technical articles
- Technical documentation and tutorials (docker, node, vue, etc.)
- Code examples and demos (baiduMap, CSS demos, G6 visualizations, Web Workers, etc.)
- Design patterns implementations (JavaScript patterns)
- Book summaries and learning notes
- MCP (Model Context Protocol) examples
- TypeScript learning materials

Most content has migrated to GitHub Issues - check issues for original articles and solutions.

## Directory Structure

- `home/` - Astro blog (deployed at blog.jerret.me)
  - `src/data/blog/` - Blog posts (markdown with frontmatter)
  - `src/components/` - React/Astro components
  - `src/pages/` - Route pages
  - `src/layouts/` - Layout templates
  - `public/` - Static assets
  - Tech stack: Astro 5, Tailwind CSS 4, Shiki, Pagefind search
  - Features: Dynamic OG images, RSS feed, Sitemap
- `docs/` - Main documentation directory
  - `MCP/` - Model Context Protocol examples and documentation
  - `books/` - Book summaries and notes (ES6, software architecture, etc.)
  - `demo/` - Interactive code demos (baiduMap, CSS, G6, iframe, reactive patterns, workers)
  - `design-patterns/` - JavaScript design pattern implementations
  - `event-loop/` - Event loop related examples (promises, mutation observers, message channels)
  - `perf/` - Performance optimization examples (DNS prefetch)
  - `ts/` - TypeScript learning examples
  - `viewport/` - Viewport-related demos with HTML/CSS/JS
  - `react-native/` - React Native notes
  - `redis/` - Redis learning materials
  - `reviews/` - ES6 feature reviews and examples
- `assets/` - Static assets (performance diagrams, wechat QR code)
- `.cursor/rules/` - Cursor IDE rules for React, i18n, draw.io, and slidev

## Code Style and Standards

### EditorConfig
- 2-space indentation
- UTF-8 encoding
- LF line endings
- No trailing whitespace trimming (for Markdown files)

### ESLint
- Uses `babel-eslint` parser
- Extends `standard` style guide
- ES6+ syntax with JSX support
- Key rules:
  - Single quotes preferred
  - No semicolons (warning level)
  - Space before function parenthases: never

### Cursor Rules (when applicable)
When working with React components or internationalization:

**React Best Practices** (`.cursor/rules/react.mdc`):
- Follow Vercel React Best Practices skill (`/skill vercel-react-best-practices`)
- 57 rules across 8 categories: waterfalls, bundle size, server/client performance, re-renders, rendering, JS performance, advanced patterns
- Key priorities: Eliminate waterfalls, optimize bundles, server-side caching
- Use Astro Islands pattern for partial hydration when applicable

**i18n Guidelines** (`.cursor/rules/i18n-check.mdc`):
- Scan specified folders for tsx/jsx files requiring internationalization
- Support both Chinese and English
- Prioritize using existing copy from language packs
- Language pack locations: `src/Locales/en_US/` and `src/Locales/zh_CN/`

**Draw.io Standards** (`.cursor/rules/drawio.mdc`):
- File naming: `[module-name][chart-type]v[version][date].drawio`
- Color coding for different component types (AI/LLM, knowledge/data, services)
- Layered layout with orthogonal connections
- Version control: copy file before editing, maintain changelog

## Common Commands

### Astro Blog (home/)
```bash
cd home
npm install          # Install dependencies
npm run dev          # Start local server at http://localhost:4321
npm run build        # Build static site to home/dist
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:images  # Validate blog images
npm test             # Run Vitest tests
```

### Deployment
```bash
# Deploy demo to GitHub Pages
./deploy.sh
# This runs: git subtree push --prefix demo origin gh-pages
```

### MCP Example (docs/MCP/examples/business-publish/)
```bash
cd docs/MCP/examples/business-publish
npm install
npm run build    # Clean and compile TypeScript
npm start        # Run the MCP server
npm run start:client  # Run the MCP client
npm test         # Run tests
```

### TypeScript Learning (docs/ts/)
```bash
cd docs/ts
npm install      # Install @types/node
# No build scripts - files are for reference/learning
```

## Content Management

### Adding New Content
- Documentation goes in `docs/` with appropriate subdirectory
- Code demos should be self-contained with HTML/CSS/JS
- Use existing directory structure when possible
- For articles, consider creating GitHub Issues instead of markdown files

### Draw.io Diagrams
When creating or modifying diagrams:
1. Copy the original file with version suffix: `cp file.drawio file_v1.1_20250126.drawio`
2. Make changes to the copy
3. Update the main file after verification
4. Record changes in CHANGELOG.md

## Important Notes

- This is primarily a documentation/knowledge repo, not an active development project
- Most build/test commands are only relevant to specific subdirectories (MCP examples, TypeScript demos)
- Closed GitHub Issues typically contain problem-solving approaches
- Content syncs to 语雀博客 and Jerret Life WeChat official account
- Licensed under CC BY-NC-SA 3.0 CN (original content by jiangtao)

## Development Workflow

### Git Commit Workflow (MANDATORY)

All code changes MUST follow `/dev:commit` workflow:

```bash
# Step 1: Create branch with descriptive name
git checkout -b feat/add-feature
git checkout -b fix/error-handling
git checkout -b refactor/cleanup-code
git checkout -b docs/update-readme
git checkout -b test/add-unit-tests

# Branch types: feat, fix, refactor, docs, test, chore
# Summary template: <type>: <what changed> → <outcome/benefit>
```

**Use `/dev:commit` skill for the complete 5-step process:**
1. Create PR with structured summary
2. Define test cases BEFORE running tests
3. Run tests and generate report
4. User review checklist
5. Merge after approval

### Delivery Workflow Precedence

`/dev:commit` overrides any generic autonomous commit or push behavior from broader execution skills.

This means:
- Do not direct-push to `main` or `master` just because implementation and verification are complete
- If a plan says "commit", "push", "merge", or "deliver", still route delivery through `/dev:commit`
- Auto-execution skills such as brainstorming, plan execution, or worktree delivery may implement and verify changes, but they must hand off to the repo's delivery workflow before merge or direct push
- If work is developed in a worktree or temporary branch, keep the implementation there and use `/dev:commit` to prepare branch, summary, test plan, test report, and review artifacts
- Only bypass `/dev:commit` when the user explicitly says to bypass the repo's commit workflow

### Image Linting

Before committing changes to blog posts or images:

```bash
cd home && npm run lint:images
```

This validates:
- Duplicate `</svg>` closing tags
- Watermark presence ("Jerret's Blog")
- Malformed attributes (missing `>` in attributes)
- xmllint validation (if available)

## Rules

1. **File Deletion**: DO NOT delete files without asking first
2. **Testing**: All new changes MUST be tested before committing
3. **Commit Workflow**: All commits MUST follow `/dev:commit` workflow (5 steps)
4. **No Direct Push Shortcut**: Do not push directly to `main`/`master` unless the user explicitly instructs you to bypass `/dev:commit`
5. **Execution Skills Must Defer To Delivery Rules**: Auto-execution or planning skills may implement and verify autonomously, but repo-local delivery workflow still governs commit, push, merge, and PR preparation
