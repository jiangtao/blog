---
title: 容器化RN-H5 离线加载 iOS 踩坑记
pubDatetime: 2026-02-25T14:00:00.000Z
tags:
  - 容器化
  - react-native
  - ios
  - webview
  - troubleshooting
draft: false
description: "记录 React Native 项目中 H5 离线加载在 iOS 平台上的问题排查过程，从 NSURL Error 到正确使用 react-native-fs 获取 bundle 路径的完整解决方案。"
cover: /images/blog-covers/rn-h5-ios-fix-cover.svg
---

## 问题背景

在 React Native 容器应用中，我们需要实现 H5 页面的离线加载功能。需求很简单：

- 将 H5 资源打包到 app bundle 中
- 使用 WebView 加载本地 HTML 文件
- 支持 Android 和 iOS 双平台

Android 平台顺利实现，但 iOS 却遇到了 `NSURLErrorBadURL (-1100)` 错误。

### 版本选择：为什么从 RN 0.82.1 降级到 0.73.7？

项目最初使用 **React Native 0.82.1**，但在 iOS 构建时遇到了无法解决的 modulemap 错误：

```
error: module map file '/Users/.../RNReanimated.modulemap' not found
```

#### RN 0.82.1 的问题

| 问题 | 描述 | 影响 |
|:-----|------|------|
| **新架构强制依赖** | 0.82.x 强制使用 New Architecture (Fabric/TurboModules) | 需要大量代码迁移 |
| **第三方库兼容性** | `react-native-reanimated` 等 library 的 modulemap 配置问题 | iOS 构建失败 |
| **Codegen 配置复杂** | 需要配置 `package.json` 的 `codegenConfig` | 增加维护成本 |
| **C++ 依赖问题** | 新架构依赖的 C++ 库在 CocoaPods 中解析失败 | 无法构建 |

#### 降级到 RN 0.73.7 的原因

经过评估，选择降级到 **React Native 0.73.7**：

| 特性 | RN 0.73.7 | RN 0.82.1 |
|:-----|----------|-----------|
| 架构 | Old Architecture (默认) | New Architecture (强制) |
| iOS 构建 | ✅ 稳定 | ❌ modulemap 错误 |
| 第三方库兼容 | ✅ 良好 | ⚠️ 部分库不兼容 |
| Codegen | 可选 | 强制 |
| react-native-fs | ✅ 完全兼容 | ⚠️ Legacy Module (潜在问题) |
| 维护成本 | 低 | 高 |

> **react-native-fs 兼容性说明**：
>
> 虽然 `react-native-fs` 官方声明支持所有 RN 版本，但在 RN 0.82.x 的强制新架构环境下存在潜在问题：
>
> - 使用 Legacy Native Module 系统，与 TurboModules 不兼容
> - 可能收到弃用警告，未来版本不支持
> - 新架构渲染引擎 (Fabric) 可能有兼容性问题
>
> 如果坚持使用 RN 0.82.x，需要寻找替代方案, 已尝试 expo 同样不太行，需要客户端同学支持从客户端底层调整：
> - `expo-file-system` (需要 Expo SDK)
> - 自定义 TurboModule (开发成本高)
> - 社区方案如 `react-native-fs-turbo` (非官方)

> **注意**：如果项目必须使用新架构特性（如 Fabric 渲染、TurboModules），则需要花时间解决 modulemap 配置问题并替换不兼容的第三方库。

### 降级过程中的其他问题

除了 modulemap 错误，降级过程还遇到了以下问题（后文详述）：

1. **Babel 配置错误** - `react-native-reanimated/plugin` 引用
2. **组件注册名称不匹配** - `app.json` 与 AppDelegate 不一致
3. **H5 离线加载 NSURL 错误** - 本文重点讨论

## 错误现象

iOS 模拟器中 WebView 显示：

```
Error loading page
NSURLErrorDomain Code -1100
"The requested URL was not found on this server."
```

> 错误截图：WebView 显示红色的错误提示，包含 "NSURLErrorDomain Code -1100" 和 URL 未找到的描述。

## 初始配置

### 资源文件位置

```bash
# iOS Bundle 结构
ios/AwesomeProject/
├── AppDelegate.swift
├── Info.plist
└── bundled_assets/           # H5 资源目录
    └── h5/
        ├── index.html
        ├── favicon.png
        └── static/
            ├── css/
            └── js/
```

### WebView 配置

```typescript
// OfflineWebView.tsx
<WebView
  source={{ uri: 'file:///bundled_assets/h5/index.html' }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  allowFileAccess={true}
  allowUniversalAccessFromFileURLs={true}
  allowFileAccessFromFileURLs={true}
  originWhitelist={['*']}
/>
```

### Android 配置（工作正常）

```typescript
const getInitialUri = (): string => {
  if (Platform.OS === 'android') {
    return 'file:///android_asset/bundled_assets/h5/index.html';
  } else if (Platform.OS === 'ios') {
    return 'file:///bundled_assets/h5/index.html';
  }
};
```

Android 使用 `file:///android_asset/...` 格式，一切正常。

## 排查过程

### 第一步：验证文件存在

首先确认 bundled assets 是否被正确打包到 app bundle 中：

```bash
# 检查构建产物
ls -la /Users/jt/Library/Developer/Xcode/DerivedData/AwesomeProject-*/Build/Products/Debug-iphonesimulator/AwesomeProject.app/bundled_assets/h5/

# 输出：
# -rw-r--r--  1 jt  staff   858 Feb 15 21:54 index.html
# drwxr-xr-x  4 jt  staff   128 Feb 15 21:54 static
```

✅ 文件确实存在于 app bundle 中。

### 第二步：检查网络权限

Info.plist 中已配置本地网络访问：

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

✅ 网络权限配置正确。

### 第三步：尝试修改路径格式

#### 尝试 1: 相对路径（失败）

```typescript
// ❌ 不工作
return 'file:///bundled_assets/h5/index.html';
```

#### 尝试 2: 使用 ./ 相对路径（失败）

```typescript
// ❌ 不工作
return 'file://./bundled_assets/h5/index.html';
```

#### 尝试 3: 绝对路径字符串（失败）

```typescript
// ❌ 无法从 JS 确定动态路径
return 'file:///var/containers/Bundle/Application/.../AwesomeProject.app/bundled_assets/h5/index.html';
```

❌ 路径问题：iOS WKWebView 需要完整的绝对路径，但 JavaScript 无法直接获取 bundle 路径。

### 第四步：创建 Native Module（未完成）

尝试创建 Swift Native Module 来获取 bundle 路径：

```swift
// BundleAssetsManager.swift
@objc(BundleAssetsManager)
class BundleAssetsManager: NSObject {
  @objc
  func getBundledH5Index(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter: @escaping RCTPromiseRejectBlock) {
    guard let bundlePath = Bundle.main.bundlePath else {
      rejecter("BUNDLE_PATH_ERROR", "Could not get bundle path", nil)
      return
    }
    let indexPath = "\(bundlePath)/bundled_assets/h5/index.html"
    resolve("file://\(indexPath)")
  }
}
```

**问题**：Native Module 文件需要添加到 Xcode 项目中，手动配置复杂。

### 第五步：使用 react-native-fs（成功！）

发现项目中已经安装了 `react-native-fs`，这个库提供了获取 bundle 路径的 API！

#### 初版方案：直接使用 file:// URI

```typescript
// src/native/BundleAssetsManager.ts
import RNFS from 'react-native-fs';

export const getBundledH5Url = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    return 'file:///android_asset/bundled_assets/h5/index.html';
  }

  // iOS: 使用 react-native-fs 获取正确的 bundle 路径
  const mainBundlePath = RNFS.MainBundlePath;
  const h5IndexPath = `${mainBundlePath}/bundled_assets/h5/index.html`;

  // 验证文件存在
  const exists = await RNFS.exists(h5IndexPath);
  if (exists) {
    return `file://${h5IndexPath}`;
  }

  throw new Error('H5 bundle not found');
};
```

#### 遇到新问题：外部资源加载失败

使用 file:// URI 后，虽然 HTML 能加载，但外部资源（CSS、JS、图片）出现错误：

```
[Error] Failed to load resource: The operation couldn't be completed. (WebKitError error 101)
Ignoring request to load this main resource because it is outside the sandbox
```

这是因为 iOS WKWebView 的沙盒限制，即使使用绝对路径，外部资源仍被视为 "outside the sandbox"。

#### 最终方案：HTML 字符串 + baseUrl（推荐）

解决方法是读取 HTML 内容作为字符串，并设置 baseUrl：

```typescript
// src/native/BundleAssetsManager.ts
import RNFS from 'react-native-fs';

export const getBundledH5Content = async (): Promise<{ html: string; baseUrl: string } | null> => {
  if (Platform.OS !== 'ios') return null;

  const mainBundlePath = RNFS.MainBundlePath;
  const h5IndexPath = `${mainBundlePath}/bundled_assets/h5/app.html`;

  // 关键：baseUrl 必须是完整的 app.html 路径（包括文件名）
  const baseUrl = `file://${mainBundlePath}/bundled_assets/h5/app.html`;

  // 读取 HTML 内容
  const html = await RNFS.readFile(h5IndexPath, 'utf8');

  return { html, baseUrl };
};
```

#### 更新 OfflineWebView 组件

```typescript
// OfflineWebView.tsx
import { getBundledH5Content } from '../native/BundleAssetsManager';

const [loadState, setLoadState] = useState<{
  source: 'bundled' | 'online';
  // Android 使用 uri，iOS 使用 html + baseUrl
  uri?: string;
  html?: string;
  baseUrl?: string;
  isLoading: boolean;
  error: string | null;
}>({
  source: 'bundled',
  uri: getInitialUri(), // Android 初始值
  isLoading: true,
  error: null,
});

// iOS: 异步获取 HTML 内容和 baseUrl
useEffect(() => {
  if (Platform.OS === 'ios') {
    getBundledH5Content()
      .then((result) => {
        if (result) {
          console.log('[OfflineWebView] Got iOS H5 content');
          setLoadState({
            source: 'bundled',
            html: result.html,
            baseUrl: result.baseUrl,
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((error) => {
        console.error('[OfflineWebView] Error:', error);
        setLoadState(prev => ({ ...prev, error: error.message, isLoading: false }));
      });
  }
}, []);

// 渲染时区分平台
<WebView
  source={
    loadState.html && loadState.baseUrl
      ? { html: loadState.html, baseUrl: loadState.baseUrl } // iOS
      : { uri: loadState.uri } // Android
  }
  // ... 其他配置
/>
```

### 第六步：适配 H5 路径

实现 `html + baseUrl` 方案后，H5 页面能够成功加载 HTML 内容，但外部资源（CSS、JS、图片）可能出现加载失败。这是因为 H5 项目的资源路径配置不正确。

#### 问题：资源路径使用绝对路径

许多前端构建工具（rsbuild、vite、webpack）默认生成绝对路径：

```html
<!-- ❌ 错误：使用绝对路径 -->
<link rel="stylesheet" href="/static/css/main.css">
<script src="/static/js/bundle.js"></script>
<img src="/static/image/logo.png">
```

**问题**：
- **Android**：WebView 能正确解析绝对路径（基于 `file://` 协议根目录）
- **iOS**：WKWebView 的沙盒机制无法解析绝对路径，资源加载失败

#### 解决方案：使用相对路径

##### 1. HTML 模板添加 `<base>` 标签

在 H5 项目的 HTML 模板中添加 `<base href="./">`：

```html
<!-- public/app.html -->
<!DOCTYPE html>
<html>
<head>
  <!-- 关键：设置相对路径基准 -->
  <base href="./">

  <!-- 资源使用相对路径 -->
  <link rel="icon" type="image/png" sizes="32x32" href="./favicon/favicon-32x32.png">
  <link rel="stylesheet" href="./static/css/main.css">
</head>
<body>
  <div id="root"></div>
  <script src="./static/js/bundle.js"></script>
</body>
</html>
```

##### 2. 构建工具配置（rsbuild 示例）

确保构建工具使用相对路径作为 base：

```javascript
// rsbuild.config.ts
export default defineConfig({
  output: {
    assetPrefix: './', // 使用相对路径
  },
  // 或者使用环境变量
  base: './',
});
```

##### 3. 构建后路径修复（备选方案）

如果构建工具仍生成绝对路径，可以在构建后自动修复：

```javascript
// scripts/fix-asset-paths.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/app.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 将绝对路径改为相对路径
const replacements = [
  [/href="\/static\//g, 'href="./static/'],
  [/src="\/static\//g, 'src="./static/'],
  [/href="\/favicon\//g, 'href="./favicon/'],
];

replacements.forEach(([pattern, replacement]) => {
  html = html.replace(pattern, replacement);
});

fs.writeFileSync(htmlPath, html);
console.log('✅ Asset paths fixed to relative paths');
```

在 `package.json` 中添加：

```json
{
  "scripts": {
    "build": "rsbuild build && node scripts/fix-asset-paths.js"
  }
}
```

#### 资源路径对照表

| 资源类型 | ❌ 绝对路径（iOS 失败） | ✅ 相对路径 |
|:---------|:-----------------------|:-----------|
| CSS | `/static/css/main.css` | `./static/css/main.css` |
| JS | `/static/js/bundle.js` | `./static/js/bundle.js` |
| 图片 | `/static/image/logo.png` | `./static/image/logo.png` |
| Favicon | `/favicon/favicon.ico` | `./favicon/favicon.ico` |
| 字体 | `/static/fonts/icon.woff2` | `./static/fonts/icon.woff2` |

#### 验证方法

构建后检查生成的 HTML 文件：

```bash
# 检查 dist/app.html
grep -E 'href=|src=' dist/app.html

# 期望输出（全部使用相对路径）：
# href="./favicon/favicon-32x32.png"
# href="./static/css/main.css"
# src="./static/js/bundle.js"
```

#### RN 组件中的完整实现

```typescript
// src/containers/webview/OfflineWebView.tsx
/**
 * ## H5 资源路径配置要求（重要！）
 *
 * H5 页面中的所有资源（CSS、JS、图片、字体等）**必须使用相对路径**：
 *
 * ✅ 正确：使用相对路径 `./` 或 `../`
 * - `<link href="./static/css/index.css">`
 * - `<script src="./static/js/index.js"></script>`
 *
 * ❌ 错误：使用绝对路径 `/`
 * - `<link href="/static/css/index.css">`  ← iOS 无法加载
 *
 * ### HTML 模板配置
 * 在 H5 项目的 `public/app.html` 中添加 `<base href="./">` 标签。
 */
```

## 最终方案

### 平台差异化加载策略

由于 iOS 和 Android 的 WebView 实现差异，采用不同的加载方式：

```typescript
// src/native/BundleAssetsManager.ts
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Android: 直接返回 file:// URI
 */
export const getBundledH5Url = (): string => {
  if (Platform.OS === 'android') {
    return 'file:///android_asset/bundled_assets/h5/app.html';
  }
  throw new Error('getBundledH5Url should only be called on Android');
};

/**
 * iOS: 返回 HTML 内容 + baseUrl
 * baseUrl 必须是完整的 app.html 路径（包括文件名）
 */
export const getBundledH5Content = async (): Promise<{ html: string; baseUrl: string }> => {
  const mainBundlePath = RNFS.MainBundlePath;
  const h5IndexPath = `${mainBundlePath}/bundled_assets/h5/app.html`;

  // 验证文件存在
  const exists = await RNFS.exists(h5IndexPath);
  if (!exists) {
    throw new Error('bundled_assets/h5/app.html not found');
  }

  // 关键：baseUrl 必须是完整的 app.html 路径
  const baseUrl = `file://${mainBundlePath}/bundled_assets/h5/app.html`;
  const html = await RNFS.readFile(h5IndexPath, 'utf8');

  return { html, baseUrl };
};
```

### OfflineWebView 渲染逻辑

```typescript
// OfflineWebView.tsx
const [loadState, setLoadState] = useState<{
  source: 'bundled' | 'online';
  uri?: string;           // Android 使用
  html?: string;          // iOS 使用
  baseUrl?: string;       // iOS 使用
  isLoading: boolean;
  error: string | null;
}>({
  source: 'bundled',
  uri: getBundledH5Url(), // Android 固定路径
  isLoading: Platform.OS === 'ios', // iOS 需要异步加载
  error: null,
});

// iOS: 异步获取 HTML 内容
useEffect(() => {
  if (Platform.OS === 'ios') {
    getBundledH5Content()
      .then(({ html, baseUrl }) => {
        setLoadState(prev => ({ ...prev, html, baseUrl, isLoading: false }));
      })
      .catch((error) => {
        setLoadState(prev => ({ ...prev, error: error.message, isLoading: false }));
      });
  }
}, []);

// 渲染时区分平台
<WebView
  source={
    loadState.html && loadState.baseUrl
      ? { html: loadState.html, baseUrl: loadState.baseUrl } // iOS
      : { uri: loadState.uri } // Android
  }
  originWhitelist={['*']}
  allowFileAccess={true}
  allowUniversalAccessFromFileURLs={true}
  allowFileAccessFromFileURLs={true}
  mixedContentMode="always"
/>
```

### 生成的路径示例

```bash
# Android
file:///android_asset/bundled_assets/h5/app.html

# iOS (动态生成)
file:///var/containers/Bundle/Application/EB3A4C8D-9A2F-4C3E-8B1D-7F9E6A5C8D4B/AwesomeProject.app/bundled_assets/h5/app.html
```

## 技术总结

### iOS 与 Android 文件路径差异

| 平台 | 资源位置 | URL 格式 | 加载方式 |
|:-----|---------|---------|:---------|
| **Android** | `assets/` 目录 | `file:///android_asset/...` (固定) | 直接使用 `uri` |
| **iOS** | App Bundle 内 | 动态路径 | 使用 `html` + `baseUrl` |

### WKWebView 沙盒限制与解决方案

iOS WKWebView 对文件 URL 有严格限制：

1. **必须使用绝对路径**：相对路径 `file:///bundled_assets/...` 不工作
2. **路径必须真实存在**：iOS 不会自动解析 bundle 相对路径
3. **沙盒限制**：使用 `file://` URI 时，外部资源被视为 "outside the sandbox"
4. **解决方案**：使用 `source={{ html, baseUrl }}` 加载，避免沙盒问题

### baseUrl 设置的关键要点

```typescript
// ✅ 正确：baseUrl 包含完整的 app.html 路径
const baseUrl = `file://${mainBundlePath}/bundled_assets/h5/app.html`;

// ❌ 错误：baseUrl 只指向目录
const baseUrl = `file://${mainBundlePath}/bundled_assets/h5/`;

// ❌ 错误：baseUrl 使用 file:// URI 方式
<WebView source={{ uri: `file://${path}/app.html` }} />;
```

### react-native-fs 关键 API

```typescript
import RNFS from 'react-native-fs';

// 获取主 bundle 路径
RNFS.MainBundlePath
// => "/var/containers/.../AwesomeProject.app"

// 检查文件存在
await RNFS.exists(path);
// => true/false

// 读取文件内容
await RNFS.readFile(path, 'utf8');
```

## 其他尝试过的方案

### 方案 1: 使用 file:// URI（初版方案）

```typescript
const url = `file://${mainBundlePath}/bundled_assets/h5/app.html`;
<WebView source={{ uri: url }} />
```

**问题**：HTML 能加载，但外部资源（CSS、JS、图片）出现沙盒错误：
```
Ignoring request to load this main resource because it is outside the sandbox
```

**结论**：不推荐用于加载包含外部资源的 H5 应用。

### 方案 2: Native Module

创建自定义 Swift/Native Module，但需要手动配置 Xcode 项目，较为复杂。

### 方案 3: react-native-assets

专门的资源管理库，但增加了依赖。

## H5 资源路径配置

### HTML 模板配置

为了确保资源路径正确解析，HTML 模板需要添加 `<base>` 标签：

```html
<!-- public/app.html -->
<head>
  <!-- 关键：设置相对路径基准 -->
  <base href="./">

  <!-- favicon 使用相对路径 -->
  <link rel="icon" type="image/png" sizes="32x32" href="./favicon/favicon-32x32.png">

  <!-- 其他资源使用相对路径 -->
  <link rel="stylesheet" href="./static/css/main.css">
  <script src="./static/js/bundle.js"></script>
</head>
```

### 资源路径规则

| 资源类型 | Android | iOS |
|:---------|:--------|:-----|
| HTML | `file:///android_asset/...` | `{ html, baseUrl }` |
| CSS/JS | 相对路径 `./static/...` | 相对路径 `./static/...` |
| 图片 | 相对路径 `./static/image/...` | 相对路径 `./static/image/...` |
| Favicon | 相对路径 `./favicon/...` | 相对路径 `./favicon/...` |

### 构建后处理（可选）

如果打包工具（如 rsbuild、vite）生成的是绝对路径，可以在构建后修复：

```javascript
// scripts/fix-asset-paths.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/app.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 将绝对路径 /static/ 改为相对路径 ./static/
html = html.replace(/href="\/static\//g, 'href="./static/');
html = html.replace(/src="\/static\//g, 'src="./static/');
html = html.replace(/href="\/favicon\//g, 'href="./favicon/');

fs.writeFileSync(htmlPath, html);
```

## 最佳实践建议

### 1. 平台差异化加载

```typescript
// ✅ 推荐：区分平台加载方式
if (Platform.OS === 'android') {
  return <WebView source={{ uri }} />;
} else {
  return <WebView source={{ html, baseUrl }} />;
}

// ❌ 避免：跨平台使用相同方式
return <WebView source={{ uri }} />; // iOS 可能出现沙盒错误
```

### 2. 统一路径获取

```typescript
// ✅ 推荐：使用统一 API
const uri = await getBundledH5Url();
<WebView source={{ uri }} />

// ❌ 避免：硬编码平台路径
const uri = Platform.OS === 'ios'
  ? 'file:///bundled_assets/h5/app.html'
  : 'file:///android_asset/bundled_assets/h5/app.html';
```

### 2. 文件存在验证

```typescript
const exists = await RNFS.exists(fullPath);
if (!exists) {
  throw new Error(`File not found: ${fullPath}`);
}
```

### 3. 错误处理

```typescript
const [error, setError] = useState<string | null>(null);

if (error) {
  return <ErrorView message={error} />;
}
```

### 4. 开发环境日志

```typescript
if (__DEV__) {
  console.log('[OfflineWebView] Loading:', uri);
  console.log('[OfflineWebView] Bundle path:', RNFS.MainBundlePath);
}
```

### 5. 刘海屏适配

现代全面屏手机（iPhone X、小米、华为等）需要特殊处理刘海区域。

#### Android 适配（系统级配置）

使用 `AndroidManifest.xml` 的 meta-data 配置：

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application>
  <!-- 官方刘海屏支持 -->
  <meta-data
    android:name="android.notch_support"
    android:value="true" />

  <!-- 小米 MIUI 适配 -->
  <meta-data
    android:name="notch.config"
    android:value="portrait|landscape" />

  <!-- 华为 EMUI 适配 -->
  <meta-data
    android:name="android.max_aspect"
    android:value="2.4" />

  <!-- 允许内容延伸到刘海区域 -->
  <activity
    android:name=".MainActivity"
    android:layoutInDisplayCutoutMode="shortEdges" />
</application>
```

| 配置项 | 作用 | 适用机型 |
|:-------|:-----|:---------|
| `android.notch_support` | 官方刘海屏支持 | 通用 Android |
| `notch.config` | 小米刘海屏适配 | 小米 MIUI |
| `android.max_aspect` | 华为长屏幕适配 | 华为 EMUI |
| `layoutInDisplayCutoutMode` | 允许内容延伸到刘海区 | Android P+ |

#### iOS 适配（组件级处理）

使用 `react-native-safe-area-context`：

```typescript
// App.tsx
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

function App() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* 你的内容 */}
    </View>
  );
}
```

#### WebView 安全区注入

将安全区信息注入到 H5 页面：

```typescript
// JSBridge.ts
const injectedJavaScript = `
  (function() {
    // 获取安全区信息
    const safeAreaInsets = ${JSON.stringify(safeAreaInsets)};

    // 注入到 window 对象
    window.ContainerAPI = {
      safeArea: safeAreaInsets,
      // ... 其他 API
    };

    // 设置 CSS 变量供 H5 使用
    document.documentElement.style.setProperty('--safe-area-inset-top', safeAreaInsets.top + 'px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', safeAreaInsets.bottom + 'px');
  })();
`;

<WebView
  injectedJavaScript={injectedJavaScript}
  // ...
/>
```

#### H5 使用安全区

```css
/* H5 CSS */
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 或使用 CSS 变量 */
.container {
  padding-top: var(--safe-area-inset-top, 0);
  padding-bottom: var(--safe-area-inset-bottom, 0);
}
```

#### JSBridge 安全区 API

```javascript
// H5 页面中调用
const { safeArea } = window.ContainerAPI;
console.log('Safe area:', safeArea);
// { top: 47, bottom: 34, left: 0, right: 0 } (iPhone X)
```

## 版本信息

### 最终使用的版本

| Package | Version | 说明 |
|---------|---------|------|
| React Native | 0.73.11 | 从 0.75.5 降级以支持 Xcode 26.2 |
| React | 18.2.0 | |
| react-native-webview | ^13.x | |
| react-native-fs | ^2.20.0 | 用于获取 bundle 路径 |
| react-native-safe-area-context | 4.14.0 | iOS 刘海屏适配 |
| react-native-gesture-handler | 2.14.0 | |
| react-native-screens | 3.29.0 | |
| iOS | 17.5 (模拟器) | |

### 降级移除的包（新架构相关）

```json
{
  "react-native-reanimated": "~3.10.1",     // ❌ 移除
  "@react-native-community/netinfo": "^11.4.1", // ❌ 新架构依赖
  "react-native-mmkv": "^2.12.2",           // ❌ TurboModule
  // ... 其他新架构相关包
}
```

## 参考资料

- [react-native-fs Documentation](https://github.com/itinance/react-native-fs)
- [react-native-webview Local Files](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#local-files)
- [WKWebView and File URLs](https://developer.apple.com/documentation/webkit/wkwebview)

## 总结

这个问题的核心在于 **iOS 需要完整的绝对文件路径**，而 JavaScript 无法直接获取 bundle 路径。解决思路是：

1. 发现 `react-native-fs` 已提供 `MainBundlePath` API
2. 构造完整的绝对路径
3. 使用 `file://` 协议前缀

相比创建自定义 Native Module，使用现成的 `react-native-fs` 更加简洁高效。这也提醒我们：在遇到问题时，先检查项目现有依赖，避免重复造轮。
