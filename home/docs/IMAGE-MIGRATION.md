# 图片链接检查与迁移工具

## 问题

博客中存在大量来自语雀 (cdn.nlark.com/yuque) 的图片链接，这些链接有防盗链限制，无法直接访问。

## 解决方案

### 检查工具

```bash
# 检查所有文章的图片链接
npm run lint:images

# 输出示例：
# 🔴 https://cdn.nlark.com/yuque/...
#    状态: Yuque 防盗链（需要迁移）
```

### 手动迁移

1. 在语雀中打开文章，右键下载图片到 `home/.temp/` 目录
2. 运行迁移命令：

```bash
npm run migrate:images
```

3. 工具会自动：
   - 优化图片（压缩 + WebP 转换）
   - 替换 Markdown 链接为 `<img>` 标签 + 懒加载
   - 删除临时文件

### 自定义脚本

在 `home/source/js/image-fallback.js` 中定义全局 fallback 方法：

```javascript
window.imgFallback = function(img) {
  img.onerror = null;
  img.src = img.src.replace(/\.webp$/, '.png');
};
```

在 Hexo 配置中注入脚本（详见实现计划）。

### 自动迁移

```bash
# 自动下载并迁移 Yuque 图片（可能失败，需要手动处理）
npm run fix:images
```

## 图片处理

- **原图**: 保存到 `images/.original/` (不提交到 Git)
- **压缩图**: PNG 格式，质量 85%
- **WebP**: 更小体积，现代浏览器优先使用

## Markdown 输出

```html
<!-- WebP 优先，懒加载，调用全局 fallback 方法 -->
<img src="/images/2020/article/123456.webp" alt="图片" loading="lazy" onerror="window.imgFallback(this)">
```

**全局 fallback 方法**（`home/source/js/image-fallback.js`）：
```javascript
window.imgFallback = function(img) {
  img.onerror = null; // 防止重复触发
  img.src = img.src.replace(/\.webp$/, '.png');
};
```

## Git Hooks

每次 commit 前自动检查图片链接，确保不会提交失效链接。
