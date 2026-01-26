title: npm依赖版本锁定和管理
date: 2017-12-01 19:55:00
tags:
 - npm
 - yarn
issue: https://github.com/jiangtao/blog/issues/19
---


前几天测试的时候遇到个问题，测试的时候出现依赖升级问题，由于测试同学是重新换了个机子，重装了环境，导致下载过程中依赖升级。npm带来便利的时候也带一些问题。如果您觉得比较啰嗦，直接看结果。

我们的vue项目最早依赖2.1.8版本做了组件和项目，为了保证产品的稳定性，决定锁死版本。可以参考[这篇文章](https://zhuanlan.zhihu.com/p/31442269)，介绍了框架升级分析的方法。

<!--more-->

如果你也是使用vue可能需要注意以下依赖：

```bash
  "vue-loader": "9.9.5",
  "vue-style-loader": "1.0.0",
  "vue": "2.1.8",
  "vue-template-compiler": "2.1.8"
```

针对这种依赖升级解决方法：

1. 只发布编译后的文件

这样测试同学就无需关心，升级依赖后再重新打包发布。

优点: 测试同学无需关注依赖安装
缺点: 产出目录充斥着各种版本的文件，增量存储repo越来越大

2. 不通过包管理工具，直接把 node_modules打包，测试环境解压，每次升级依赖重新发布

开发直接把 `node_modules` 打成tar包, 部署的时候解压然后，再通过 `npm run test`打包测试. 一般现在一个项目一个node_modules打包后几十M（gzip之后），更新依赖之后解压。

好处： 无网络
坏处： 有一些c++的npm包，在不同的系统环境下是不同的，因此在osx下的`node_modules`，在`Ubuntu`失效。 好在我们的项目没有这种依赖包，所以也可以做一种方案。若有c++的包，则需要在本地装虚拟环境，如`vagrant`或`docker`跑测试对应的环境. 每当此时心里总是在想，咱还是前端开发吗[捂脸]

3. 包管理工具锁死

node发展历程中出现了几种方式来做版本锁定, 以下面`package.json`为例

```json
{
  "name": "npm-lock",
  "version": "0.0.1",
  "description": "test dependies lock way",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "f2ecoder@vip.qq.com",
  "license": "MIT",
  "devDependencies": {},
  "dependencies": {
    "vue": "^2.2.0"
  }
}

```

没有下列命令的情况下,  查看 vue版本是 `2.5.9`, `npm outdate`没有输出，也就是最新版本。以下是三种锁定版本的方案，如果觉得文章啰嗦，可以直接查看表格比较：

-|npm-shrinkwrap.json|package-lock.json|yarn.lock
:-:|:-:|:-:|:-:
命令|npm shrinkwrap|无|无
生成方式|需要命令生成|npm安装自动生成 |yarn安装自动生成
npm版本|任意|>=5.0.0|任意
额外安装|无|无|yarn
增加依赖|npm i -S vue@2.1.8 && npm shrinkwrap|npm i -S vue@2.1.8|yarn add vue@2.1.8
更新|npm uni -S vue && npm I -S vue@2.5.1|npm uni -S vue&& npm i -S vue@2.5.1|yarn upgrade vue@2.5.1
删除|npm uni -S vue|npm uni -S vue|yarn remove vue
发布|支持|不支持|支持
离线|不支持|不支持|支持
缓存|不支持|不支持|支持

## npm shrinkwrap

为了确保我们使用的vue版本是2.2.0， 删除依赖，重新下载. 以下测试环境参数：

node: v6.10.2
npm: 3.10.10


`npm i vue@2.2.0 -S`， 查看node_modules vue版本是2.2.0

npm官方提供 `npm shrinkwrap`命令，生成 `npm-shrinkwrap.json`文件。

下面对依赖做增加，删除，修改的操作，看看 `npm-shrinkwrap.json`变化

**1. 增加依赖**

`npm  i vue-http@2.0.1 -S`, `npm-shrinkwrap.json` 自动将`vue-http`及其依赖添加进去

**2. 删除依赖**
`npm uni vue-http -S`, 删除的时候自动删除`npm-shrinkwrap.json`中的`vue-http`及其依赖； 若忘了加 -S 或 -D， 则无法删除， 不够智能。

**3. 升级/降级依赖**

`npm up vue-http@2.0.0 -S` ，升级依赖，依赖没有升级，`npm-shrinkwrap.json`无更新，略显鸡肋。所以更新的话，直接通过上述方式删除，再添加吧。

**4. 结果**

把node_modules删掉，`npm i`， 依赖完美下载成功。

优点：npm天然支持
缺点：需要手动触发，update不生效

## yarn

重新把`npm shrinkwrap`验证逻辑跑一遍.

**1. 新增依赖**

`yarn add vue@2.2.0 vue-http@1.0.0`的时候，自动生成了 `yarn.lock`文件及其相关依赖

**2. 删除依赖**

`yarn remove vue-http`, 自动删除依赖

**3. 更新依赖**

`yarn upgrade vue-http@2.0.1`， 依赖更新成功， `yarn.lock`版本更新成功

**4. 结果**

把node_modules删掉，`npm i`， 依赖完美下载成功。更重要的是， yarn会在本地缓存一份依赖，存储在 $HOME/.yarn-cache目录下，

存储文件的规则是： registry-package_name-version，下载前会检查缓存中是否命中，若命中直接从本地获取，因此速度更快。

优点: 通过yarn命令操作，可以自动更新yarn.lock，从缓存中读取速度快. 支持离线模式
缺点: 还需要在下载一个yarn命令

## package-lock.json

`package-lock.json`是npm 5.0之后, 对应的node版本是8.0.0, npm下载的时候会自动的出现在目录中. 将Node升级到8.0.0进行以上测试.

**1. 增加依赖**

`npm  i vue-http@2.0.1 -S`, 自动生成的`package-lock.json` 自动将`vue-http`及其依赖添加进去

**2. 删除依赖**
`npm uni vue-http -S`, 删除的时候，自动删除`package-lock.json`中的`vue-http`及其依赖； 不需要加 -S -D

**3. 升级/降级依赖**

`npm up vue-http@2.0.0 -S` ，升级依赖，依赖没有升级，`package-lock.json`无更新，。所以更新的话，直接通过上述方式删除，再添加吧。是npm update的问题

**4. 结果**

把node_modules删掉，`npm i`， 依赖完美下载成功。

优点：npm天然支持， 比较智能。
缺点：只有npm5.0之后支持，若低于8.0.0版本的node需要手动下载npm5. 另外`package-lock.json`不能发包。 因此官方给出可以通过 `npm shrinkwrap`把 `package-lock.json`重命名为 `npm-shrinkwrap.json`.

## 总结

对比总结，采用yarn管理，好处除了安装一个依赖之后，版本锁定智能，下载一次后速度快。yarn使用的包也是npm上的包可以在各个node版本中使用。

## 推荐阅读

- [从 npm 迁移](https://yarnpkg.com/lang/zh-hans/docs/migrating-from-npm/)
