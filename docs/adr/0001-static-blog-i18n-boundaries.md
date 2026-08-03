# ADR 0001：静态博客国际化的系统文案与文章内容边界

- 状态：已接受
- 日期：2026-08-03

## 背景

当前站点将语言配置、系统文案、路径处理和文章翻译关联集中在一个模块中。随着英语、繁体中文及后续语言加入，系统文本和文章正文会以不同频率变化；将它们放在同一结构中会造成类型、校验和发布流程的耦合。

## 决策

1. 系统文案以每语言一个强类型语言包维护，并由语言包索引提供翻译函数。语言配置仅维护 Locale 元数据、路径策略与发布策略，不保存界面字符串。
2. 文章采用“每个语言版本一个 Markdown 文件”的静态内容模型。默认中文文章保留既有根目录与 URL；非默认语言文章置于以 Locale 命名的内容目录。
3. 文章语言版本使用稳定内容标识关联：默认中文的文章 ID 是默认内容标识，非默认版本以 `translationKey` 显式引用它。禁止通过硬编码语言前缀推导标识。
4. 发布前校验以发布必需语言配置为准，逐语言报告缺失、过期、孤立和重复翻译；构建本身不因历史翻译缺失而失败。
5. 文章翻译由 AI skill 在人工调用时写入内容目录。构建或发布脚本只负责确定性校验，不在 CI 中隐式调用模型。

## 后果

- 添加系统文案不再改变文章内容模型；添加新 Locale 需要显式补齐其语言包、Astro 静态页面目录与内容目录。
- 每篇翻译可以独立维护标题、正文、标签与描述，不受源语言措辞限制。
- 当前历史文章不会在本次改造中被批量改写；发布命令会明确列出必须补译的文章。

## English Summary

System copy and article content use separate layers. Typed locale packs own UI and accessibility strings, while every localized article is an independent Markdown file linked to its Chinese source by a stable content key. Publishing validates configured target locales deterministically; AI translation remains an explicit authoring action rather than an implicit CI side effect.
