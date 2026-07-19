import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareArticlePackage } from "../article-package";

describe("prepareArticlePackage", () => {
  it("prepares an Astro article without modifying its source", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    const publicImages = path.join(blogRoot, "public/images/misc");
    const outputDir = path.join(workspace, "output");
    const articlePath = path.join(articleDir, "sample.md");

    await mkdir(articleDir, { recursive: true });
    await mkdir(publicImages, { recursive: true });
    await writeFile(
      path.join(publicImages, "diagram.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>'
    );
    await writeFile(
      path.join(publicImages, "inline.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="blue"/></svg>'
    );

    const source = `---
title: 示例文章
pubDatetime: 2026-06-02T09:00:00.000Z
tags:
  - astro
description: 用于验证多渠道同步的示例文章。
cover: /images/misc/diagram.svg
---

## 正文

渠道之间应保持内容一致。

<!--more-->

![流程图](/images/misc/diagram.svg)

路径示例 /images/misc/inline.svg 不应改写。

\`\`\`md
![代码示例](/images/misc/inline.svg)
\`\`\`

行内代码 \`![行内示例](/images/misc/inline.svg)\` 不应改写。

多定界符代码 \`\` \`code\` ![多定界符示例](/images/misc/inline.svg) \`\` 不应改写。

    ![缩进代码示例](/images/misc/inline.svg)

\\![转义示例](/images/misc/inline.svg)

<img src="/images/misc/inline.svg" alt="HTML 图片">
`;
    await writeFile(articlePath, source);

    const result = await prepareArticlePackage("sample.md", {
      blogRoot,
      outputDir,
      siteUrl: "https://blog.jerret.me/",
      siteLanguage: "zh-CN",
      attribution: "blog",
    });

    expect(result.article.title).toBe("示例文章");
    expect(result.article.author).toBe("Jerret");
    expect(result.article.canonicalUrl).toBe(
      "https://blog.jerret.me/posts/2026/06/02/sample/"
    );
    expect(result.article.language).toBe("zh-CN");
    expect(result.preparedMarkdown).toContain(
      "> 原文发布于 [Jerret's Blog](https://blog.jerret.me/posts/2026/06/02/sample/)。"
    );
    expect(result.preparedMarkdown).not.toContain("<!--more-->");
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].preparedPath).toMatch(/\.png$/);
    expect(await readFile(result.assets[0].preparedPath)).not.toHaveLength(0);
    const inlineAsset = result.assets.find(
      asset => asset.sourceReference === "/images/misc/inline.svg"
    );
    expect(inlineAsset?.preparedPath).toMatch(/\.png$/);
    expect(result.preparedMarkdown).toContain(
      "路径示例 /images/misc/inline.svg 不应改写。"
    );
    expect(result.preparedMarkdown).toContain(
      "![代码示例](/images/misc/inline.svg)"
    );
    expect(result.preparedMarkdown).toContain(
      "`![行内示例](/images/misc/inline.svg)`"
    );
    expect(result.preparedMarkdown).toContain(
      "`` `code` ![多定界符示例](/images/misc/inline.svg) ``"
    );
    expect(result.preparedMarkdown).toContain(
      "    ![缩进代码示例](/images/misc/inline.svg)"
    );
    expect(result.preparedMarkdown).toContain(
      "\\![转义示例](/images/misc/inline.svg)"
    );
    expect(result.preparedMarkdown).toContain(
      `<img src="${inlineAsset?.preparedPath}" alt="HTML 图片">`
    );
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await readFile(articlePath, "utf8")).toBe(source);
  });

  it("resolves a unique article slug", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog/notes");
    const outputDir = path.join(workspace, "output");
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "nested-sample.md"),
      `---
title: 嵌套文章
pubDatetime: 2026-07-19T00:00:00.000Z
description: 通过 slug 查找文章。
---

正文。
`
    );

    const result = await prepareArticlePackage("nested-sample", {
      blogRoot,
      outputDir,
      siteUrl: "https://blog.jerret.me/",
      siteLanguage: "zh-CN",
      attribution: "blog",
    });

    expect(result.sourcePath).toBe(
      await realpath(path.join(articleDir, "nested-sample.md"))
    );
  });

  it("reports a missing local image as a structured failure", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "missing-image.md"),
      `---
title: 缺图文章
pubDatetime: 2026-07-19T00:00:00.000Z
description: 缺少本地图片。
---

![缺失图片](/images/missing.png)
`
    );

    await expect(
      prepareArticlePackage("missing-image", {
        blogRoot,
        outputDir: path.join(workspace, "output"),
        siteUrl: "https://blog.jerret.me/",
        siteLanguage: "zh-CN",
        attribution: "blog",
      })
    ).rejects.toMatchObject({
      name: "PublishingError",
      code: "IMAGE_MISSING",
      retryable: false,
    });
  });

  it("rejects an image path that escapes the blog root", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(workspace, "secret.png"), "not-an-image");
    await writeFile(
      path.join(articleDir, "unsafe.md"),
      `---
title: 路径越界
pubDatetime: 2026-07-19T00:00:00.000Z
description: 图片路径不应离开博客目录。
---

![越界图片](../../../../secret.png)
`
    );

    await expect(
      prepareArticlePackage("unsafe", {
        blogRoot,
        outputDir: path.join(workspace, "output"),
        siteUrl: "https://blog.jerret.me/",
        siteLanguage: "zh-CN",
        attribution: "blog",
      })
    ).rejects.toMatchObject({
      code: "IMAGE_PATH_ESCAPE",
      retryable: false,
    });
  });

  it("rejects invalid article metadata with a structured failure", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "invalid.md"),
      `---
title: ""
pubDatetime: not-a-date
description: ""
---

正文。
`
    );

    await expect(
      prepareArticlePackage("invalid", {
        blogRoot,
        outputDir: path.join(workspace, "output"),
        siteUrl: "https://blog.jerret.me/",
        siteLanguage: "zh-CN",
        attribution: "blog",
      })
    ).rejects.toMatchObject({
      code: "ARTICLE_INVALID",
      retryable: false,
    });
  });

  it("reports an ambiguous slug as a structured failure", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const contentRoot = path.join(blogRoot, "src/data/blog");
    await mkdir(path.join(contentRoot, "one"), { recursive: true });
    await mkdir(path.join(contentRoot, "two"), { recursive: true });
    const source = `---
title: 重名文章
pubDatetime: 2026-07-19T00:00:00.000Z
description: 用于验证 slug 歧义。
---

正文。
`;
    await writeFile(path.join(contentRoot, "one/same.md"), source);
    await writeFile(path.join(contentRoot, "two/same.md"), source);

    await expect(
      prepareArticlePackage("same", {
        blogRoot,
        outputDir: path.join(workspace, "output"),
        siteUrl: "https://blog.jerret.me/",
        siteLanguage: "zh-CN",
        attribution: "blog",
      })
    ).rejects.toMatchObject({
      code: "ARTICLE_AMBIGUOUS",
      retryable: false,
    });
  });

  it("keeps the content hash stable across output directories and supports WeChat attribution", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-test-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "stable.md"),
      `---
title: 稳定哈希
author: 自定义作者
pubDatetime: 2026-07-19T00:00:00.000Z
description: 临时目录不应影响内容哈希。
tags:
  - sync
---

正文。
`
    );

    const options = {
      blogRoot,
      siteUrl: "https://blog.jerret.me/",
      siteLanguage: "zh-CN",
      attribution: "wechat" as const,
    };
    const first = await prepareArticlePackage("stable", {
      ...options,
      outputDir: path.join(workspace, "first"),
    });
    const second = await prepareArticlePackage("stable", {
      ...options,
      outputDir: path.join(workspace, "second"),
    });

    expect(first.article.author).toBe("自定义作者");
    expect(first.preparedMarkdown).toContain(
      "> 文章来源：Jerret Life 微信公众号。"
    );
    expect(first.contentHash).toBe(second.contentHash);
  });
});
