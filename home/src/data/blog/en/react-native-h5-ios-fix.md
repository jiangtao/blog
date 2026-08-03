---
title: "iOS Pitfalls in Offline H5 Loading for Containerized React Native Apps"
pubDatetime: 2026-02-25T14:00:00.000Z
tags:
  - "Containerization"
  - "react-native"
  - "ios"
  - "webview"
  - "troubleshooting"
draft: false
description: "A troubleshooting guide for offline H5 loading in iOS React Native containers, from NSURL errors to resolving the bundle path with react-native-fs."
cover: /images/i18n/en/blog-covers/react-native-h5-ios-fix-cover.svg
locale: en
translationKey: react-native-h5-ios-fix
---
## Problem background

In the React Native container application, we need to implement the offline loading function of H5 pages. The requirements are simple:

- Package H5 resources into app bundle
- Load local HTML files using WebView
- Supports Android and iOS dual platforms

Android platform implemented successfully, but iOS encountered `NSURLErrorBadURL (-1100)` error.

### Version Selection: Why downgrade from RN 0.82.1 to 0.73.7?

The project originally used **React Native 0.82.1** but encountered an unresolved modulemap error when building for iOS:

```
error: module map file '/Users/.../RNReanimated.modulemap' not found
```

#### Issues with RN 0.82.1

| Problem | Description | Impact |
|:-----|------|------|
| **New Architecture Mandatory Dependency** | 0.82.x forces the use of New Architecture (Fabric/TurboModules) | Requires a lot of code migration |
| **Third-party library compatibility** | Modulemap configuration issues with libraries such as `react-native-reanimated` | iOS build failure |
| **Codegen configuration is complex** | Need to configure `codegenConfig` of `package.json` | Increase maintenance costs |
| **C++ dependency issue** | The C++ library that the new architecture depends on fails to be resolved in CocoaPods | Unable to build |

#### Reasons for downgrading to RN 0.73.7

After evaluation, choose to downgrade to **React Native 0.73.7**:

| Features | RN 0.73.7 | RN 0.82.1 |
|:-----|----------|-----------|
| Architecture | Old Architecture (default) | New Architecture (mandatory) |
| iOS Build | ✅ Stable | ❌ modulemap errors |
| Third-party library compatible | ✅ Good | ⚠️ Some libraries are not compatible |
| Codegen | Optional | Mandatory |
| react-native-fs | ✅ Fully compatible | ⚠️ Legacy Module (potential issues) |
| Maintenance cost | Low | High |

> **react-native-fs compatibility notes**:
>
> Although `react-native-fs` officially states that it supports all RN versions, there are potential problems in the forced new architecture environment of RN 0.82.x:
>
> - Uses Legacy Native Module system, not compatible with TurboModules
> - May receive a deprecation warning and will not be supported in future versions
> - The new architecture rendering engine (Fabric) may have compatibility issues
>
> If you insist on using RN 0.82.x, you need to find an alternative. The expo method you have tried does not work either. You need to support the adjustment from the bottom layer of the client:
> - `expo-file-system` (requires Expo SDK)
> - Custom TurboModule (high development cost)
> - Community solutions such as `react-native-fs-turbo` (unofficial)

> **Note**: If your project must use new architectural features (such as Fabric rendering, TurboModules), you will need to spend time solving modulemap configuration issues and replacing incompatible third-party libraries.

### Other issues during the downgrade process

In addition to modulemap errors, the downgrade process also encountered the following problems (more on this later):

1. **Babel configuration error** - `react-native-reanimated/plugin` reference
2. **Component registration name mismatch** - `app.json` is inconsistent with AppDelegate
3. **H5 offline loading NSURL error** - this article focuses on discussion

## Error phenomenon

WebView in iOS simulator displays:

```
Error loading page
NSURLErrorDomain Code -1100
"The requested URL was not found on this server."
```

> Error screenshot: WebView displays a red error prompt, including "NSURLErrorDomain Code -1100" and a description that the URL is not found.

## Initial configuration

### Resource file location

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

### WebView configuration

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

### Android configuration (working fine)

```typescript
const getInitialUri = (): string => {
  if (Platform.OS === 'android') {
    return 'file:///android_asset/bundled_assets/h5/index.html';
  } else if (Platform.OS === 'ios') {
    return 'file:///bundled_assets/h5/index.html';
  }
};
```

Android uses the `file:///android_asset/...` format and everything works fine.

## Troubleshooting process

### Step 1: Verify that the file exists

First confirm whether bundled assets are correctly packaged into the app bundle:

```bash
# 检查构建产物
ls -la /Users/jt/Library/Developer/Xcode/DerivedData/AwesomeProject-*/Build/Products/Debug-iphonesimulator/AwesomeProject.app/bundled_assets/h5/

# 输出：
# -rw-r--r--  1 jt  staff   858 Feb 15 21:54 index.html
# drwxr-xr-x  4 jt  staff   128 Feb 15 21:54 static
```

✅ The file does exist in the app bundle.

### Step 2: Check network permissions

Local network access has been configured in Info.plist:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

✅ Network permissions are configured correctly.

### Step 3: Try to modify the path format

#### Attempt 1: Relative path (failed)

```typescript
// ❌ 不工作
return 'file:///bundled_assets/h5/index.html';
```

#### Attempt 2: Use ./ relative path (failed)

```typescript
// ❌ 不工作
return 'file://./bundled_assets/h5/index.html';
```

#### Attempt 3: Absolute path string (failed)

```typescript
// ❌ 无法从 JS 确定动态路径
return 'file:///var/containers/Bundle/Application/.../AwesomeProject.app/bundled_assets/h5/index.html';
```

❌ Path problem: iOS WKWebView requires a complete absolute path, but JavaScript cannot directly obtain the bundle path.

### Step 4: Create Native Module (not completed)

Try creating a Swift Native Module to get the bundle path:

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

**Problem**: Native Module files need to be added to the Xcode project, and manual configuration is complicated.

### Step 5: Use react-native-fs (success!)

It was found that `react-native-fs` has been installed in the project. This library provides an API to obtain the bundle path!

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

#### Update OfflineWebView component

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

## Final plan

### Complete path acquisition logic

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

### Generated path example

```bash
# Android
file:///android_asset/bundled_assets/h5/index.html

# iOS (动态生成)
file:///var/containers/Bundle/Application/EB3A4C8D-9A2F-4C3E-8B1D-7F9E6A5C8D4B/AwesomeProject.app/bundled_assets/h5/index.html
```

## Technical summary

### Differences in file paths between iOS and Android

| Platform | Resource location | URL format |
|:-----|---------|---------|
| **Android** | `assets/` directory | `file:///android_asset/...` (fixed) |
| **iOS** | Within App Bundle | `file:///full absolute path` (dynamic) |

### WKWebView file access restrictions

iOS WKWebView has strict restrictions on file URLs:

1. **Absolute path must be used**: Relative path `file:///bundled_assets/...` does not work
2. **The path must actually exist**: iOS will not automatically resolve bundle relative paths
3. **File existence verification required**: It is recommended to check whether the file exists before loading.

### react-native-fs key API

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

## Other tried solutions

### Option 1: Load HTML content

```typescript
// 读取 HTML 字符串，设置 baseUrl
const html = await RNFS.readFile(bundlePath + '/bundled_assets/h5/index.html', 'utf8');
<WebView
  source={{ html, baseUrl: `file://${bundlePath}/bundled_assets/h5/` }}
/>
```

**Disadvantages**: Relative resource paths (CSS, JS) may still have issues.

### Option 2: Use Native Module

Create a custom Swift/Native Module, but it requires manual configuration of the Xcode project, which is more complicated.

### Option 3: Use react-native-assets

Specialized resource management library, but with added dependencies.

## Best practice recommendations

### 1. Unified path acquisition

```typescript
// ✅ 推荐：使用统一 API
const uri = await getBundledH5Url();
<WebView source={{ uri }} />

// ❌ 避免：硬编码平台路径
const uri = Platform.OS === 'ios'
  ? 'file:///bundled_assets/h5/index.html'
  : 'file:///android_asset/bundled_assets/h5/index.html';
```

### 2. File existence verification

```typescript
const exists = await RNFS.exists(fullPath);
if (!exists) {
  throw new Error(`File not found: ${fullPath}`);
}
```

### 3. Error handling

```typescript
const [error, setError] = useState<string | null>(null);

if (error) {
  return <ErrorView message={error} />;
}
```

### 4. Development environment log

```typescript
if (__DEV__) {
  console.log('[OfflineWebView] Loading:', uri);
  console.log('[OfflineWebView] Bundle path:', RNFS.MainBundlePath);
}
```

## Version information

### Final version used

| Package | Version | Description |
|---------|---------|------|
| React Native | 0.73.7 | Downgraded from 0.82.1 |
| React | 18.2.0 | |
| react-native-webview | ^13.x | |
| react-native-fs | ^2.20.0 | Used to get bundle path |
| react-native-gesture-handler | 2.14.0 | |
| react-native-safe-area-context | 4.5.0 | |
| react-native-screens | 3.29.0 | |
| iOS | 17.5 (simulator) | |

### Downgrade removed packages (related to new architecture)

```json
{
  "react-native-reanimated": "~3.10.1",     // ❌ 移除
  "@react-native-community/netinfo": "^11.4.1", // ❌ 新架构依赖
  "react-native-mmkv": "^2.12.2",           // ❌ TurboModule
  // ... 其他新架构相关包
}
```

## References

- [react-native-fs Documentation](https://github.com/itinance/react-native-fs)
- [react-native-webview Local Files](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#local-files)
- [WKWebView and File URLs](https://developer.apple.com/documentation/webkit/wkwebview)

## Summary

The core of the problem is that **iOS requires the full absolute file path**, and JavaScript cannot directly obtain the bundle path. The solution is:

1. Found that `react-native-fs` has provided `MainBundlePath` API
2. Construct a complete absolute path
3. Use the `file://` protocol prefix

Compared to creating a custom Native Module, using the ready-made `react-native-fs` is more concise and efficient. This also reminds us: when encountering a problem, first check the existing dependencies of the project to avoid reinventing the wheel.
