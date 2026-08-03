---
title: vue中的mixins實踐
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - mixin
  - vue
draft: false
issue: 'https://github.com/jiangtao/blog/issues/11'
description: "Vue Mixin 實戰應用，介紹如何在項目中合理使用 Mixin 進行代碼復用。"
cover: /images/i18n/zh-TW/blog-covers/vue-mixin-apply-cover.svg
locale: zh-TW
translationKey: vue-mixin-apply
---

奇舞週刊推薦了一篇文章[Vue.js 中使用Mixin](http://zcfy.cc/article/using-mixins-in-vue-js-css-tricks-3257.html)， 用了vue大半年時間，`mixin`不知道挺慚愧。

奇舞週刊文章中已經介紹了 vue mixin。

- 官方提示謹慎使用 [global mixin](http://vuejs.org/v2/guide/mixins.html#Global-Mixin)
- 合理的場景下使用 `mixin`

這裡再補充一個 通用業務（埋點） 來描述 mixin的優缺點。 <!--more-->

## 需求

在`SPA`實現埋點需求中比較通用的需求，`進入頁面` 和 `離開頁面` 需要記錄用戶在 當前頁面的 停留時間。使用`mixin`， 簡化代碼如下

**mixin.js**
```javascript

let cache = null // 确保进入和离开是一个page

export default {
    methods: {
        sendEnterPage() {
            cache = this.$route
            console.log('enter page', cache)
        },
        sendLeavePage() {
            console.log('leave page', cache)
        }
    },
    mounted(){
        this.sendEnterPage()
    },
    destroyed() {
        this.sendLeavePage()
    }
}

```

**demo.vue**  部分代碼

```javascript
<script>
import test from 'mixins/test'
export default {
    data() {
        return { text: 'Hello World' }
    },
    mixins: [test],
    methods: {
        logic() {
            console.log('do the logic about hello page')
        }
    },
    mounted() {
        this.logic()
    }
}
```

**運行結果圖**

![外部 Vue mixin 範例，保留其原始展示內容](https://user-images.githubusercontent.com/2155745/30382229-385a8f70-9864-11e7-8fc7-01439d8a24f2.png)

從圖中發現，使用`局部mixin` 使用 `mounted`, `destroyed` 等組件中的生成週期方法與 mixin 是 合併； 當然實驗得出 methods中的方法是被覆蓋的。具體是通過 [mergeOtions function實現](https://github.com/vuejs/vue/blob/master/src/core/util/options.js)

### 好處

埋點這部分需求 與 核心業務 關聯, 代碼少，盡可能的少侵入業務。

### 壞處

`minxin`中的方法 以及實現 邏輯 其他同事不知道，不直觀。 只能通過約定和溝通來解決。

以上功能有種 “修飾” 的感覺。`es7 decorator` 支持修飾模式，當局限於 類和類的方法， vue官方提供了 [vue-class-component](https://github.com/vuejs/vue-class-component) 來解決這個問題。

在`React`當中已經廢棄了 `mixin`，使用了 [高階組件](https://juejin.im/post/595243d96fb9a06bbd6f5ccd) 來解決這個問題，其實就是支持 `class`組件，結合`decorator`來

代替mixin。 關於react理解的不對，請指出。

前端時間閒暇的時候做了一個 [vue-mount-time](https://github.com/jiangtao/vue-mount-time/) 用來記錄，第一個組件mount開始時間到 最後一個mount組件結束時間，做了一個簡單的嘗試。

## 行為統計

若需要做行為統計，可以通過 `mixin` 攔截到所有的方法， 對方法做統一收集。根據 頁面地址 +  方法名 可以 確定對應的行為，從而做到[無侵入的埋點解決方案](https://github.com/vue-tools/vue-analysis)

## 總結

本篇是對`mixin`的看法和對業務的結合點，如有不對歡迎指正，轉載請注明出處。
