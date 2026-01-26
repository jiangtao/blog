---
title: 搭建一个通用的脚手架
date: 2018-01-29 19:53:36
tags:
 - cli
 - Node
 - 脚手架

issue: https://github.com/jiangtao/blog/issues/23
---

在16年年底的时候，同事聊起脚手架。由于公司业务的`多样性`,前端的`灵活性`,让我们不得不思考更通用的脚手架。而不是伴随着前端技术的发展，不断的把时间花在`配置`上。于是[chef-cli](https://github.com/2046/chef-cli)诞生了。 18年年初，把过往一年的东西整理和总结下，重新增强了原有的脚手架[project-next-cli](https://github.com/ijs/project-next-cli), 不单单满足我们团队的需求，也可以满足其他人的需求。

<!--more-->

## project-next-cli

面向的目标用户：

- 公司业务杂，但有一定的积累
- 爱折腾的同学和团队
- 借助github大量开发模板开发

![image](https://github.com/ijs/project-next-cli/raw/master/project-next-cli.gif)

## 发展

从本人做前端开始（13年），前端这几年处于高速发展，主要表现：

备注：以下发展过程出现，请不要纠结出现顺序 [捂脸]

- 库/框架：jQuery, backbone， angular，react，vue
- 模块化：commonjs， AMD(CMD), UMD, es module
- 任务管理器：npm scripts,  grunt, gulp
- 模块打包工具： r.js, webpack, rollup, browserify
- css预处理器：Sass, Less, Stylus, Postcss
- 静态检查器：flow/typescript
- 测试工具：mocha，jasmine，jest，ava
- 代码检测工具：eslint，jslint

## 开发

当我们真实开发中，会遇到各种各样的业务需求（场景），根据需求和场景选用不同的技术栈，由于技术的进步和不同浏览器运行时的限制，不得不配置对应的环境等，导致我们从而满足业务需求。

画了一张图来表示，业务，配置（环境），技术之间的关系

![image](/images/dev.jpg)

### 前端配置工程师

于是明见流传了一个新的职业，前端配置工程师 O(∩_∩)O~

## 社区现状

### 专一的脚手架

社区中存在着大量的专一型框架，主要针对一个目标任务做定制。比如下列脚手架

1. [vue-cli](https://github.com/vuejs/vue-cli)

`vue-cli`提供利用vue开发`webpack`, `pwa`等模板，本文脚手架参考了`vue-cli`的实现。

2. [dva-cli](https://github.com/dvajs/dva-cli)

`dva-cli`主要针对[dva](https://github.com/dvajs/dva)开发使用的脚手架

3. [labrador](https://github.com/maichong/labrador)

`labrador`是一种`微信小程序`组件化开发框架, 虽说小程序目前已经支持组件，但该脚手架的其他特性，依旧很赞。感兴趣的可以了解。

社区中有很多优秀的专一型脚手架出现，这里不在列举。前端社区的火爆，让我辈前端汲取精华，不断前进。

### 通用脚手架

1. [yeoman](https://github.com/yeoman/yeoman)

`yeoman`是一款强壮的且有一系列工具的通用型脚手架，但yeoman发布指定package名称，和用其开发工具。具体可[点击这里查看yeoman添加生成器规则](http://yeoman.io/generators/)

## 开发初衷和目标

由于金融公司形态决定了，业务类型多样，前端技术发展迭代，为了跟进社区发展，更好的完成下列目标而诞生。

- 完成业务：专心，稳定，快速
- 团队规范：代码规范，发布流程，持续集成/交付/部署
- 沉淀：持续稳定的引入新技术
- 效益：少加班，少造轮子，完成kpi，做更有意义的事儿

## 实现准备

依托于Github，根据`Github API`来实现，如下：

1. 获取项目

```bash
curl -i https://api.github.com/orgs/project-scaffold/repos
```

2. 获取版本

```bash
curl -i https://api.github.com/repos/project-scaffold/cli/tags
```

## 具体实现逻辑

根据`github api`获取到项目列表和版本号之后，根据输入的名称，选择对应的版本下载到本地`私有仓库`，生成到执行目录下。详情流程图如下：。

![image](/images/project-flow.png)

### 下载

1. 使用

```bash
project i
```

2. 逻辑

```
Github API ===> 获取项目列表 ===> 选择一个项目 ===> 获取项目版本号 ===> 选择一个版本号 ===> 下载到本地仓库
```

若中间每一步 数据为空/文件不存在 则给予提示

3. 核心代码

```js

  // 获取github项目列表
  const repos = await repoList();

  choices = repos.map(({ name }) => name);
  answers = await inquirer.prompt([
    {
      type   : 'list',
      name   : 'repo',
      message: 'which repo do you want to install?',
      choices
    }
  ]);
  // 选择的项目
  const repo = answers.repo;

  // 项目的版本号劣币爱哦
  const tags = await tagList(repo);

  if (tags.length === 0) {
    version = '';
  } else {
    choices = tags.map(({ name }) => name);

    answers = await inquirer.prompt([
      {
        type   : 'list',
        name   : 'version',
        message: 'which version do you want to install?',
        choices
      }
    ]);
    version = answers.version;
  }
  // 下载
  await download([repo, version].join('@'));
```

### 生成项目

1. 使用

```bash
project init
```

2. 逻辑

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 输入基本信息 ===> 编译生成到临时文件 ===> 复制并重名到目标目录
```

若中间每一步 数据为空/文件不存在/生成目录已重复 则给予提示

3. 核心代码

```js

  // 获取本地仓库项目
  const list = await readdir(dirs.download);

  // 基本信息
  const answers = await inquirer.prompt([
    {
      type   : 'list',
      name   : 'scaffold',
      message: 'which scaffold do you want to init?',
      choices: list
    }, {
      type   : 'input',
      name   : 'dir',
      message: 'project name',
      // 必要的验证
      async validate(input) {
        const done = this.async();

        if (input.length === 0) {
          done('You must input project name');
          return;
        }

        const dir = resolve(process.cwd(), input);

        if (await exists(dir)) {
          done('The project name is already existed. Please change another name');
        }

        done(null, true);
      }
    }
  ]);
  const metalsmith = await rc('metalsmith');
  if (metalsmith) {
    const tmp = `${dirs.tmp}/${answers.scaffold}`;
    // 复制一份到临时目录，在临时目录编译生成
    await copy(`${dirs.download}/${answers.scaffold}`, tmp);
    await metal(answers.scaffold);
    await copy(`${tmp}/${dirs.metalsmith}`, answers.dir);
    // 删除临时目录
    await rmfr(tmp);
  } else {
    await copy(`${dirs.download}/${answers.scaffold}`, answers.dir);
  }
```

### 升级/降级版本

1. 使用

```bash
project update
```

2. 逻辑

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 获取版本信息列表 ===> 选择一个版本 ===> 覆盖原有的版本文件
```

若中间每一步 数据为空/文件不存在 则给予提示

3. 核心代码

```js
  // 获取本地仓库列表
  const list = await readdir(dirs.download);

  // 选择一个要升级的项目
  answers = await inquirer.prompt([
    {
      type   : 'list',
      name   : 'scaffold',
      message: 'which scaffold do you want to update?',
      choices: list,
      async validate(input) {
        const done = this.async();

        if (input.length === 0) {
          done('You must choice one scaffold to update the version. If not update, Ctrl+C');
          return;
        }

        done(null, true);
      }
    }
  ]);

  const repo = answers.scaffold;

  // 获取该项目的版本信息
  const tags = await tagList(repo);

  if (tags.length === 0) {
    version = '';
  } else {
    choices = tags.map(({ name }) => name);

    answers = await inquirer.prompt([
      {
        type   : 'list',
        name   : 'version',
        message: 'which version do you want to install?',
        choices
      }
    ]);
    version = answers.version;
  }
  // 下载覆盖文件
  await download([repo, version].join('@'))
```

### 配置

配置用来获取脚手架的基本设置， 如registry, type等基本信息。

1. 使用

```bash
project config set registry koajs # 设置本地仓库下载源

project config get registry # 获取本地仓库设置的属性

project config delete registry # 删除本地设置的属性
```

2. 逻辑

```
判定本地设置文件存在 ===> 读/写
```

若中间每一步 数据为空/文件不存在 则给予提示

3. 核心代码

```js
switch (action) {
    case 'get':
      console.log(await rc(k));
      console.log('');
      return true;

    case 'set':
      await rc(k, v);
      return true;

    case 'remove':
      await rc(k, v, true);
      return true;

    default:
      console.log(await rc());
```

### 搜索

搜索远程的github仓库有哪些项目列表

1. 使用

```bash

project search

```

2. 逻辑

```
获取github项目列表 ===> 输入搜索的内容 ===> 返回匹配的列表
```

若中间每一步 数据为空 则给予提示

3. 核心代码

```js
 const answers = await inquirer.prompt([
    {
      type   : 'input',
      name   : 'search',
      message: 'search repo'
    }
  ]);

  if (answers.search) {
    let list = await searchList();

    list = list
      .filter(item => item.name.indexOf(answers.search) > -1)
      .map(({ name }) => name);

    console.log('');
	  if (list.length === 0) {
		  console.log(`${answers.search} is not found`);
	  }
	  console.log(list.join('\n'));
	  console.log('');
  }
```


## 总结

以上是具体实现，该脚手架目前还有一些可以优化的地方：

1. 不同源，存储不同的文件
2. 支持离线功能

硬广：如果您觉得好用，欢迎star，也欢迎fork一块维护。
