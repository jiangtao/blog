---
title: "Using WebP in a Vue Project"
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - "webp"
  - "vue"
draft: false
issue: "https://github.com/jiangtao/blog/issues/10"
description: "How to add WebP support to a Vue project, including image generation, fallback behavior, and CDN delivery."
cover: /images/i18n/en/blog-covers/vue-webp-cover.svg
locale: en
translationKey: vue-webp
---
While discussing performance work for an older Vue mobile project, I looked at how established commerce sites approached image delivery. This article distills that research into a practical WebP integration path.

Capture packets through `network` and compare and analyze several significant differences.

<!--more-->

## Survey results

- Support webp, use webp first
- Scroll loading of images
- Offline storage of resources

## webp

Tencent isux has written an article introducing webp. Interested students can check it out (https://isux.tencent.com/introduction-of-webp.html). Generally speaking,
Pictures of the same quality have smaller webp. So, how to connect webp to the vue project.

### To access webp, you must first have webp

Several ways to generate webp:

#### Generate webp locally and upload it to cdn

Google provides the `CWebp` tool for developers to use.
In current vue/react projects, most of them are built with `webpack`. In order to more conveniently connect webp in webpack construction, a plug-in called [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) was born. If you are interested, you can check the source code. The plug-in generates webp as: **Compiled picture.webp**, such as
`vue.e3e41b1.jpg`, `vue.e3e41b1.jpg.webp`. Upload the generated images to cdn

#### cdn support

cdn supports webp. After the image is uploaded to cdn, you can directly access the image through url rules to get webp

#### Support via service worker

Use service worker to intercept the request, change the `content-type` of the image to webp, and use the browser to support webp natural compression. [Shengxiang](https://ppt.baomitu.com/) is achieved in this way.

### Scroll to load images

When we have the original image and webp address, we can further optimize it. The scroll bar **scrolls to the visible area to display the picture**. Considering that **webp's compatibility solution** needs "dynamic" processing, a custom `Image` in vue can be rewritten to rewrite the existing img function and support the following functions:

1. According to the degree of webp support, quote the corresponding image

2. Support lazyload

So the vue image component [vt-image](https://github.com/vue-tools/vt-image) was encapsulated to improve the performance of images. If you are interested, you can check the source code. Click to view [Demo](https://vue-tools.github.io/vt-image/#/demo)

Determine support for webp through js:

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

### Resource offline storage

**Use localStorage for offline solutions**

Regarding localStorage, you can check [Zhihu this discussion](https://www.zhihu.com/question/28467444), which explains the pros and cons in detail

**Use service worker for offline solution**

The webpack plug-in [offline-plugin](https://github.com/NekR/offline-plugin) provides service worker, AppCache and compatibility solutions for resources packaged by webpack.

Another [serviceworker-webpack-plugin](https://github.com/oliviertassinari/serviceworker-webpack-plugin) only handles `service worker`, and `sw.js` is also handled by itself, which is more convenient to customize and expand. You can view the effect from `chrome network`: [Demo](https://vue-tools.github.io/vt-image/#/demo)

### Summary

Problems and processes are often more important than conclusions. Stand on the shoulders of giants and absorb the advantages and quote them into your own projects. If there is no one that meets the needs, consider the costs and benefits according to the scenario, and either find another way or build one.

If you feel that [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) and [vt-image](https://github.com/vue-tools/vt-image) are useful to you, star and issue will be the best encouragement to the author.

Thank you for taking your precious time to read. If there are any mistakes, please correct me.

Please indicate the source when reprinting, thank you!
