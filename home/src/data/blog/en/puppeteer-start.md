---
title: "Getting Started with Puppeteer and Web Crawling"
pubDatetime: 2017-11-08T19:55:00.000Z
tags:
  - "puppeteer"
  - "crawler"
draft: false
issue: "https://github.com/jiangtao/blog/issues/15"
description: "An introduction to using Puppeteer for browser automation, crawling, screenshot generation, and UI testing."
cover: /images/i18n/en/blog-covers/puppeteer-start-cover.svg
locale: en
translationKey: puppeteer-start
---
I first encountered `Puppeteer` during a group discussion and started by looking into browser crawling. That small investigation quickly turned into a broader look at browser automation.

<!--more-->

## What is puppeteer

From the official introduction:

> Puppeteer is a Node library that provides a set of highly encapsulated APIs to control [headless](https://developers.google.com/web/updates/2017/04/headless-chrome) Chrome through [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)


## What can we do?

From the official description:

> Many things can be done manually in the browser using Puppeteer. Here are some examples to get started:

* Generate screenshots and pdf
* Crawl single-page applications and pre-rendered content
* Get web content
* Fully automatic form submission, UI testing, keyboard input, etc.
* Create an up-to-date, automated testing environment. Directly use the latest version of chrome, use the latest JavaScript and browser features, and run your test cases
* Capture your website's [timeline trace](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference) to diagnose performance issues

## Crawl Baidu pictures

Crawling pictures searched for specific **keywords**, Baidu pictures are divided into homepage and details page

## Features of crawling Baidu picture homepage

- Pictures are generally small, so small pictures need to be filtered out
- Scroll loading is required to display more pictures, and the program needs to scroll automatically

## Baidu image details page crawling characteristics

- Displayed in a picture display frame, you need to automatically click the next page

## Common points for image capture

Because `Puppeteer` can monitor network requests and responses, it only needs to be processed during requests and responses.
In order to ensure the image size, we process it in response time here. If the reader needs to make a quick request and doesn't care about the small picture, he can do the processing when making the request, which will make the efficiency faster.

Let's build a Baidu image crawler together. **Note:** This tutorial is for demonstration only, please don’t engage in Baidu~

## Start Puppeteer with home page crawling

1. First create a Page instance

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

2. Automatic scrolling logic

Control the automatic scrolling of the scroll bar through the `window.scrollBy` api, the code is as follows

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

In this way, the scrolling crawler logic is completed, [please check the specific code](https://github.com/ijs/pcralwer), and there is no need to parse the DOM, and there is no need to worry about website revisions, etc., and life becomes better instantly.

## Summary

`Puppeteer` brings more convenient operation of headless chrome. For the front end, it can do better testing, such as basic operation testing, online page screenshot capture and analysis, etc.
Of course, there were similar implementations a long time ago, such as `Phantomjs` and others. `Puppeteer` relatively uses the latest API of the browser, which is faster for the front end. If you are interested, you might as well do something with `Puppeteer`.

If you like to star or fork, please indicate the source when reprinting.
