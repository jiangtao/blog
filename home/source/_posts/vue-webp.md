title: 将webp接入到vue项目
date: 2017-09-13 19:55:00
tags:
 - webp
 - vue

issue: https://github.com/jiangtao/blog/issues/10
---

前段时间和朋友聊天，无意间问了一个`vue`移动端项目优化。针对老的项目怎么提升更好的性能。本人这方面经验不足，忙里偷闲研究了下淘宝，聚划算等网站。

通过`network`抓包，对比分析得出几个显著的区别 <!--more-->

## 调研结果

- 支持webp，优先使用webp
- 滚动加载图片
- 资源离线存储

## webp

腾讯isux写了篇文章介绍webp，感兴趣同学可以[查阅](https://isux.tencent.com/introduction-of-webp.html)， 总体来说，
同等质量的图片webp较小. 那么，如何接入webp到vue项目中。

### 接入webp，得先有webp

生成webp的几种方式：

#### 本地生成webp，上传到cdn

google提供了 `CWebp` 工具，方便开发者使用。
在现在的vue/react项目中， 以`webpack`做构建的项目居多，为了更方便的在webpack构建中接入webp，一个叫 [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) 的插件诞生，感兴趣可以查阅源码。 该插件生成webp为：**编译后的图.webp** ， 如
`vue.e3e41b1.jpg` ， `vue.e3e41b1.jpg.webp`。 将生成后的图片上传到cdn即可

#### cdn支持

cdn支持webp。图片上传到cdn之后，直接通过url规则访问图片即可得到webp

#### 通过service worker支持

使用service worker拦截请求，改变图片的`content-type`为webp，使用浏览器对webp天然压缩做支持。 [声享](https://ppt.baomitu.com/) 是通过这种方式实现的。

### 滚动加载图片

当我们有了原图和webp地址后，可以做进一步优化。滚动条**滚动到可视区域内显示图片** 。考虑到要做 **webp的兼容方案**，需要“动态"处理，在vue自定义一个 `Image` 重写现有的img功能，支持以下功能：

1. 根据webp支持程度，引用对应的图片

2. 支持lazyload

于是封装了vue image组件[vt-image](https://github.com/vue-tools/vt-image)， 旨在提升图片的性能。感兴趣可以查阅源码. 点击可查看[Demo](https://vue-tools.github.io/vt-image/#/demo)

通过js判定支持webp：

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

### 资源离线存储

**使用 localStorage 做离线方案**

关于localStorage的可以查看[知乎这篇讨论](https://www.zhihu.com/question/28467444)，详细说明了利弊

**使用 service worker 做离线方案**

webpack插件[offline-plugin](https://github.com/NekR/offline-plugin)， 对webpack打包的资源做了service worker和AppCache以及兼容方案。

另外一个[serviceworker-webpack-plugin](https://github.com/oliviertassinari/serviceworker-webpack-plugin)只处理`service worker`，`sw.js`也是自己处理，自定义和扩展比较方便。可以从`chrome network`查看效果：[Demo](https://vue-tools.github.io/vt-image/#/demo)

### 总结

问题和过程往往比结论更重要，站在巨人的肩膀上，吸收优点引用到自己的项目。如果没有符合需求的，根据 `场景`，考虑`成本`，`收益`，要么换条路走，要么就造个吧。

如果您觉得 [webp-webpack-plugin](https://github.com/jiangtao/webp-webpack-plugin) 和 [vt-image](https://github.com/vue-tools/vt-image) 对您有用，star 和 提issue 将是对作者最好的鼓励。

感谢您花了宝贵的时间阅读，如有错误，欢迎指正。

转载请注明出处，谢谢！

