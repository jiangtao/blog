title: vue中的mixins实践
date: 2017-09-13 19:55:00
tags:
 - mixin
 - vue
issue: https://github.com/jiangtao/blog/issues/11
---

奇舞周刊推荐了一篇文章[Vue.js 中使用Mixin](http://zcfy.cc/article/using-mixins-in-vue-js-css-tricks-3257.html)， 用了vue大半年时间，`mixin`不知道挺惭愧。

奇舞周刊文章中已经介绍了 vue mixin。

- 官方提示谨慎使用 [global mixin](http://vuejs.org/v2/guide/mixins.html#Global-Mixin)
- 合理的场景下使用 `mixin`

这里再补充一个 通用业务（埋点） 来描述 mixin的优缺点。 <!--more-->

## 需求

在`SPA`实现埋点需求中比较通用的需求，`进入页面` 和 `离开页面` 需要记录用户在 当前页面的 停留时间。使用`mixin`， 简化代码如下

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

**demo.vue**  部分代码

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

**运行结果图**

![image](https://user-images.githubusercontent.com/2155745/30382229-385a8f70-9864-11e7-8fc7-01439d8a24f2.png)

从图中发现，使用`局部mixin` 使用 `mounted`, `destroyed` 等组件中的生成周期方法与 mixin 是 合并； 当然实验得出 methods中的方法是被覆盖的。具体是通过 [mergeOtions function实现](https://github.com/vuejs/vue/blob/master/src/core/util/options.js)

### 好处

埋点这部分需求 与 核心业务 关联, 代码少，尽可能的少侵入业务。

### 坏处

`minxin`中的方法 以及实现 逻辑 其他同事不知道，不直观。 只能通过约定和沟通来解决。

以上功能有种 “修饰” 的感觉。`es7 decorator` 支持修饰模式，当局限于 类和类的方法， vue官方提供了 [vue-class-component](https://github.com/vuejs/vue-class-component) 来解决这个问题。

在`React`当中已经废弃了 `mixin`，使用了 [高阶组件](https://juejin.im/post/595243d96fb9a06bbd6f5ccd) 来解决这个问题，其实就是支持 `class`组件，结合`decorator`来

代替mixin。 关于react理解的不对，请指出。

前端时间闲暇的时候做了一个 [vue-mount-time](https://github.com/jiangtao/vue-mount-time/) 用来记录，第一个组件mount开始时间到 最后一个mount组件结束时间，做了一个简单的尝试。

## 行为统计

若需要做行为统计，可以通过 `mixin` 拦截到所有的方法， 对方法做统一收集。根据 页面地址 +  方法名 可以 确定对应的行为，从而做到[无侵入的埋点解决方案](https://github.com/vue-tools/vue-analysis)

## 总结

本篇是对`mixin`的看法和对业务的结合点，如有不对欢迎指正，转载请注明出处。

