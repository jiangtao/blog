---
title: "Implementing H5 Camera Uploads in Android WebView"
pubDatetime: 2025-02-04T14:30:00.000Z
tags:
  - "Android"
  - "WebView"
  - "File upload"
  - "FileProvider"
  - "Android development"
  - "Security Best Practices"
draft: false
description: "A complete Android WebView file-picker implementation: multiple selection, camera capture, permissions, FileProvider integration, and secure platform configuration."
cover: /images/i18n/en/blog-covers/webview-file-upload-android-cover.svg
locale: en
translationKey: webview-file-upload-android
---


> This document records in detail the process of implementing complete file selection and upload functions in Android WebView, including multi-file selection, camera photography, permission processing, etc., to solve the problem that the H5 camera function cannot be used in Android

<!--more-->

## Background issues

In Android development, H5 pages loaded by WebView often need to use the `<input type="file">` element to implement file selection and upload functions. However, Android WebView does not fully support this standard HTML feature by default, and developers need to manually implement the `onShowFileChooser` method of `WebChromeClient`.

### FAQ

1. No response when clicking `<input type="file">`
2. Only a single file can be selected, multiple selections cannot be made
3. Unable to call the camera to take pictures
4. Android 7.0+ file access permission issues
5. Dynamically created input elements cannot trigger the selector

### Target

Implement a complete WebView file selection solution, supporting:
- Multiple file selection
- Camera to take pictures (pictures and videos)
- Android 13+ Adaptation
- URI permission persistence
- Complete debug log

---

## Technical architecture

### Core components

```
WebActivity (主界面)
    ├── WebChromeClient (文件选择拦截)
    │   └── onShowFileChooser() (核心方法)
    ├── WebView (显示内容)
    ├── ValueCallback<Uri[]> (文件回调)
    └── FileProvider (文件访问)
```

### Key technical points

1. **WebChromeClient.onShowFileChooser()** - intercept file selection request
2. **FileChooserParams** - Get file selection parameters (accept type, capture mode, etc.)
3. **ValueCallback<Uri[]>** - Returns the selected file URI
4. **FileProvider** - Android 7.0+ secure file access
5. **takePersistableUriPermission()** - Persistent URI permissions

---

## Implementation steps

### Step 1: Add necessary permissions

Add permissions in `AndroidManifest.xml`:

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

**Key Notes:**
- `WRITE_EXTERNAL_STORAGE` sets `maxSdkVersion="28"` since Android 10+ no longer requires storage permissions
- Android 13+ uses new fine-grained media permissions `READ_MEDIA_*`

---

### Step 2: Configure FileProvider

Create the `res/xml/beizi_file_path.xml` file:

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

Register in `AndroidManifest.xml`:

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

### Step 3: Implement WebChromeClient

Implement complete file selection logic in `WebActivity.java`:

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

### Step 4: Add debug log

In order to facilitate troubleshooting, we have added logs with the unified prefix `[WebViewFilePicker]` in all key methods:

```bash
# 查看 WebView 文件选择相关日志
adb logcat | grep "WebViewFilePicker"
```

**Log example:**

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

### Step 5: Test Verification

#### Create test page

Create `assets/webview_file_test.html` test page:

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

#### Open the test page in the application

```kotlin
// 在 MainActivity 中添加测试入口
val testUri = Uri.parse("file:///android_asset/webview_file_test.html")
val testIntent = WebActivity.createWebActivityIntent(applicationContext, testUri)
testIntent.putExtra(WebActivity.WEB_ACTIVITY_TITLE_EXTRA, "文件选择测试")
startActivity(testIntent)
```

---

## Troubleshooting common problems

### Problem 1: No response when clicking input

**Check steps:**

1. Check the logcat log to see if `[WebViewFilePicker] ======== onShowFileChooser is called ========`

2. If there is no log, it means that the page does not trigger file selection. It may be:
   - Uses custom JavaScript bridging
   - The input element is disabled or hidden
   - The page uses a special file selection library

3. If there is a log but no pop-up window, check:
   - Whether the Intent is started correctly
   - Whether there is corresponding Activity processing

### Problem 2: Dynamically created input does not work

**Solution:**

Make sure the WebView has `JavaScriptEnabled` set:

```java
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true);
```

### Problem 3: Camera permission problem

In Android 10+, storage permission is not required but camera permission is required:

```java
// 检查相机权限
if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED) {
    ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            REQUEST_CODE_CAMERA_PERMISSION);
}
```

### Problem 4: Some websites are not working

Some websites use custom file selection implementations (such as calling native interfaces or special JS libraries), which may not be intercepted by WebView's standard onShowFileChooser.

**Check method:**

1. Remote debugging using Chrome DevTools
2. Check the Console log
3. Check whether there is JavaScript interface injection

---

## Security Best Practices

When implementing the WebView file upload function, in addition to functional implementation, security configuration is equally important. The following are system-level security configuration recommendations.

### The Importance of System Security

WebView security configuration and Android system security configuration must **cooperate for protection**. Even if WebView is configured correctly, if there are vulnerabilities at the system level, an attacker may still:

1. **Bypass App Sandbox** - Access internal app data through exported components
2. **Man-in-the-Middle Attack** - Using system network configuration flaws to intercept communications
3. **Privilege Escalation** - Gaining access to sensitive data through excessive permission requests
4. **Data Breach** - Reading application data through insecure storage configuration

### Network security configuration

Android 7.0+ introduces Network Security Config, which is recommended to be configured in `res/xml/network_security_config.xml`:

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

Quoted in `AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:allowBackup="false">  <!-- 禁止备份 -->
    ...
</application>
```

### Component export security

Ensure that the Activity containing the WebView is not accidentally exported:

```xml
<!-- ✅ 正确配置：默认不导出 -->
<activity
    android:name=".WebActivity"
    android:exported="false" />
```

### Privilege Minimization Principle

Apply for the minimum necessary permissions as needed:

```xml
<!-- 基础权限 -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- 仅当需要拍照时 -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Android 13+ 细粒度媒体权限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### FileProvider path security

When configuring the FileProvider, expose only necessary subdirectories:

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

### Sensitive data storage

For sensitive information that needs to be stored (such as tokens), use EncryptedSharedPreferences:

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

### Production environment log security

Use ProGuard/R8 to remove logs from the production environment:

```proguard
# 在 proguard-rules.pro 中配置
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
```

Or use conditional compilation:

```kotlin
if (BuildConfig.DEBUG) {
    Log.d("WebView", "Debug info: ${sanitizedInfo}")
}
```

### Safety Checklist

| Check items | Security configuration |
|--------|----------|
| Network Security | `cleartextTrafficPermitted="false"` |
| Component export | `android:exported="false"` |
| Backup protection | `android:allowBackup="false"` |
| Permission application | Minimize, use `maxSdkVersion` |
| File Access | `allowFileAccess=false` (WebView) |
| Log Security | ProGuard Removal or Conditional Compilation |

---

## Complete code listing

### Files that need to be modified

```
app/src/main/
├── AndroidManifest.xml                    # 添加权限和 FileProvider
├── java/com/qianliyouyun/ui/
│   └── WebActivity.java                   # 实现文件选择逻辑
└── res/xml/
    └── beizi_file_path.xml               # FileProvider 配置
```

### Key constants

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

## Summary

When implementing the Android WebView file upload function, you need to pay attention to the following points:

1. **Correctly implement WebChromeClient.onShowFileChooser()** - This is the core of intercepting file selection requests
2. **Configure FileProvider** - Android 7.0+ secure file access
3. **Handling Permissions** - Android 13+ uses new media permissions
4. **Persistent URI permissions** - use takePersistableUriPermission()
5. **Add detailed log** - to facilitate troubleshooting
6. **Fully tested** - covering various scenarios (single selection, multiple selection, camera, dynamic creation)
7. **System Security Configuration** - Network security configuration, component export protection, permission minimization

Through the above steps, we have implemented a complete and robust WebView file selection solution while ensuring system-level security protection.

---

## References

- [Android WebChromeClient documentation](https://developer.android.com/reference/android/webkit/WebChromeClient)
- [FileProvider Documentation](https://developer.android.com/reference/androidx/core/content/FileProvider)
- [Android storage permission changes](https://developer.android.com/about/versions/12/behavior-changes-12)
- [Network Security Configuration](https://developer.android.com/training/articles/security-config)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [WebView Security Best Practices (full version)](/docs/android/webview-security-best-practices.md)
