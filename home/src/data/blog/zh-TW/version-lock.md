---
title: npm依賴版本鎖定和管理
pubDatetime: 2017-12-01T19:55:00.000Z
tags:
  - npm
  - yarn
draft: false
issue: 'https://github.com/jiangtao/blog/issues/19'
description: "介紹 npm 版本鎖定機制，包括 package-lock.json 的作用和最佳實踐。"
cover: /images/i18n/zh-TW/blog-covers/version-lock-cover.svg
locale: zh-TW
translationKey: version-lock
---


前幾天測試的時候遇到個問題，測試的時候出現依賴升級問題，由於測試同學是重新換了個機子，重裝了環境，導致下載過程中依賴升級。npm帶來便利的時候也帶一些問題。如果您覺得比較囉嗦，直接看結果。

我們的vue項目最早依賴2.1.8版本做了組件和項目，為了保證產品的穩定性，決定鎖死版本。可以參考[這篇文章](https://zhuanlan.zhihu.com/p/31442269)，介紹了框架升級分析的方法。

<!--more-->

如果你也是使用vue可能需要注意以下依賴：

```bash
  "vue-loader": "9.9.5",
  "vue-style-loader": "1.0.0",
  "vue": "2.1.8",
  "vue-template-compiler": "2.1.8"
```

針對這種依賴升級解決方法：

1. 只發佈編譯後的文件

這樣測試同學就無需關心，升級依賴後再重新打包發佈。

優點: 測試同學無需關注依賴安裝
缺點: 產出目錄充斥著各種版本的文件，增量存儲repo越來越大

2. 不通過包管理工具，直接把 node_modules打包，測試環境解壓，每次升級依賴重新發佈

開發直接把 `node_modules` 打成tar包, 部署的時候解壓然後，再通過 `npm run test`打包測試. 一般現在一個項目一個node_modules打包後幾十M（gzip之後），更新依賴之後解壓。

好處： 無網絡
壞處： 有一些c++的npm包，在不同的系統環境下是不同的，因此在osx下的`node_modules`，在`Ubuntu`失效。 好在我們的項目沒有這種依賴包，所以也可以做一種方案。若有c++的包，則需要在本地裝虛擬環境，如`vagrant`或`docker`跑測試對應的環境. 每當此時心裡總是在想，咱還是前端開發嗎[捂臉]

3. 包管理工具鎖死

node發展歷程中出現了幾種方式來做版本鎖定, 以下面`package.json`為例

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

沒有下列命令的情況下,  查看 vue版本是 `2.5.9`, `npm outdate`沒有輸出，也就是最新版本。以下是三種鎖定版本的方案，如果覺得文章囉嗦，可以直接查看表格比較：

-|npm-shrinkwrap.json|package-lock.json|yarn.lock
:-:|:-:|:-:|:-:
命令|npm shrinkwrap|無|無
生成方式|需要命令生成|npm安裝自動生成 |yarn安裝自動生成
npm版本|任意|>=5.0.0|任意
額外安裝|無|無|yarn
增加依賴|npm i -S vue@2.1.8 && npm shrinkwrap|npm i -S vue@2.1.8|yarn add vue@2.1.8
更新|npm uni -S vue && npm I -S vue@2.5.1|npm uni -S vue&& npm i -S vue@2.5.1|yarn upgrade vue@2.5.1
刪除|npm uni -S vue|npm uni -S vue|yarn remove vue
發佈|支持|不支持|支持
離線|不支持|不支持|支持
緩存|不支持|不支持|支持

## npm shrinkwrap

為了確保我們使用的vue版本是2.2.0， 刪除依賴，重新下載. 以下測試環境參數：

node: v6.10.2
npm: 3.10.10


`npm i vue@2.2.0 -S`， 查看node_modules vue版本是2.2.0

npm官方提供 `npm shrinkwrap`命令，生成 `npm-shrinkwrap.json`文件。

下面對依賴做增加，刪除，修改的操作，看看 `npm-shrinkwrap.json`變化

**1. 增加依賴**

`npm  i vue-http@2.0.1 -S`, `npm-shrinkwrap.json` 自動將`vue-http`及其依賴添加進去

**2. 刪除依賴**
`npm uni vue-http -S`, 刪除的時候自動刪除`npm-shrinkwrap.json`中的`vue-http`及其依賴； 若忘了加 -S 或 -D， 則無法刪除， 不夠智能。

**3. 升級/降級依賴**

`npm up vue-http@2.0.0 -S` ，升級依賴，依賴沒有升級，`npm-shrinkwrap.json`無更新，略顯雞肋。所以更新的話，直接通過上述方式刪除，再添加吧。

**4. 結果**

把node_modules刪掉，`npm i`， 依賴完美下載成功。

優點：npm天然支持
缺點：需要手動觸發，update不生效

## yarn

重新把`npm shrinkwrap`驗證邏輯跑一遍.

**1. 新增依賴**

`yarn add vue@2.2.0 vue-http@1.0.0`的時候，自動生成了 `yarn.lock`文件及其相關依賴

**2. 刪除依賴**

`yarn remove vue-http`, 自動刪除依賴

**3. 更新依賴**

`yarn upgrade vue-http@2.0.1`， 依賴更新成功， `yarn.lock`版本更新成功

**4. 結果**

把node_modules刪掉，`npm i`， 依賴完美下載成功。更重要的是， yarn會在本地緩存一份依賴，存儲在 $HOME/.yarn-cache目錄下，

存儲文件的規則是： registry-package_name-version，下載前會檢查緩存中是否命中，若命中直接從本地獲取，因此速度更快。

優點: 通過yarn命令操作，可以自動更新yarn.lock，從緩存中讀取速度快. 支持離線模式
缺點: 還需要在下載一個yarn命令

## package-lock.json

`package-lock.json`是npm 5.0之後, 對應的node版本是8.0.0, npm下載的時候會自動的出現在目錄中. 將Node升級到8.0.0進行以上測試.

**1. 增加依賴**

`npm  i vue-http@2.0.1 -S`, 自動生成的`package-lock.json` 自動將`vue-http`及其依賴添加進去

**2. 刪除依賴**
`npm uni vue-http -S`, 刪除的時候，自動刪除`package-lock.json`中的`vue-http`及其依賴； 不需要加 -S -D

**3. 升級/降級依賴**

`npm up vue-http@2.0.0 -S` ，升級依賴，依賴沒有升級，`package-lock.json`無更新，。所以更新的話，直接通過上述方式刪除，再添加吧。是npm update的問題

**4. 結果**

把node_modules刪掉，`npm i`， 依賴完美下載成功。

優點：npm天然支持， 比較智能。
缺點：只有npm5.0之後支持，若低於8.0.0版本的node需要手動下載npm5. 另外`package-lock.json`不能發包。 因此官方給出可以通過 `npm shrinkwrap`把 `package-lock.json`重命名為 `npm-shrinkwrap.json`.

## 總結

對比總結，採用yarn管理，好處除了安裝一個依賴之後，版本鎖定智能，下載一次後速度快。yarn使用的包也是npm上的包可以在各個node版本中使用。

## 推薦閱讀

- [從 npm 遷移](https://yarnpkg.com/lang/zh-hans/docs/migrating-from-npm/)
