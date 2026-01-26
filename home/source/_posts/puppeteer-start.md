title: 从一个爬虫初识puppeteer
date: 2017-11-08 19:55:00
tags:
 - puppeteer
 - crawler
issue: https://github.com/jiangtao/blog/issues/15
---


前段时间破事群讨论问题，突然提到一个新名词 `puppeteer`，于是好奇查了下干什么的。于是一发不可收拾。

<!--more-->

## 什么是puppeteer

来自官方的介绍：

> Puppeteer是一个Node库，提供一套高度封装的API， 通过[DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)来控制[headless](https://developers.google.com/web/updates/2017/04/headless-chrome) Chrome


## 能干什么

来自官方的描述：

> 很多事情可以使用Puppeteer在浏览器中手工完成，下面是一些可以上手的例子：

* 生成屏幕快照和pdf
* 爬取单页面应用和预渲染内容
* 获取网页内容
* 全自动的form提交, UI测试, 键盘输入等等.
* 创建一个最新的，自动的测试环境。直接使用最新版本的chrome，使用最新的JavaScript和浏览器特性，跑你的测试用例
* 捕获你网站的[timeline trace](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference)， 诊断性能问题

## 爬取百度图片

爬取特定 **关键词** 搜索出来的图片，百度图片分为 首页和详情页

## 百度图片首页爬取特点

- 图片一般较小，需要过滤掉小图
- 需要滚动加载显示更多图片，需要程序自动滚动

## 百度图片详情页爬取特点

- 以图片展示框展示，需要自动点击下一页

## 图片抓取通用点

因为`Puppeteer`可以监听网络请求和响应，所以只需要在请求和响应的时候做处理即可。
为了保证图片尺寸，我们这里以响应时做处理。若读者需要快速的请求，不在乎小图啊，可以通过请求的时候来做处理，这样效率更快一点。

下面我们一块来撸一个百度图片的爬虫。 **注：** 本教程只用做演示，请大家不要搞百度呀~

## 以首页爬取来开始Puppeteer

1. 首先创建 Page 实例

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

2. 自动滚动逻辑

通过 `window.scrollBy` api控制滚动条自动滚动, 代码如下

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

这样一个滚屏的爬虫逻辑就完成了，[具体的代码请查看](https://github.com/ijs/pcralwer)，而且不需要解析dom，也不用担心网站改版之类了，生活瞬间变得美好。

## 总结

`Puppeteer`带来的是更方便的操作headless chrome, 对于前端而言，可以做更好的测试，如基本的操作测试，线上页面屏幕快照抓取和分析等等。
当然在很久之前也有类似的实现，比如 `Phantomjs`之流，`Puppeteer`相对而言使用浏览器最新的api，对前端而言上面更快。如果你又兴趣，不妨去利用`Puppeteer`做一些事儿。

您喜欢欢迎star or fork，转载请注明出处



