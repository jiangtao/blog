---
title: 搭建一個通用的腳手架
pubDatetime: 2018-01-29T19:53:36.000Z
tags:
  - cli
  - Node
  - 腳手架
draft: false
issue: 'https://github.com/jiangtao/blog/issues/23'
description: "記錄開發 Next.js CLI 工具的過程，包括命令解析、文件生成、模板系統等。"
cover: /images/i18n/zh-TW/blog-covers/project-next-cli-cover.svg
locale: zh-TW
translationKey: project-next-cli
---

在16年年底的時候，同事聊起腳手架。由於公司業務的`多樣性`,前端的`靈活性`,讓我們不得不思考更通用的腳手架。而不是伴隨著前端技術的發展，不斷的把時間花在`配置`上。於是[chef-cli](https://github.com/2046/chef-cli)誕生了。 18年年初，把過往一年的東西整理和總結下，重新增強了原有的腳手架[project-next-cli](https://github.com/ijs/project-next-cli), 不單單滿足我們團隊的需求，也可以滿足其他人的需求。

<!--more-->

## project-next-cli

面向的目標用戶：

- 公司業務雜，但有一定的積累
- 愛折騰的同學和團隊
- 借助github大量開發模板開發

![project-next-cli 介面，保留原始 GitHub 展示內容](https://github.com/ijs/project-next-cli/raw/master/project-next-cli.gif)

## 發展

從本人做前端開始（13年），前端這幾年處於高速發展，主要表現：

備注：以下發展過程出現，請不要糾結出現順序 [捂臉]

- 庫/框架：jQuery, backbone， angular，react，vue
- 模塊化：commonjs， AMD(CMD), UMD, es module
- 任務管理器：npm scripts,  grunt, gulp
- 模塊打包工具： r.js, webpack, rollup, browserify
- css預處理器：Sass, Less, Stylus, Postcss
- 靜態檢查器：flow/typescript
- 測試工具：mocha，jasmine，jest，ava
- 代碼檢測工具：eslint，jslint

## 開發

當我們真實開發中，會遇到各種各樣的業務需求（場景），根據需求和場景選用不同的技術棧，由於技術的進步和不同瀏覽器運行時的限制，不得不配置對應的環境等，導致我們從而滿足業務需求。

畫了一張圖來表示，業務，配置（環境），技術之間的關係

![業務需求、設定與開發之間的關係](/images/i18n/zh-TW/misc/project-next-cli/development-model.svg)

### 前端配置工程師

於是明見流傳了一個新的職業，前端配置工程師 O(∩_∩)O~

## 社區現狀

### 專一的腳手架

社區中存在著大量的專一型框架，主要針對一個目標任務做定制。比如下列腳手架

1. [vue-cli](https://github.com/vuejs/vue-cli)

`vue-cli`提供利用vue開發`webpack`, `pwa`等模板，本文腳手架參考了`vue-cli`的實現。

2. [dva-cli](https://github.com/dvajs/dva-cli)

`dva-cli`主要針對[dva](https://github.com/dvajs/dva)開發使用的腳手架

3. [labrador](https://github.com/maichong/labrador)

`labrador`是一種`微信小程序`組件化開發框架, 雖說小程序目前已經支持組件，但該腳手架的其他特性，依舊很贊。感興趣的可以瞭解。

社區中有很多優秀的專一型腳手架出現，這裡不在列舉。前端社區的火爆，讓我輩前端汲取精華，不斷前進。

### 通用腳手架

1. [yeoman](https://github.com/yeoman/yeoman)

`yeoman`是一款強壯的且有一系列工具的通用型腳手架，但yeoman發佈指定package名稱，和用其開發工具。具體可[點擊這裡查看yeoman添加生成器規則](http://yeoman.io/generators/)

## 開發初衷和目標

由於金融公司形態決定了，業務類型多樣，前端技術發展迭代，為了跟進社區發展，更好的完成下列目標而誕生。

- 完成業務：專心，穩定，快速
- 團隊規範：代碼規範，發佈流程，持續集成/交付/部署
- 沈澱：持續穩定的引入新技術
- 效益：少加班，少造輪子，完成kpi，做更有意義的事兒

## 實現準備

依託於Github，根據`Github API`來實現，如下：

1. 獲取項目

```bash
curl -i https://api.github.com/orgs/project-scaffold/repos
```

2. 獲取版本

```bash
curl -i https://api.github.com/repos/project-scaffold/cli/tags
```

## 具體實現邏輯

根據`github api`獲取到項目列表和版本號之後，根據輸入的名稱，選擇對應的版本下載到本地`私有倉庫`，生成到執行目錄下。詳情流程圖如下：。

![project-next-cli 的下載與初始化流程](/images/i18n/zh-TW/misc/project-next-cli/workflow.svg)

### 下載

1. 使用

```bash
project i
```

2. 邏輯

```
Github API ===> 获取项目列表 ===> 选择一个项目 ===> 获取项目版本号 ===> 选择一个版本号 ===> 下载到本地仓库
```

若中間每一步 數據為空/文件不存在 則給予提示

3. 核心代碼

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

### 生成項目

1. 使用

```bash
project init
```

2. 邏輯

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 输入基本信息 ===> 编译生成到临时文件 ===> 复制并重名到目标目录
```

若中間每一步 數據為空/文件不存在/生成目錄已重復 則給予提示

3. 核心代碼

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

### 升級/降級版本

1. 使用

```bash
project update
```

2. 邏輯

```
获取本地仓库列表 ===> 选择一个本地项目 ===> 获取版本信息列表 ===> 选择一个版本 ===> 覆盖原有的版本文件
```

若中間每一步 數據為空/文件不存在 則給予提示

3. 核心代碼

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

配置用來獲取腳手架的基本設置， 如registry, type等基本信息。

1. 使用

```bash
project config set registry koajs # 设置本地仓库下载源

project config get registry # 获取本地仓库设置的属性

project config delete registry # 删除本地设置的属性
```

2. 邏輯

```
判定本地设置文件存在 ===> 读/写
```

若中間每一步 數據為空/文件不存在 則給予提示

3. 核心代碼

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

搜索遠程的github倉庫有哪些項目列表

1. 使用

```bash

project search

```

2. 邏輯

```
获取github项目列表 ===> 输入搜索的内容 ===> 返回匹配的列表
```

若中間每一步 數據為空 則給予提示

3. 核心代碼

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


## 總結

以上是具體實現，該腳手架目前還有一些可以優化的地方：

1. 不同源，存儲不同的文件
2. 支持離線功能

硬廣：如果您覺得好用，歡迎star，也歡迎fork一塊維護。
