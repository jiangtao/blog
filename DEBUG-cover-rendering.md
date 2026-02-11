# 调试封面渲染问题

## 问题描述
版本锁封面 URL: https://blog.jerret.me/images/blog-covers/version-lock-cover.svg
- HTTP 200 响应正常
- Content-Type: image/svg+xml 正确
- 但浏览器渲染时报错

## 可能原因
1. SVG 兼容性问题 - 某些浏览器不支持某些特性
2. 服务器缓存问题 - 旧版本被缓存
3. 字体渲染问题 - Segoe UI 字体在某些环境不可用
4. 图片被 CDN 缓存但内容有变化

## 调试步骤

### 第一步：创建新分支
```bash
git checkout -b debug/cover-rendering
```

### 第二步：验证 SVG 文件
```bash
# 对比本地文件与其他封面
ls -la src/images/blog-covers/
```

### 第三步：清除浏览器缓存测试
访问 https://blog.jerret.me/images/blog-covers/version-lock-cover.svg?v=1

### 第四步：如果确认问题
可能的修复方案：
- 移除水印中的特殊字符
- 使用通用字体替代 Segoe UI
- 简化 SVG 结构
- 检查是否有非法字符

### 第五步：提交修复
```bash
git add .
git commit -m "fix: correct SVG rendering issue for version-lock cover"
git push origin debug/cover-rendering
```

## 测试文件位置
测试 SVG: /home/public/images/blog-covers/test-minimal.svg
测试 URL: https://blog.jerret.me/images/blog-covers/test-minimal.svg
