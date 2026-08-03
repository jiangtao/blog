---
title: 從一個爬蟲初識puppeteer
pubDatetime: 2017-11-08T19:55:00.000Z
tags:
  - puppeteer
  - crawler
draft: false
issue: 'https://github.com/jiangtao/blog/issues/15'
description: "Puppeteer 入門指南，介紹如何使用 Puppeteer 進行網頁自動化操作、爬蟲開發等。"
cover: /images/i18n/zh-TW/blog-covers/puppeteer-start-cover.svg
locale: zh-TW
translationKey: puppeteer-start
---


前段時間破事群討論問題，突然提到一個新名詞 `puppeteer`，於是好奇查了下幹甚麼的。於是一髮不可收拾。

<!--more-->

## 甚麼是puppeteer

來自官方的介紹：

> Puppeteer是一個Node庫，提供一套高度封裝的API， 通過[DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)來控制[headless](https://developers.google.com/web/updates/2017/04/headless-chrome) Chrome


## 能幹甚麼

來自官方的描述：

> 很多事情可以使用Puppeteer在瀏覽器中手工完成，下面是一些可以上手的例子：

* 生成屏幕快照和pdf
* 爬取單頁面應用和預渲染內容
* 獲取網頁內容
* 全自動的form提交, UI測試, 鍵盤輸入等等.
* 創建一個最新的，自動的測試環境。直接使用最新版本的chrome，使用最新的JavaScript和瀏覽器特性，跑你的測試用例
* 捕獲你網站的[timeline trace](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference)， 診斷性能問題

## 爬取百度圖片

爬取特定 **關鍵詞** 搜索出來的圖片，百度圖片分為 首頁和詳情頁

## 百度圖片首頁爬取特點

- 圖片一般較小，需要過濾掉小圖
- 需要滾動加載顯示更多圖片，需要程序自動滾動

## 百度圖片詳情頁爬取特點

- 以圖片展示框展示，需要自動點擊下一頁

## 圖片抓取通用點

因為`Puppeteer`可以監聽網絡請求和響應，所以只需要在請求和響應的時候做處理即可。
為了保證圖片尺寸，我們這裡以響應時做處理。若讀者需要快速的請求，不在乎小圖啊，可以通過請求的時候來做處理，這樣效率更快一點。

下面我們一塊來擼一個百度圖片的爬蟲。 **注：** 本教程只用做演示，請大家不要搞百度呀~

## 以首頁爬取來開始Puppeteer

1. 首先創建 Page 實例

```javascript
  const browser = await puppeteer.launch({
    headless: false
  })
  const page = await browser.newPage()
  // 若需要request， 把事件改成 request 即可，但拿到的是request的信息
  page.on('response', async(data) => {
    // 判定拿到的数据是否是图片， 也可以根据url规则挑选出自己想要的url
    if (isDownloadImageByResponse(data)) {
      // 下载图片逻辑
    }
  })
```

2. 自動滾動邏輯

通過 `window.scrollBy` api控制滾動條自動滾動, 代碼如下

```javascript
module.exports = async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      try {
        let lastScroll = 0
        const maxScroll = Number.MAX_SAFE_INTEGER
        const interval = setInterval(() => {
          window.scrollBy(0, 100)
          const scrollTop = document.documentElement.scrollTop
          if (scrollTop === maxScroll || lastScroll === scrollTop) {
            clearInterval(interval)
            resolve()
          } else {
            lastScroll = scrollTop
          }
        }, 100)
      } catch (err) {
        reject(err.toString())
      }
    })
  })
}
```

這樣一個滾屏的爬蟲邏輯就完成了，[具體的代碼請查看](https://github.com/ijs/pcralwer)，而且不需要解析dom，也不用擔心網站改版之類了，生活瞬間變得美好。

## 總結

`Puppeteer`帶來的是更方便的操作headless chrome, 對於前端而言，可以做更好的測試，如基本的操作測試，線上頁面屏幕快照抓取和分析等等。
當然在很久之前也有類似的實現，比如 `Phantomjs`之流，`Puppeteer`相對而言使用瀏覽器最新的api，對前端而言上面更快。如果你又興趣，不妨去利用`Puppeteer`做一些事兒。

您喜歡歡迎star or fork，轉載請注明出處
