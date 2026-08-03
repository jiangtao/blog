---
title: 將webp接入到vue項目
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - webp
  - vue
draft: false
issue: 'https://github.com/jiangtao/blog/issues/10'
description: "Vue 項目中 WebP 圖片格式支持，包括格式檢測、降級方案等。"
cover: /images/i18n/zh-TW/blog-covers/vue-webp-cover.svg
locale: zh-TW
translationKey: vue-webp
---


前段時間和朋友聊天，無意間問了一個`vue`移動端項目優化。針對老的項目怎麼提升更好的性能。本人這方面經驗不足，忙裡偷閒研究了下淘寶，聚划算等網站。

通過`network`抓包，對比分析得出幾個顯著的區別

<!--more-->

## 調研結果

- 支持webp，優先使用webp
- 滾動加載圖片
- 資源離線存儲

## webp

騰訊isux寫了篇文章介紹webp，感興趣同學可以[查閱](https://isux.tencent.com/introduction-of-webp.html)， 總體來說，
同等質量的圖片webp較小. 那麼，如何接入webp到vue項目中。

### 接入webp，得先有webp

生成webp的幾種方式：

#### 本地生成webp，上傳到cdn

google提供了 `CWebp` 工具，方便開發者使用。
在現在的vue/react項目中， 以`webpack`做構建的項目居多，為了更方便的在webpack構建中接入webp，一個叫 [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) 的插件誕生，感興趣可以查閱源碼。 該插件生成webp為：**編譯後的圖.webp** ， 如
`vue.e3e41b1.jpg` ， `vue.e3e41b1.jpg.webp`。 將生成後的圖片上傳到cdn即可

#### cdn支持

cdn支持webp。圖片上傳到cdn之後，直接通過url規則訪問圖片即可得到webp

#### 通過service worker支持

使用service worker攔截請求，改變圖片的`content-type`為webp，使用瀏覽器對webp天然壓縮做支持。 [聲享](https://ppt.baomitu.com/) 是通過這種方式實現的。

### 滾動加載圖片

當我們有了原圖和webp地址後，可以做進一步優化。滾動條**滾動到可視區域內顯示圖片** 。考慮到要做 **webp的兼容方案**，需要“動態"處理，在vue自定義一個 `Image` 重寫現有的img功能，支持以下功能：

1. 根據webp支持程度，引用對應的圖片

2. 支持lazyload

於是封裝了vue image組件[vt-image](https://github.com/vue-tools/vt-image)， 旨在提升圖片的性能。感興趣可以查閱源碼. 點擊可查看[Demo](https://vue-tools.github.io/vt-image/#/demo)

通過js判定支持webp：

```javascript
function detectWebp() {
    var canvas, supportCanvas

    canvas = document.createElement('canvas')
    supportCanvas = canvas.getContext && canvas.getContext('2d')

    if (supportCanvas) {
        canvas.width = canvas.height = 1
        return canvas.toDataURL('image/webp', 0.01).indexOf('image/webp') != -1
    } else {
        return false
    }
}
```

### 資源離線存儲

**使用 localStorage 做離線方案**

關於localStorage的可以查看[知乎這篇討論](https://www.zhihu.com/question/28467444)，詳細說明瞭利弊

**使用 service worker 做離線方案**

webpack插件[offline-plugin](https://github.com/NekR/offline-plugin)， 對webpack打包的資源做了service worker和AppCache以及兼容方案。

另外一個[serviceworker-webpack-plugin](https://github.com/oliviertassinari/serviceworker-webpack-plugin)只處理`service worker`，`sw.js`也是自己處理，自定義和擴展比較方便。可以從`chrome network`查看效果：[Demo](https://vue-tools.github.io/vt-image/#/demo)

### 總結

問題和過程往往比結論更重要，站在巨人的肩膀上，吸收優點引用到自己的項目。如果沒有符合需求的，根據 `場景`，考慮`成本`，`收益`，要麼換條路走，要麼就造個吧。

如果您覺得 [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) 和 [vt-image](https://github.com/vue-tools/vt-image) 對您有用，star 和 提issue 將是對作者最好的鼓勵。

感謝您花了寶貴的時間閱讀，如有錯誤，歡迎指正。

轉載請注明出處，謝謝！
