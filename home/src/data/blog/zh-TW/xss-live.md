---
title: xss live學習總結
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - xss
draft: false
issue: 'https://github.com/jiangtao/blog/issues/7'
description: "前端安全：XSS 攻擊與防護，介紹常見的 XSS 攻擊方式和防禦措施。"
cover: /images/i18n/zh-TW/blog-covers/xss-live-cover.svg
locale: zh-TW
translationKey: xss-live
---

朋友組織了一場`xss` live，`安全`一直是開發中不可忽視的一部分。而`xss`作為web開發中最常見的攻擊手段，防範是必然的。基於**web瀏覽器tricks**，**JavaScript的發展**，**npm等開源項目漏洞**，**web注入**等會讓開發者越來越防不勝防。

本次總結基於耗子的[xss-demo](https://github.com/haozime/xss-demo)，以及自己對xss的理解和知識的吸收。感興趣的同學可以先去試試，這裡就不在累贅提供答案了。 歡迎探討更多`Web安全`相關話題。

<!--more-->

### 插入執行標籤

* script
* img onerror觸發
* iframe srcdoc觸發

### 標籤等提前閉合(截斷)

* 如在`富文本`, `input`, `textarea`, 可編輯`div`等，對應xss-demo [0x01](https://xss.haozi.me/#/0x01), [0x02](https://xss.haozi.me/#/0x02)

* style標籤

```
<style>
</style ><script>alert(1)</script>
</style>
```

* 注釋提前閉合[0x05](https://xss.haozi.me/#/0x05)
```
--!><script>alert(1)</script>
```
* input type重寫[0x06](https://xss.haozi.me/#/0x06)

input的type，在type之前可以重寫為image，通過`onerror`注入

### ES6 tag標籤

```
<script>alert`1`</script>
```

### 轉義字符仍可執行

* script標籤可執行 `base64`的html代碼片段
* onerror可執行 轉義為 html 10進制， 16進制的代碼片段
* url轉義為 html 10進制， 16進制 仍可執行, url的定義可獲取其他域下的資源文件

```
scheme:[//[user:password@]host[:port]][/]path[?query][#fragment]
```
### svg不閉合也執行

查看 [0x07](https://xss.haozi.me/#/0x07)

### 正則替換不靠譜

* 正則替換 [0x0C](https://xss.haozi.me/#/0x0C)
* 正則命中 [0x0E](https://xss.haozi.me/#/0x0E)
* //追加執行，正則替換失效 [0x0F](https://xss.haozi.me/#/0x0F)

### 防護

* [配置安全頭](https://imququ.com/post/web-security-and-response-header.html)
* [xss監控](http://fex.baidu.com/blog/2014/06/xss-frontend-firewall-1/)
* 服務端白名單過濾

這樣總結對我更好的理解，也明白為甚麼最後是通過替換不同的字符來做處理。 `Web安全`路很長，需要持續關注。
