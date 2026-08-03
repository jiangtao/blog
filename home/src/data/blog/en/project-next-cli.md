---
title: "Building a General-Purpose Project Scaffolding CLI"
pubDatetime: 2018-01-29T19:53:36.000Z
tags:
  - "cli"
  - "Node"
  - "scaffold"
draft: false
issue: "https://github.com/jiangtao/blog/issues/23"
description: "Design notes for a Node.js scaffolding CLI, covering command parsing, template repositories, file generation, and project initialization."
cover: /images/i18n/en/blog-covers/project-next-cli-cover.svg
locale: en
translationKey: project-next-cli
---
In late 2016, our team started discussing project scaffolding. Diverse product needs and a fast-moving front-end ecosystem made it too easy to spend time repeatedly on configuration. That led to [chef-cli](https://github.com/2046/chef-cli). In early 2018, I consolidated the previous year's work into an enhanced, more general version: [project-next-cli](https://github.com/ijs/project-next-cli).

<!--more-->

## project-next-cli

Target users:

- Teams with varied products and an existing base of reusable knowledge.
- Developers who want to experiment with reusable workflows.
- Organizations that maintain templates in GitHub repositories.

![The project-next-cli interface, shown in its original GitHub context](https://github.com/ijs/project-next-cli/raw/master/project-next-cli.gif)

## Development

Since I started working as a front-end (13 years), the front-end has been developing at a rapid pace in the past few years. The main manifestations are:

Note: The following development process appears, please do not worry about the order of appearance [face covering]

-Libraries/frameworks: jQuery, backbone, angular, react, vue
- Modularity: commonjs, AMD(CMD), UMD, es module
- Task manager: npm scripts, grunt, gulp
- Module packaging tools: r.js, webpack, rollup, browserify
- css preprocessors: Sass, Less, Stylus, Postcss
- Static checker: flow/typescript
- Testing tools: mocha, jasmine, jest, ava
- Code detection tools: eslint, jslint

## Development

When we are developing in real life, we will encounter various business needs (scenarios) and choose different technology stacks according to the needs and scenarios. Due to the advancement of technology and the limitations of different browser runtimes, we have to configure the corresponding environment, etc., so that we can meet the business needs.

Draw a picture to show the relationship between business, configuration (environment), and technology

![How business needs, configuration, and development interact](/images/i18n/en/misc/project-next-cli/development-model.svg)

### Front-end configuration engineer

So Mingjian spread a new profession, front-end configuration engineer O(∩_∩)O~

## Community status

### Dedicated scaffolding

There are a large number of specialized frameworks in the community, which are mainly customized for a target task. For example, the following scaffolding

1. [vue-cli](https://github.com/vuejs/vue-cli)

`vue-cli` provides the use of vue to develop `webpack`, `pwa` and other templates. The scaffolding in this article refers to the implementation of `vue-cli`.

2. [dva-cli](https://github.com/dvajs/dva-cli)

`dva-cli` mainly targets the scaffolding developed by [dva](https://github.com/dvajs/dva)

3. [labrador](https://github.com/maichong/labrador)

`labrador` is a component-based development framework for `WeChat Mini Programs'. Although the mini programs currently support components, other features of the scaffolding are still great. Those who are interested can learn more.

There are many excellent specialized scaffoldings in the community, which are not listed here. The popularity of the front-end community allows our front-end generation to absorb the essence and keep moving forward.

### Universal scaffolding

1. [yeoman](https://github.com/yeoman/yeoman)

`yeoman` is a powerful general-purpose scaffolding with a set of tools, but yeoman releases a specific package name and uses its development tools. For details, please [click here to view yeoman’s generator rules](http://yeoman.io/generators/)

## Original intention and goal of development

Due to the shape of a financial company, diverse business types, and iterative development of front-end technology, it was born in order to follow up on community development and better accomplish the following goals.

- Complete business: focused, stable and fast
-Team specifications: code specifications, release process, continuous integration/delivery/deployment
- Precipitation: Continuous and stable introduction of new technologies
- Benefits: work less overtime, reinvent the wheel less, complete KPIs, and do more meaningful things

## Implementation preparation

Relying on Github, it is implemented according to `Github API`, as follows:

1. Get the project

```bash
curl -i https://api.github.com/orgs/project-scaffold/repos
```

2. Get the version

```bash
curl -i https://api.github.com/repos/project-scaffold/cli/tags
```

## Specific implementation logic

After obtaining the project list and version number according to `github api`, according to the entered name, select the corresponding version to download to the local `private warehouse`, and generate it in the execution directory. The detailed flow chart is as follows:.

![project-next-cli download and initialization flow](/images/i18n/en/misc/project-next-cli/workflow.svg)

### Download

1. Use

```bash
project i
```

2. Logic

```
Github API ===> 获取项目列表 ===> 选择一个项目 ===> 获取项目版本号 ===> 选择一个版本号 ===> 下载到本地仓库
```

If the data in each step is empty/the file does not exist, a prompt will be given.

3. Core code

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

### Generate project

1. Use

```bash
project init
```

2. Logic

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 输入基本信息 ===> 编译生成到临时文件 ===> 复制并重名到目标目录
```

If the data in each step is empty/the file does not exist/the generated directory has been repeated, a prompt will be given.

3. Core code

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

### Upgrade/downgrade version

1. Use

```bash
project update
```

2. Logic

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 获取版本信息列表 ===> 选择一个版本 ===> 覆盖原有的版本文件
```

If the data in each step is empty/the file does not exist, a prompt will be given.

3. Core code

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

### Configuration

Configuration is used to obtain the basic settings of the scaffold, such as registry, type and other basic information.

1. Use

```bash
project config set registry koajs # 设置本地仓库下载源

project config get registry # 获取本地仓库设置的属性

project config delete registry # 删除本地设置的属性
```

2. Logic

```
判定本地设置文件存在 ===> 读/写
```

If the data in each step is empty/the file does not exist, a prompt will be given.

3. Core code

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

### Search

Search the remote github repository for a list of projects

1. Use

```bash

project search

```

2. Logic

```
获取github项目列表 ===> 输入搜索的内容 ===> 返回匹配的列表
```

If the data in each step is empty, a prompt will be given.

3. Core code

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


## Summary

The above is the specific implementation. There are still some areas that can be optimized in this scaffolding:

1. Different sources store different files
2. Support offline function

Hard Guang: If you think it is useful, you are welcome to star it, and you are also welcome to fork it and maintain it together.
