---
title: H5拍照功能Android中无法使用
date: 2025-02-04 14:30:00
tags: [Android, WebView, 文件上传, FileProvider]
categories: [Android开发]
cover: /images/misc/webview-file-upload/webview-file-upload-cover.svg
---

# Android WebView 文件上传功能完整实现指南

> 本文档详细记录了在 Android WebView 中实现完整的文件选择和上传功能的过程，包括多文件选择、相机拍照、权限处理等。

## 背景问题

在 Android 开发中，WebView 加载的 H5 页面经常需要使用 `<input type="file">` 元素来实现文件选择和上传功能。然而，Android WebView 默认并不完全支持这个标准 HTML 特性，需要开发者手动实现 `WebChromeClient` 的 `onShowFileChooser` 方法。

### 常见问题

1. 点击 `<input type="file">` 没有任何响应
2. 只能选择单个文件，无法多选
3. 无法调用相机拍照
4. Android 7.0+ 文件访问权限问题
5. 动态创建的 input 元素无法触发选择器

### 目标

实现一个完整的 WebView 文件选择解决方案，支持：
- 多文件选择
- 相机拍照（图片和视频）
- Android 13+ 适配
- URI 权限持久化
- 完整的调试日志

---

## 技术架构

### 核心组件

```
WebActivity (主界面)
    ├── WebChromeClient (文件选择拦截)
    │   └── onShowFileChooser() (核心方法)
    ├── WebView (显示内容)
    ├── ValueCallback<Uri[]> (文件回调)
    └── FileProvider (文件访问)
```

### 关键技术点

1. **WebChromeClient.onShowFileChooser()** - 拦截文件选择请求
2. **FileChooserParams** - 获取文件选择参数（accept 类型、capture 模式等）
3. **ValueCallback<Uri[]>** - 返回选中的文件 URI
4. **FileProvider** - Android 7.0+ 安全文件访问
5. **takePersistableUriPermission()** - 持久化 URI 权限

---

## 实现步骤

### 第一步：添加必要的权限

在 `AndroidManifest.xml` 中添加权限：

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

**关键说明：**
- `WRITE_EXTERNAL_STORAGE` 设置 `maxSdkVersion="28"`，因为 Android 10+ 不再需要存储权限
- Android 13+ 使用新的细粒度媒体权限 `READ_MEDIA_*`

---

### 第二步：配置 FileProvider

创建 `res/xml/beizi_file_path.xml` 文件：

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

在 `AndroidManifest.xml` 中注册：

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

### 第三步：实现 WebChromeClient

在 `WebActivity.java` 中实现完整的文件选择逻辑：

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

### 第四步：添加调试日志

为了方便排查问题，我们在所有关键方法中添加了统一前缀 `[WebViewFilePicker]` 的日志：

```bash
# 查看 WebView 文件选择相关日志
adb logcat | grep "WebViewFilePicker"
```

**日志示例：**

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

### 第五步：测试验证

#### 创建测试页面

创建 `assets/webview_file_test.html` 测试页面：

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

#### 在应用中打开测试页面

```kotlin
// 在 MainActivity 中添加测试入口
val testUri = Uri.parse("file:///android_asset/webview_file_test.html")
val testIntent = WebActivity.createWebActivityIntent(applicationContext, testUri)
testIntent.putExtra(WebActivity.WEB_ACTIVITY_TITLE_EXTRA, "文件选择测试")
startActivity(testIntent)
```

---

## 常见问题排查

### 问题1：点击 input 没有响应

**检查步骤：**

1. 查看 logcat 日志是否出现 `[WebViewFilePicker] ======== onShowFileChooser 被调用 ========`

2. 如果没有日志，说明页面没有触发文件选择，可能是：
   - 使用了自定义的 JavaScript 桥接
   - input 元素被禁用或隐藏
   - 页面使用了特殊的文件选择库

3. 如果有日志但没有弹窗，检查：
   - Intent 是否正确启动
   - 是否有对应的 Activity 处理

### 问题2：动态创建的 input 不工作

**解决方案：**

确保 WebView 设置了 `JavaScriptEnabled`：

```java
WebSettings webSettings = webView.getSettings();
webSettings.setJavaScriptEnabled(true);
webSettings.setDomStorageEnabled(true);
```

### 问题3：相机权限问题

在 Android 10+，不需要存储权限但需要相机权限：

```java
// 检查相机权限
if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        != PackageManager.PERMISSION_GRANTED) {
    ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            REQUEST_CODE_CAMERA_PERMISSION);
}
```

### 问题4：某些网站不工作

一些网站使用了自定义的文件选择实现（如调用原生接口或特殊 JS 库），这些可能不被 WebView 的标准 onShowFileChooser 拦截。

**检查方法：**

1. 使用 Chrome DevTools 远程调试
2. 查看 Console 日志
3. 检查是否有 JavaScript 接口注入

---

## 完整代码清单

### 需要修改的文件

```
app/src/main/
├── AndroidManifest.xml                    # 添加权限和 FileProvider
├── java/com/qianliyouyun/ui/
│   └── WebActivity.java                   # 实现文件选择逻辑
└── res/xml/
    └── beizi_file_path.xml               # FileProvider 配置
```

### 关键常量

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

## 总结

实现 Android WebView 文件上传功能需要注意以下几点：

1. **正确实现 WebChromeClient.onShowFileChooser()** - 这是拦截文件选择请求的核心
2. **配置 FileProvider** - Android 7.0+ 安全访问文件
3. **处理权限** - Android 13+ 使用新的媒体权限
4. **持久化 URI 权限** - 使用 takePersistableUriPermission()
5. **添加详细日志** - 方便排查问题
6. **充分测试** - 覆盖各种场景（单选、多选、相机、动态创建）

通过以上步骤，我们实现了一个完整、健壮的 WebView 文件选择解决方案。

---

## 参考资料

- [Android WebChromeClient 文档](https://developer.android.com/reference/android/webkit/WebChromeClient)
- [FileProvider 文档](https://developer.android.com/reference/androidx/core/content/FileProvider)
- [Android 存储权限变更](https://developer.android.com/about/versions/12/behavior-changes-12)
