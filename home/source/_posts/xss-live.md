title: xss live学习总结
date: 2017-09-13 19:55:00
tags: [xss]
issue: https://github.com/jiangtao/blog/issues/7
---

朋友组织了一场`xss` live，`安全`一直是开发中不可忽视的一部分。而`xss`作为web开发中最常见的攻击手段，防范是必然的。基于**web浏览器tricks**，**JavaScript的发展**，**npm等开源项目漏洞**，**web注入**等会让开发者越来越防不胜防。

本次总结基于耗子的[xss-demo](https://github.com/haozime/xss-demo)，以及自己对xss的理解和知识的吸收。感兴趣的同学可以先去试试，这里就不在累赘提供答案了。 欢迎探讨更多`Web安全`相关话题。

<!--more-->

### 插入执行标签

* script
* img onerror触发
* iframe srcdoc触发

### 标签等提前闭合(截断)

* 如在`富文本`, `input`, `textarea`, 可编辑`div`等，对应xss-demo [0x01](https://xss.haozi.me/#/0x01), [0x02](https://xss.haozi.me/#/0x02)

* style标签

```
<style>
</style ><script>alert(1)</script>
</style>
```

* 注释提前闭合[0x05](https://xss.haozi.me/#/0x05)
```
--!><script>alert(1)</script>
```
* input type重写[0x06](https://xss.haozi.me/#/0x06)

input的type，在type之前可以重写为image，通过`onerror`注入

### ES6 tag标签

```
<script>alert`1`</script>
```

### 转义字符仍可执行

* script标签可执行 `base64`的html代码片段
* onerror可执行 转义为 html 10进制， 16进制的代码片段
* url转义为 html 10进制， 16进制 仍可执行, url的定义可获取其他域下的资源文件

```
scheme:[//[user:password@]host[:port]][/]path[?query][#fragment]
```
### svg不闭合也执行

查看 [0x07](https://xss.haozi.me/#/0x07)

### 正则替换不靠谱

* 正则替换 [0x0C](https://xss.haozi.me/#/0x0C)
* 正则命中 [0x0E](https://xss.haozi.me/#/0x0E)
* //追加执行，正则替换失效 [0x0F](https://xss.haozi.me/#/0x0F)

### 防护

* [配置安全头](https://imququ.com/post/web-security-and-response-header.html)
* [xss监控](http://fex.baidu.com/blog/2014/06/xss-frontend-firewall-1/)
* 服务端白名单过滤

这样总结对我更好的理解，也明白为什么最后是通过替换不同的字符来做处理。 `Web安全`路很长，需要持续关注。

