# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal knowledge management repository containing:
- Technical documentation and tutorials (docker, node, vue, etc.)
- Code examples and demos (baiduMap, CSS demos, G6 visualizations, Web Workers, etc.)
- Design patterns implementations (JavaScript patterns)
- Book summaries and learning notes
- MCP (Model Context Protocol) examples
- TypeScript learning materials

Most content has migrated to GitHub Issues - check issues for original articles and solutions.

## Directory Structure

- `home/` - Hexo blog (deployed to Vercel at jiangtao.vercel.app)
  - `source/_posts/` - Blog posts
  - `themes/next/` - Next theme
  - `_config.yml` - Hexo configuration
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
- Use React 18 with hooks for logic reuse
- Keep components focused and performant
- Use `memo` for pure components
- Observe business components that use Store

**i18n Guidelines** (`.cursor/rules/i18n-check.mdc`):
- Scan specified folders for tsx/jsx files requiring internationalization
- Support both Chinese and English
- Prioritize using existing copy from language packs
- Language pack locations: `src/Locales/en_US/KDS.json` and `src/Locales/zh_CN/KDS.json`

**Draw.io Standards** (`.cursor/rules/drawio.mdc`):
- File naming: `[module-name][chart-type]v[version][date].drawio`
- Color coding for different component types (AI/LLM, knowledge/data, services)
- Layered layout with orthogonal connections
- Version control: copy file before editing, maintain changelog

## Common Commands

### Hexo Blog (home/)
```bash
cd home
npm install          # Install dependencies
npm run dev          # Start local server at http://localhost:4000
npm run build        # Generate static site to home/public
npm run clean        # Clean generated files
hexo new "title"     # Create new post
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

## Rules

1. 务必遵守： 禁止删除文件，若要删除的话 请询问
2. 务必遵守：新增的变更，务必走测试，测试验证完成之后，拉分支创建提交
