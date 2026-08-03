---
title: 容器化RN-H5 離線加載 iOS 踩坑記
pubDatetime: 2026-02-25T14:00:00.000Z
tags:
  - 容器化
  - react-native
  - ios
  - webview
  - troubleshooting
draft: false
description: "記錄 React Native 項目中 H5 離線加載在 iOS 平台上的問題排查過程，從 NSURL Error 到正確使用 react-native-fs 獲取 bundle 路徑的完整解決方案。"
cover: /images/i18n/zh-TW/blog-covers/react-native-h5-ios-fix-cover.svg
locale: zh-TW
translationKey: react-native-h5-ios-fix
---

## 問題背景

在 React Native 容器應用中，我們需要實現 H5 頁面的離線加載功能。需求很簡單：

- 將 H5 資源打包到 app bundle 中
- 使用 WebView 加載本地 HTML 文件
- 支持 Android 和 iOS 雙平台

Android 平台順利實現，但 iOS 卻遇到了 `NSURLErrorBadURL (-1100)` 錯誤。

### 版本選擇：為甚麼從 RN 0.82.1 降級到 0.73.7？

項目最初使用 **React Native 0.82.1**，但在 iOS 構建時遇到了無法解決的 modulemap 錯誤：

```
error: module map file '/Users/.../RNReanimated.modulemap' not found
```

#### RN 0.82.1 的問題

| 問題 | 描述 | 影響 |
|:-----|------|------|
| **新架構強制依賴** | 0.82.x 強制使用 New Architecture (Fabric/TurboModules) | 需要大量代碼遷移 |
| **第三方庫兼容性** | `react-native-reanimated` 等 library 的 modulemap 配置問題 | iOS 構建失敗 |
| **Codegen 配置複雜** | 需要配置 `package.json` 的 `codegenConfig` | 增加維護成本 |
| **C++ 依賴問題** | 新架構依賴的 C++ 庫在 CocoaPods 中解析失敗 | 無法構建 |

#### 降級到 RN 0.73.7 的原因

經過評估，選擇降級到 **React Native 0.73.7**：

| 特性 | RN 0.73.7 | RN 0.82.1 |
|:-----|----------|-----------|
| 架構 | Old Architecture (默認) | New Architecture (強制) |
| iOS 構建 | ✅ 穩定 | ❌ modulemap 錯誤 |
| 第三方庫兼容 | ✅ 良好 | ⚠️ 部分庫不兼容 |
| Codegen | 可選 | 強制 |
| react-native-fs | ✅ 完全兼容 | ⚠️ Legacy Module (潛在問題) |
| 維護成本 | 低 | 高 |

> **react-native-fs 兼容性說明**：
>
> 雖然 `react-native-fs` 官方聲明支持所有 RN 版本，但在 RN 0.82.x 的強制新架構環境下存在潛在問題：
>
> - 使用 Legacy Native Module 系統，與 TurboModules 不兼容
> - 可能收到棄用警告，未來版本不支持
> - 新架構渲染引擎 (Fabric) 可能有兼容性問題
>
> 如果堅持使用 RN 0.82.x，需要尋找替代方案, 已嘗試 expo 同樣不太行，需要客戶端同學支持從客戶端底層調整：
> - `expo-file-system` (需要 Expo SDK)
> - 自定義 TurboModule (開發成本高)
> - 社區方案如 `react-native-fs-turbo` (非官方)

> **注意**：如果項目必須使用新架構特性（如 Fabric 渲染、TurboModules），則需要花時間解決 modulemap 配置問題並替換不兼容的第三方庫。

### 降級過程中的其他問題

除了 modulemap 錯誤，降級過程還遇到了以下問題（後文詳述）：

1. **Babel 配置錯誤** - `react-native-reanimated/plugin` 引用
2. **組件注冊名稱不匹配** - `app.json` 與 AppDelegate 不一致
3. **H5 離線加載 NSURL 錯誤** - 本文重點討論

## 錯誤現象

iOS 模擬器中 WebView 顯示：

```
Error loading page
NSURLErrorDomain Code -1100
"The requested URL was not found on this server."
```

> 錯誤截圖：WebView 顯示紅色的錯誤提示，包含 "NSURLErrorDomain Code -1100" 和 URL 未找到的描述。

## 初始配置

### 資源文件位置

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

## 排查過程

### 第一步：驗證文件存在

首先確認 bundled assets 是否被正確打包到 app bundle 中：

```bash
# 检查构建产物
ls -la /Users/jt/Library/Developer/Xcode/DerivedData/AwesomeProject-*/Build/Products/Debug-iphonesimulator/AwesomeProject.app/bundled_assets/h5/

# 输出：
# -rw-r--r--  1 jt  staff   858 Feb 15 21:54 index.html
# drwxr-xr-x  4 jt  staff   128 Feb 15 21:54 static
```

✅ 文件確實存在於 app bundle 中。

### 第二步：檢查網絡權限

Info.plist 中已配置本地網絡訪問：

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

✅ 網絡權限配置正確。

### 第三步：嘗試修改路徑格式

#### 嘗試 1: 相對路徑（失敗）

```typescript
// ❌ 不工作
return 'file:///bundled_assets/h5/index.html';
```

#### 嘗試 2: 使用 ./ 相對路徑（失敗）

```typescript
// ❌ 不工作
return 'file://./bundled_assets/h5/index.html';
```

#### 嘗試 3: 絕對路徑字符串（失敗）

```typescript
// ❌ 无法从 JS 确定动态路径
return 'file:///var/containers/Bundle/Application/.../AwesomeProject.app/bundled_assets/h5/index.html';
```

❌ 路徑問題：iOS WKWebView 需要完整的絕對路徑，但 JavaScript 無法直接獲取 bundle 路徑。

### 第四步：創建 Native Module（未完成）

嘗試創建 Swift Native Module 來獲取 bundle 路徑：

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

**問題**：Native Module 文件需要添加到 Xcode 項目中，手動配置複雜。

### 第五步：使用 react-native-fs（成功！）

發現項目中已經安裝了 `react-native-fs`，這個庫提供了獲取 bundle 路徑的 API！

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

#### 更新 OfflineWebView 組件

```typescript
const [loadState, setLoadState] = useState<ResourceLoadState>({
  source: 'bundled',
  uri: getInitialUri(), // 初始值
  isLoading: true,      // iOS 开始加载
  error: null,
});

// iOS: 异步获取正确的 bundle 路径
useEffect(() => {
  if (Platform.OS === 'ios') {
    getBundledH5Url()
      .then((uri) => {
        console.log('[OfflineWebView] Got iOS bundle path:', uri);
        setLoadState(prev => ({ ...prev, uri, isLoading: false }));
      })
      .catch((error) => {
        console.error('[OfflineWebView] Error:', error);
        setLoadState(prev => ({ ...prev, error: error.message, isLoading: false }));
      });
  }
}, []);
```

## 最終方案

### 完整的路徑獲取邏輯

```typescript
// src/native/BundleAssetsManager.ts
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export const getBundledH5Url = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    // Android: 使用固定路径
    return 'file:///android_asset/bundled_assets/h5/index.html';
  }

  // iOS: 获取动态 bundle 路径
  try {
    const mainBundlePath = RNFS.MainBundlePath;
    const h5IndexPath = `${mainBundlePath}/bundled_assets/h5/index.html`;

    const exists = await RNFS.exists(h5IndexPath);
    if (exists) {
      const url = `file://${h5IndexPath}`;
      console.log('[BundleAssetsManager] iOS H5 URL:', url);
      return url;
    }
  } catch (error) {
    console.error('[BundleAssetsManager] Error:', error);
  }

  throw new Error('bundled_assets/h5/index.html not found');
};
```

### 生成的路徑示例

```bash
# Android
file:///android_asset/bundled_assets/h5/index.html

# iOS (动态生成)
file:///var/containers/Bundle/Application/EB3A4C8D-9A2F-4C3E-8B1D-7F9E6A5C8D4B/AwesomeProject.app/bundled_assets/h5/index.html
```

## 技術總結

### iOS 與 Android 文件路徑差異

| 平台 | 資源位置 | URL 格式 |
|:-----|---------|---------|
| **Android** | `assets/` 目錄 | `file:///android_asset/...` (固定) |
| **iOS** | App Bundle 內 | `file:///完整絕對路徑` (動態) |

### WKWebView 文件訪問限制

iOS WKWebView 對文件 URL 有嚴格限制：

1. **必須使用絕對路徑**：相對路徑 `file:///bundled_assets/...` 不工作
2. **路徑必須真實存在**：iOS 不會自動解析 bundle 相對路徑
3. **需要文件存在驗證**：建議加載前檢查文件是否存在

### react-native-fs 關鍵 API

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

## 其他嘗試過的方案

### 方案 1: 加載 HTML 內容

```typescript
// 读取 HTML 字符串，设置 baseUrl
const html = await RNFS.readFile(bundlePath + '/bundled_assets/h5/index.html', 'utf8');
<WebView
  source={{ html, baseUrl: `file://${bundlePath}/bundled_assets/h5/` }}
/>
```

**缺點**：相對資源路徑（CSS、JS）可能仍有問題。

### 方案 2: 使用 Native Module

創建自定義 Swift/Native Module，但需要手動配置 Xcode 項目，較為複雜。

### 方案 3: 使用 react-native-assets

專門的資源管理庫，但增加了依賴。

## 最佳實踐建議

### 1. 統一路徑獲取

```typescript
// ✅ 推荐：使用统一 API
const uri = await getBundledH5Url();
<WebView source={{ uri }} />

// ❌ 避免：硬编码平台路径
const uri = Platform.OS === 'ios'
  ? 'file:///bundled_assets/h5/index.html'
  : 'file:///android_asset/bundled_assets/h5/index.html';
```

### 2. 文件存在驗證

```typescript
const exists = await RNFS.exists(fullPath);
if (!exists) {
  throw new Error(`File not found: ${fullPath}`);
}
```

### 3. 錯誤處理

```typescript
const [error, setError] = useState<string | null>(null);

if (error) {
  return <ErrorView message={error} />;
}
```

### 4. 開發環境日誌

```typescript
if (__DEV__) {
  console.log('[OfflineWebView] Loading:', uri);
  console.log('[OfflineWebView] Bundle path:', RNFS.MainBundlePath);
}
```

## 版本信息

### 最終使用的版本

| Package | Version | 說明 |
|---------|---------|------|
| React Native | 0.73.7 | 從 0.82.1 降級 |
| React | 18.2.0 | |
| react-native-webview | ^13.x | |
| react-native-fs | ^2.20.0 | 用於獲取 bundle 路徑 |
| react-native-gesture-handler | 2.14.0 | |
| react-native-safe-area-context | 4.5.0 | |
| react-native-screens | 3.29.0 | |
| iOS | 17.5 (模擬器) | |

### 降級移除的包（新架構相關）

```json
{
  "react-native-reanimated": "~3.10.1",     // ❌ 移除
  "@react-native-community/netinfo": "^11.4.1", // ❌ 新架构依赖
  "react-native-mmkv": "^2.12.2",           // ❌ TurboModule
  // ... 其他新架构相关包
}
```

## 參考資料

- [react-native-fs Documentation](https://github.com/itinance/react-native-fs)
- [react-native-webview Local Files](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#local-files)
- [WKWebView and File URLs](https://developer.apple.com/documentation/webkit/wkwebview)

## 總結

這個問題的核心在於 **iOS 需要完整的絕對文件路徑**，而 JavaScript 無法直接獲取 bundle 路徑。解決思路是：

1. 發現 `react-native-fs` 已提供 `MainBundlePath` API
2. 構造完整的絕對路徑
3. 使用 `file://` 協議前綴

相比創建自定義 Native Module，使用現成的 `react-native-fs` 更加簡潔高效。這也提醒我們：在遇到問題時，先檢查項目現有依賴，避免重復造輪。
