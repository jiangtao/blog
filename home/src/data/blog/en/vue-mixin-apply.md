---
title: "Practical Vue Mixins"
pubDatetime: 2017-09-13T19:55:00.000Z
tags:
  - "mixin"
  - "vue"
draft: false
issue: "https://github.com/jiangtao/blog/issues/11"
description: "A practical Vue mixin pattern for shared page-lifecycle behavior, with trade-offs and implementation details."
cover: /images/i18n/en/blog-covers/vue-mixin-apply-cover.svg
locale: en
translationKey: vue-mixin-apply
---
Qiwu Weekly recommended an article [Using Mixin in Vue.js](http://zcfy.cc/article/using-mixins-in-vue-js-css-tricks-3257.html). After using Vue for more than half a year, I feel ashamed that I don’t know about `mixin`.

The vue mixin has been introduced in the Qiwu Weekly article.

- Official reminder to use [global mixin] with caution (http://vuejs.org/v2/guide/mixins.html#Global-Mixin)
- Use `mixin` in reasonable scenarios

Here is another general business (buried point) to describe the advantages and disadvantages of mixin. <!--more-->

## Requirements

A relatively common requirement among `SPA` implementation requirements, `enter page` and `leave page` need to record the user's stay time on the current page. Using `mixin`, the simplified code is as follows

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

**demo.vue** Part of the code

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

**Run result chart**

![External Vue mixin example, shown in its original context](https://user-images.githubusercontent.com/2155745/30382229-385a8f70-9864-11e7-8fc7-01439d8a24f2.png)

It is found from the figure that when using `local mixin`, the generation cycle methods in components such as `mounted` and `destroyed` are merged with the mixin; of course, the experiment shows that the methods in methods are overridden. Specifically, it is implemented through [mergeOtions function](https://github.com/vuejs/vue/blob/master/src/core/util/options.js)

### Benefits

Focus on this part of the requirements related to the core business, with less code and as little intrusion into the business as possible.

### Disadvantages

The methods and implementation logic in `minxin` are unknown to other colleagues and are not intuitive. It can only be solved through agreement and communication.

The above functions have a "modified" feeling. `es7 decorator` supports decoration mode. When limited to classes and class methods, vue officially provides [vue-class-component](https://github.com/vuejs/vue-class-component) to solve this problem.

`mixin` has been abandoned in `React`, and [high-order components](https://juejin.im/post/595243d96fb9a06bbd6f5ccd) are used to solve this problem. In fact, it supports `class` components and combines them with `decorator`

Replace mixin. Please point out if you have an incorrect understanding of react.

When the front-end was free, he made a [vue-mount-time](https://github.com/jiangtao/vue-mount-time/) to record the start time of the first component mount and the end time of the last mount component. I made a simple attempt.

## Behavior Statistics

If you need to do behavioral statistics, you can intercept all methods through `mixin` and collect the methods uniformly. The corresponding behavior can be determined based on the page address + method name, thereby achieving [non-intrusive buried point solution](https://github.com/vue-tools/vue-analysis)

## Summary

This article is a combination of your views on `mixin` and business. If there are any mistakes, please correct me. Please indicate the source when reprinting.
