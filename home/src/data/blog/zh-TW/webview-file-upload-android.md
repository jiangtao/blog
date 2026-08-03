---
title: H5拍照功能Android中無法使用
pubDatetime: 2025-02-04T14:30:00.000Z
tags:
  - Android
  - WebView
  - 文件上傳
  - FileProvider
  - Android開發
  - 安全最佳實踐
draft: false
description: "本文檔詳細記錄了在 Android WebView 中實現完整的文件選擇和上傳功能的過程，包括多文件選擇、相機拍照、權限處理，以及系統安全配置最佳實踐。"
cover: /images/i18n/zh-TW/blog-covers/webview-file-upload-android-cover.svg
locale: zh-TW
translationKey: webview-file-upload-android
---


> 本文檔詳細記錄了在 Android WebView 中實現完整的文件選擇和上傳功能的過程，包括多文件選擇、相機拍照、權限處理等,以解決 H5拍照功能Android中無法使用

<!--more-->

## 背景問題

在 Android 開發中，WebView 加載的 H5 頁面經常需要使用 `<input type="file">` 元素來實現文件選擇和上傳功能。然而，Android WebView 默認並不完全支持這個標準 HTML 特性，需要開發者手動實現 `WebChromeClient` 的 `onShowFileChooser` 方法。

### 常見問題

1. 點擊 `<input type="file">` 沒有任何響應
2. 只能選擇單個文件，無法多選
3. 無法調用相機拍照
4. Android 7.0+ 文件訪問權限問題
5. 動態創建的 input 元素無法觸發選擇器

### 目標

實現一個完整的 WebView 文件選擇解決方案，支持：
- 多文件選擇
- 相機拍照（圖片和視頻）
- Android 13+ 適配
- URI 權限持久化
- 完整的調試日誌

---

## 技術架構

### 核心組件

```
WebActivity (主界面)
    ├── WebChromeClient (文件选择拦截)
    │   └── onShowFileChooser() (核心方法)
    ├── WebView (显示内容)
    ├── ValueCallback<Uri[]> (文件回调)
    └── FileProvider (文件访问)
```

### 關鍵技術點

1. **WebChromeClient.onShowFileChooser()** - 攔截文件選擇請求
2. **FileChooserParams** - 獲取文件選擇參數（accept 類型、capture 模式等）
3. **ValueCallback<Uri[]>** - 返回選中的文件 URI
4. **FileProvider** - Android 7.0+ 安全文件訪問
5. **takePersistableUriPermission()** - 持久化 URI 權限

---

## 實現步驟

### 第一步：添加必要的權限

在 `AndroidManifest.xml` 中添加權限：

```xml
<!-- 文件读取权限（Android 12 及以下） -->
<uses-permission
    android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />

<!-- 相机权限 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Android 13+ 媒体权限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

**關鍵說明：**
- `WRITE_EXTERNAL_STORAGE` 設置 `maxSdkVersion="28"`，因為 Android 10+ 不再需要存儲權限
- Android 13+ 使用新的細粒度媒體權限 `READ_MEDIA_*`

---

### 第二步：配置 FileProvider

創建 `res/xml/beizi_file_path.xml` 文件：

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 外部存储路径 -->
    <external-files-path
        name="external_files"
        path="." />

    <!-- 缓存路径 -->
    <cache-path
        name="cache"
        path="." />

    <!-- 外部缓存路径 -->
    <external-cache-path
        name="external_cache"
        path="." />

    <!-- 文件路径 -->
    <files-path
        name="files"
        path="." />
</paths>
```

在 `AndroidManifest.xml` 中注冊：

```xml
<application>
    <provider
        android:name="androidx.core.content.FileProvider"
        android:authorities="${applicationId}.fileprovider"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
            android:name="android.support.FILE_PROVIDER_PATHS"
            android:resource="@xml/beizi_file_path" />
    </provider>
</application>
```

---

### 第三步：實現 WebChromeClient

在 `WebActivity.java` 中實現完整的文件選擇邏輯：

```java
public class WebActivity extends AppCompatActivity {
    private static final Logger LOGGER = Logger.getLogger(WebActivity.class.getName());

    // 文件选择请求码
    private static final int REQUEST_CODE_FILE_PICKER = 1;
    private static final int REQUEST_CODE_CAMERA_CAPTURE = 4;

    // 文件选择回调
    private ValueCallback<Uri[]> mFilePathCallback;

    // 相机拍照 URI
    private Uri mCameraUri;

    // 设置 WebView 的 WebChromeClient
    private void setupWebView() {
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {

                // 取消之前的回调
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }

                // 保存新的回调
                mFilePathCallback = filePathCallback;

                LOGGER.info("[WebViewFilePicker] ======== onShowFileChooser 被调用 ========");

                // 获取 accept 类型
                String[] acceptTypes = fileChooserParams.getAcceptTypes();
                LOGGER.info("[WebViewFilePicker] AcceptTypes: " + Arrays.toString(acceptTypes));

                // 检查是否启用 capture（相机）
                boolean isCaptureEnabled = fileChooserParams.isCaptureEnabled();
                LOGGER.info("[WebViewFilePicker] isCaptureEnabled: " + isCaptureEnabled);

                // 检查是否允许多选
                boolean isMultiple = fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
                LOGGER.info("[WebViewFilePicker] Mode: " + (isMultiple ? "MULTIPLE" : "SINGLE"));

                // 处理 capture 模式（优先使用相机）
                if (isCaptureEnabled) {
                    if (isOnlyChooseImg(acceptTypes)) {
                        LOGGER.info("[WebViewFilePicker] 打开相机拍照");
                        openCameraForImage();
                    } else {
                        LOGGER.info("[WebViewFilePicker] 打开相机录像");
                        openCameraForVideo();
                    }
                    return true;
                }

                // 打开文件选择器
                LOGGER.info("[WebViewFilePicker] 打开文件选择器");
                openFilePicker(acceptTypes, isMultiple);
                return true;
            }
        });
    }

    // 判断是否只选择图片
    private boolean isOnlyChooseImg(String[] acceptTypes) {
        boolean hasImage = false;
        boolean hasVideo = false;

        for (String type : acceptTypes) {
            if (type.contains("image")) {
                hasImage = true;
            }
            if (type.contains("video")) {
                hasVideo = true;
            }
        }

        return hasImage && !hasVideo;
    }

    // 打开相机拍照
    private void openCameraForImage() {
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);

        if (cameraIntent.resolveActivity(getPackageManager()) != null) {
            // 创建临时文件
            File photoFile = null;
            try {
                photoFile = createImageFile();
                mCameraUri = FileProvider.getUriForFile(
                        this,
                        getApplicationContext().getPackageName() + ".fileprovider",
                        photoFile);

                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, mCameraUri);
                startActivityForResult(cameraIntent, REQUEST_CODE_CAMERA_CAPTURE);

                LOGGER.info("[WebViewFilePicker] 相机 Intent 已启动");
            } catch (IOException ex) {
                LOGGER.error("[WebViewFilePicker] 创建图片文件失败", ex);
                mFilePathCallback.onReceiveValue(null);
                mFilePathCallback = null;
            }
        } else {
            LOGGER.warning("[WebViewFilePicker] 没有可用的相机应用");
            mFilePathCallback.onReceiveValue(null);
            mFilePathCallback = null;
        }
    }

    // 打开相机录像
    private void openCameraForVideo() {
        Intent cameraIntent = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);

        if (cameraIntent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(cameraIntent, REQUEST_CODE_CAMERA_CAPTURE);
            LOGGER.info("[WebViewFilePicker] 视频录制 Intent 已启动");
        } else {
            LOGGER.warning("[WebViewFilePicker] 没有可用的视频录制应用");
            mFilePathCallback.onReceiveValue(null);
            mFilePathCallback = null;
        }
    }

    // 打开文件选择器
    private void openFilePicker(String[] acceptTypes, boolean isMultiple) {
        Intent intent = fileChooserParams.createIntent();

        // 允许多选
        if (isMultiple) {
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }

        try {
            startActivityForResult(intent, REQUEST_CODE_FILE_PICKER);
            LOGGER.info("[WebViewFilePicker] 文件选择器 Intent 已启动");
        } catch (ActivityNotFoundException e) {
            LOGGER.error("[WebViewFilePicker] 找不到文件选择器 Activity", e);
            mFilePathCallback.onReceiveValue(null);
            mFilePathCallback = null;
        }
    }

    // 创建临时图片文件
    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "IMG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        LOGGER.info("[WebViewFilePicker] onActivityResult - requestCode: " + requestCode + ", resultCode: " + resultCode);

        Uri[] results = null;

        switch (requestCode) {
            case REQUEST_CODE_FILE_PICKER:
                results = handleFilePickerResult(resultCode, data);
                break;

            case REQUEST_CODE_CAMERA_CAPTURE:
                results = handleCameraResult(resultCode, data);
                break;
        }

        // 返回结果给 WebView
        if (mFilePathCallback != null) {
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
            LOGGER.info("[WebViewFilePicker] 文件选择结果已返回给 WebView");
        }
    }

    // 处理文件选择器结果
    private Uri[] handleFilePickerResult(int resultCode, Intent data) {
        if (resultCode != RESULT_OK || data == null) {
            LOGGER.info("[WebViewFilePicker] 文件选择被取消或失败");
            return null;
        }

        // 处理多选
        ClipData clipData = data.getClipData();
        if (clipData != null) {
            int count = clipData.getItemCount();
            Uri[] uris = new Uri[count];

            for (int i = 0; i < count; i++) {
                uris[i] = clipData.getItemAt(i).getUri();
                // 授予持久权限
                grantUriPermission(uris[i]);
            }

            LOGGER.info("[WebViewFilePicker] 选择了 " + count + " 个文件");
            return uris;
        }

        // 处理单选
        Uri uri = data.getData();
        if (uri != null) {
            grantUriPermission(uri);
            LOGGER.info("[WebViewFilePicker] 选择了 1 个文件: " + uri.toString());
            return new Uri[]{uri};
        }

        return null;
    }

    // 处理相机结果
    private Uri[] handleCameraResult(int resultCode, Intent data) {
        if (resultCode != RESULT_OK) {
            LOGGER.info("[WebViewFilePicker] 相机拍摄被取消或失败");
            return null;
        }

        // 图片拍照（使用我们设置的 mCameraUri）
        if (mCameraUri != null) {
            LOGGER.info("[WebViewFilePicker] 相机拍照成功: " + mCameraUri.toString());
            return new Uri[]{mCameraUri};
        }

        // 视频录制（从 Intent 返回的 URI）
        Uri videoUri = data != null ? data.getData() : null;
        if (videoUri != null) {
            grantUriPermission(videoUri);
            LOGGER.info("[WebViewFilePicker] 视频录制成功: " + videoUri.toString());
            return new Uri[]{videoUri};
        }

        return null;
    }

    // 授予 URI 持久权限
    private void grantUriPermission(Uri uri) {
        try {
            getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
            LOGGER.info("[WebViewFilePicker] URI 权限已授予: " + uri.toString());
        } catch (SecurityException e) {
            LOGGER.warning("[WebViewFilePicker] 无法授予 URI 权限: " + e.getMessage());
        }
    }
}
```

---

### 第四步：添加調試日誌

為了方便排查問題，我們在所有關鍵方法中添加了統一前綴 `[WebViewFilePicker]` 的日誌：

```bash
# 查看 WebView 文件选择相关日志
adb logcat | grep "WebViewFilePicker"
```

**日誌示例：**

```
[WebViewFilePicker] ======== onShowFileChooser 被调用 ========
[WebViewFilePicker] AcceptTypes: [.jpg,.jpeg,image/*]
[WebViewFilePicker] isCaptureEnabled: false
[WebViewFilePicker] Mode: MULTIPLE
[WebViewFilePicker] 打开文件选择器
[WebViewFilePicker] onActivityResult - requestCode: 1, resultCode: -1
[WebViewFilePicker] 选择了 2 个文件
[WebViewFilePicker] 文件选择结果已返回给 WebView
```

---

### 第五步：測試驗證

#### 創建測試頁面

創建 `assets/webview_file_test.html` 測試頁面：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebView 文件选择测试</title>
    <style>
        body { padding: 20px; font-family: Arial, sans-serif; }
        .test-case { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        button { padding: 10px 20px; margin: 5px; }
        input { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>WebView 文件选择功能测试</h1>

    <!-- 测试1：基本文件选择 -->
    <div class="test-case">
        <h3>测试1：基本文件选择</h3>
        <input type="file" id="basicFile">
        <p>选中文件: <span id="basicFileName">无</span></p>
    </div>

    <!-- 测试2：图片选择 -->
    <div class="test-case">
        <h3>测试2：图片选择</h3>
        <input type="file" accept="image/*" id="imageFile">
        <p>选中文件: <span id="imageFileName">无</span></p>
    </div>

    <!-- 测试3：多文件选择 -->
    <div class="test-case">
        <h3>测试3：多文件选择</h3>
        <input type="file" multiple id="multipleFile">
        <p>选中文件数: <span id="multipleFileCount">0</span></p>
    </div>

    <!-- 测试4：相机拍照 -->
    <div class="test-case">
        <h3>测试4：相机拍照</h3>
        <input type="file" accept="image/*" capture="environment" id="cameraFile">
        <p>选中文件: <span id="cameraFileName">无</span></p>
    </div>

    <!-- 测试5：动态创建 -->
    <div class="test-case">
        <h3>测试5：动态创建 Input</h3>
        <button onclick="createDynamicInput()">创建动态 Input</button>
        <div id="dynamicInputContainer"></div>
    </div>

    <script>
        // 监听文件选择
        document.getElementById('basicFile').addEventListener('change', function(e) {
            document.getElementById('basicFileName').textContent = e.target.files[0]?.name || '无';
        });

        document.getElementById('imageFile').addEventListener('change', function(e) {
            document.getElementById('imageFileName').textContent = e.target.files[0]?.name || '无';
        });

        document.getElementById('multipleFile').addEventListener('change', function(e) {
            document.getElementById('multipleFileCount').textContent = e.target.files.length;
        });

        document.getElementById('cameraFile').addEventListener('change', function(e) {
            document.getElementById('cameraFileName').textContent = e.target.files[0]?.name || '无';
        });

        // 动态创建 input
        function createDynamicInput() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            const container = document.getElementById('dynamicInputContainer');
            container.innerHTML = '';
            container.appendChild(input);

            // 模拟点击
            setTimeout(() => {
                input.click();
            }, 100);

            input.addEventListener('change', function(e) {
                alert('动态 Input 选中文件: ' + (e.target.files[0]?.name || '无'));
            });
        }

        // 页面加载日志
        console.log('[WebViewFilePicker] 测试页面已加载');
    </script>
</body>
</html>
```

#### 在應用中打開測試頁面

```kotlin
// 在 MainActivity 中添加测试入口
val testUri = Uri.parse("file:///android_asset/webview_file_test.html")
val testIntent = WebActivity.createWebActivityIntent(applicationContext, testUri)
testIntent.putExtra(WebActivity.WEB_ACTIVITY_TITLE_EXTRA, "文件选择测试")
startActivity(testIntent)
```

---

## 常見問題排查

### 問題1：點擊 input 沒有響應

**檢查步驟：**

1. 查看 logcat 日誌是否出現 `[WebViewFilePicker] ======== onShowFileChooser 被調用 ========`

2. 如果沒有日誌，說明頁面沒有觸發文件選擇，可能是：
   - 使用了自定義的 JavaScript 橋接
   - input 元素被禁用或隱藏
   - 頁面使用了特殊的文件選擇庫

3. 如果有日誌但沒有彈窗，檢查：
   - Intent 是否正確啓動
   - 是否有對應的 Activity 處理

### 問題2：動態創建的 input 不工作

**解決方案：**

確保 WebView 設置了 `JavaScriptEnabled`：

```java
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true);
```

### 問題3：相機權限問題

在 Android 10+，不需要存儲權限但需要相機權限：

```java
// 检查相机权限
if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED) {
    ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            REQUEST_CODE_CAMERA_PERMISSION);
}
```

### 問題4：某些網站不工作

一些網站使用了自定義的文件選擇實現（如調用原生接口或特殊 JS 庫），這些可能不被 WebView 的標準 onShowFileChooser 攔截。

**檢查方法：**

1. 使用 Chrome DevTools 遠程調試
2. 查看 Console 日誌
3. 檢查是否有 JavaScript 接口注入

---

## 安全最佳實踐

在實現 WebView 文件上傳功能時，除了功能實現，安全配置同樣重要。以下是系統層面的安全配置建議。

### 系統安全的重要性

WebView 安全配置和 Android 系統安全配置必須**協同防護**。即使 WebView 配置正確，如果系統層面存在漏洞，攻擊者仍可能：

1. **繞過應用沙箱** - 通過導出組件訪問應用內部數據
2. **中間人攻擊** - 利用系統網絡配置缺陷攔截通信
3. **權限提升** - 通過過度權限申請獲取敏感數據訪問
4. **數據洩露** - 通過不安全的存儲配置讀取應用數據

### 網絡安全配置

Android 7.0+ 引入了網絡安全配置 (Network Security Config)，建議在 `res/xml/network_security_config.xml` 中配置：

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 默认配置：禁止明文流量 -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- 特定域名配置：仅允许必要的 HTTP -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>

    <!-- 调试配置：仅在 DEBUG 构建中使用 -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

在 `AndroidManifest.xml` 中引用：

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:allowBackup="false">  <!-- 禁止备份 -->
    ...
</application>
```

### 組件導出安全

確保包含 WebView 的 Activity 不被意外導出：

```xml
<!-- ✅ 正确配置：默认不导出 -->
<activity
    android:name=".WebActivity"
    android:exported="false" />
```

### 權限最小化原則

按需申請最小必要權限：

```xml
<!-- 基础权限 -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- 仅当需要拍照时 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Android 13+ 细粒度媒体权限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### FileProvider 路徑安全

在配置 FileProvider 時，僅暴露必要的子目錄：

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 相机图片存储目录 -->
    <external-files-path name="pictures" path="Pictures/" />

    <!-- 缓存目录（可清理） -->
    <cache-path name="cache" path="." />
    <external-cache-path name="ext_cache" path="." />

    <!-- ⚠️ 避免使用 path="." 暴露整个目录 -->
</paths>
```

### 敏感數據存儲

對於需要存儲的敏感信息（如 token），使用 EncryptedSharedPreferences：

```kotlin
// 添加依赖：implementation "androidx.security:security-crypto:1.1.0-alpha06"
val masterKey = MasterKey.Builder(applicationContext)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    applicationContext,
    "secret_shared_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```

### 生產環境日誌安全

使用 ProGuard/R8 移除生產環境的日誌：

```proguard
# 在 proguard-rules.pro 中配置
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
```

或使用條件編譯：

```kotlin
if (BuildConfig.DEBUG) {
    Log.d("WebView", "Debug info: ${sanitizedInfo}")
}
```

### 安全檢查清單

| 檢查項 | 安全配置 |
|--------|----------|
| 網絡安全 | `cleartextTrafficPermitted="false"` |
| 組件導出 | `android:exported="false"` |
| 備份保護 | `android:allowBackup="false"` |
| 權限申請 | 最小化，使用 `maxSdkVersion` |
| 文件訪問 | `allowFileAccess=false` (WebView) |
| 日誌安全 | ProGuard 移除或條件編譯 |

---

## 完整代碼清單

### 需要修改的文件

```
app/src/main/
├── AndroidManifest.xml                    # 添加权限和 FileProvider
├── java/com/qianliyouyun/ui/
│   └── WebActivity.java                   # 实现文件选择逻辑
└── res/xml/
    └── beizi_file_path.xml               # FileProvider 配置
```

### 關鍵常量

```java
// 请求码
private static final int REQUEST_CODE_FILE_PICKER = 1;
private static final int REQUEST_CODE_CAMERA_CAPTURE = 4;

// 权限请求码
private static final int REQUEST_CODE_CAMERA_PERMISSION = 100;

// FileProvider Authority
private static final String FILE_PROVIDER_AUTHORITY =
        getApplicationContext().getPackageName() + ".fileprovider";
```

---

## 總結

實現 Android WebView 文件上傳功能需要注意以下幾點：

1. **正確實現 WebChromeClient.onShowFileChooser()** - 這是攔截文件選擇請求的核心
2. **配置 FileProvider** - Android 7.0+ 安全訪問文件
3. **處理權限** - Android 13+ 使用新的媒體權限
4. **持久化 URI 權限** - 使用 takePersistableUriPermission()
5. **添加詳細日誌** - 方便排查問題
6. **充分測試** - 覆蓋各種場景（單選、多選、相機、動態創建）
7. **系統安全配置** - 網絡安全配置、組件導出保護、權限最小化

通過以上步驟，我們實現了一個完整、健壯的 WebView 文件選擇解決方案，同時確保了系統層面的安全防護。

---

## 參考資料

- [Android WebChromeClient 文檔](https://developer.android.com/reference/android/webkit/WebChromeClient)
- [FileProvider 文檔](https://developer.android.com/reference/androidx/core/content/FileProvider)
- [Android 存儲權限變更](https://developer.android.com/about/versions/12/behavior-changes-12)
- [網絡安全配置](https://developer.android.com/training/articles/security-config)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [WebView 安全最佳實踐 (完整版)](/docs/android/webview-security-best-practices.md)
