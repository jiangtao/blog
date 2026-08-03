---
title: "XSS: A Practical Learning Summary"
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - "xss"
draft: false
issue: "https://github.com/jiangtao/blog/issues/7"
description: "A front-end security primer on common XSS attack vectors, the browser behaviors that enable them, and practical defenses."
cover: /images/i18n/en/blog-covers/xss-live-cover.svg
locale: en
translationKey: xss-live
---
A friend organized an `XSS` study session. Security is a core part of web development, and XSS remains one of the most common browser-side attack classes. The examples cover browser behavior, JavaScript, open-source dependency risks, and injection surfaces so that defenses can be designed deliberately.

This summary is based on Xiaozi’s [xss-demo](https://github.com/haozime/xss-demo), as well as my own understanding and knowledge absorption of xss. Interested students can try it first, and I won’t bother to provide answers here. Welcome to discuss more `Web security` related topics.

<!--more-->

### Insert execution label

*script
* img onerror trigger
*iframe srcdoc triggered

### Tags, etc. are closed (truncated) in advance

* For example, in `rich text`, `input`, `textarea`, editable `div`, etc., corresponding to xss-demo [0x01](https://xss.haozi.me/#/0x01), [0x02](https://xss.haozi.me/#/0x02)

* style tag

```
<style>
</style ><script>alert(1)</script>
</style>
```

* Comments are closed in advance [0x05](https://xss.haozi.me/#/0x05)
```
--!><script>alert(1)</script>
```
* input type rewrite[0x06](https://xss.haozi.me/#/0x06)

The input type can be rewritten as image before type and injected through `onerror`

### ES6 tag tag

```
<script>alert`1`</script>
```

### Escape characters can still be executed

* The script tag can execute the html code snippet of `base64`
*onerror executable code fragments escaped into html decimal and hexadecimal
* The url is escaped to html decimal and hexadecimal and can still be executed. The definition of url can obtain resource files in other domains.

```
scheme:[//[user:password@]host[:port]][/]path[?query][#fragment]
```
### Execute even if svg is not closed

View [0x07](https://xss.haozi.me/#/0x07)

### Regular replacement is unreliable

* Regular replacement [0x0C](https://xss.haozi.me/#/0x0C)
* Regular hit [0x0E](https://xss.haozi.me/#/0x0E)
* //Additional execution, regular replacement is invalid [0x0F](https://xss.haozi.me/#/0x0F)

### Protection

* [Configure security header](https://imququ.com/post/web-security-and-response-header.html)
* [xss monitoring](http://fex.baidu.com/blog/2014/06/xss-frontend-firewall-1/)
* Server-side whitelist filtering

This summary gives me a better understanding, and I also understand why the final processing is done by replacing different characters. `Web security` has a long road ahead and requires continuous attention.
