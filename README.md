本repo记录项目总结，原创文件，翻译等，文件已迁移到[issue](https://github.com/jiangtao/blog/issues)。

喜欢请`star`，订阅请`watch`，欢迎讨论.

## 目录结构

- **home/** - Hexo 博客，部署到 [Vercel](https://jiangtao.vercel.app)
- **docs/** - 技术文档和代码示例

内容会同步至 [语雀博客](https://www.yuque.com/imjt/blog) 和 Jerret Life 微信公众号

## 文章目录

- [docker文章](https://github.com/jiangtao/blog/issues?utf8=%E2%9C%93&q=docker)
- [node文章](https://github.com/jiangtao/blog/issues?utf8=%E2%9C%93&q=node)
- [vue文章](https://github.com/jiangtao/blog/issues?utf8=%E2%9C%93&q=vue)
- [项目开发中的问题解决方法](https://github.com/jiangtao/blog/issues?q=is%3Aissue+is%3Aclosed+label%3Asolution)
- [leetcode刷题记录](https://github.com/jiangtao/keep-leetcode)
- [江涛的个人分享](https://github.com/jiangtao/shares)

## 备注

- [issue](https://github.com/jiangtao/blog/issues) 为原创文件
- 项目中的目录代码片段和参考资源
- closed issue一般为项目中遇到的问题解决方法

## 博客多语言 / Blog i18n

- 中文为默认静态站点，沿用现有 URL；英文与繁体中文静态站点分别使用 `/en/`、`/zh-TW/` 前缀，顶部可切换语言。
- 翻译文章位于 `home/src/data/blog/<locale>/`，必须包含对应的 `locale` 与指向中文源文章的 `translationKey`；当前支持 `en`、`zh-TW`。
- 发布前先执行 `cd home && npm run translations:status`。若有缺失或过期翻译，调用 Codex 的 `$translate-blog-en` 技能并明确目标 Locale（`en` 或 `zh-TW`）；`npm run publish` 会在任一发布必需语言未完整时中止。

Chinese is the default static site. English and Traditional Chinese pages are generated under `/en/` and `/zh-TW/`, with a language selector in the header. Before publishing, run the translation status check and use `$translate-blog-en` with the target locale to create or refresh missing localized posts.

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/cn/"><img alt="知识共享许可协议" style="border-width:0" src="http://i.creativecommons.org/l/by-nc-sa/3.0/cn/88x31.png" /></a><br />本<span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/Text" rel="dct:type">作品</span>由<a xmlns:cc="http://creativecommons.org/ns#" href="http://github.com/jiangtao" property="cc:attributionName" rel="cc:attributionURL">jiangtao</a>创作，采用<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/3.0/cn/">知识共享署名-非商业性使用-相同方式共享 3.0 中国大陆许可协议</a>进行许可。凡是转载的文章，翻译的文章，或者由其他作者投稿的文章，版权归原作者所有。
