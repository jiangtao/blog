---
title: "Locking and Managing npm Dependency Versions"
pubDatetime: 2017-12-01T19:55:00.000Z
tags:
  - "npm"
  - "yarn"
draft: false
issue: "https://github.com/jiangtao/blog/issues/19"
description: "How npm dependency ranges, lockfiles, and package-manager practices affect reproducible front-end builds."
cover: /images/i18n/en/blog-covers/version-lock-cover.svg
locale: en
translationKey: version-lock
---
I ran into a dependency upgrade during testing after a teammate moved to a new machine and reinstalled the environment. npm makes distribution easy, but broad dependency ranges can make the same project install differently at different times. If you only need the conclusion, focus on the lockfile guidance below.

Our vue project first relied on version 2.1.8 for components and projects. In order to ensure the stability of the product, we decided to lock the version. You can refer to [this article](https://zhuanlan.zhihu.com/p/31442269), which introduces the method of framework upgrade analysis.

<!--more-->

If you are also using Vue, you may need to pay attention to the following dependencies:

```bash
  "vue-loader": "9.9.5",
  "vue-style-loader": "1.0.0",
  "vue": "2.1.8",
  "vue-template-compiler": "2.1.8"
```

Solution for this dependency upgrade:

1. Only publish compiled files

In this way, test students don't need to worry about it, and they can repackage and release it after upgrading the dependencies.

Advantages: Test students do not need to pay attention to dependency installation
Disadvantages: The output directory is filled with various versions of files, and the incremental storage repo is getting larger and larger.

2. Package node_modules directly without using package management tools, decompress the test environment, and re-release dependencies each time you upgrade.

For development, directly package `node_modules` into a tar package, decompress it during deployment, and then package and test it through `npm run test`. Generally, each node_modules for a project is packaged to dozens of M (after gzip), and then decompressed after updating the dependencies.

Advantages: No network
Disadvantages: There are some c++ npm packages that are different in different system environments, so `node_modules` under osx will not work in `Ubuntu`. Fortunately, our project does not have such a dependency package, so we can also make a solution. If there is a C++ package, you need to install a virtual environment locally, such as `vagrant` or `docker` to run the test. At this time, I always wonder, should we still develop front-end [face covering]

3. The package management tool is locked

In the development process of node, several methods have appeared to do version locking, take the following `package.json` as an example

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

In the absence of the following command, check that the vue version is `2.5.9`, and `npm outdate` has no output, which is the latest version. The following are three locked version solutions. If you think the article is long-winded, you can directly view the table comparison:

-|npm-shrinkwrap.json|package-lock.json|yarn.lock
:-:|:-:|:-:|:-:
command|npm shrinkwrap|none|none
Generation method | Requires command generation | npm installation automatically generates | yarn installation automatically generates
npm version|any|>=5.0.0|any
additional installation|none|none|yarn
Add dependency|npm i -S vue@2.1.8 && npm shrinkwrap|npm i -S vue@2.1.8|yarn add vue@2.1.8
Update|npm uni -S vue && npm I -S vue@2.5.1|npm uni -S vue&& npm i -S vue@2.5.1|yarn upgrade vue@2.5.1
remove|npm uni -S vue|npm uni -S vue|yarn remove vue
Release|Support|Not Support|Support
Offline|Not supported|Not supported|Supported
Caching|Not supported|Not supported|Supported

## npm shrinkwrap

In order to ensure that the vue version we are using is 2.2.0, delete the dependency and download it again. The following test environment parameters:

node: v6.10.2
npm: 3.10.10


`npm i vue@2.2.0 -S`, check node_modules vue version is 2.2.0

npm officially provides the `npm shrinkwrap` command to generate the `npm-shrinkwrap.json` file.

Next, add, delete, and modify dependencies to see the changes in `npm-shrinkwrap.json`

**1. Add dependencies**

`npm i vue-http@2.0.1 -S`, `npm-shrinkwrap.json` automatically adds `vue-http` and its dependencies.

**2. Delete dependencies**
`npm uni vue-http -S` will automatically delete `vue-http` and its dependencies in `npm-shrinkwrap.json` when deleting it; if you forget to add -S or -D, you will not be able to delete it, which is not smart enough.

**3. Upgrade/downgrade dependencies**

`npm up vue-http@2.0.0 -S`, upgrade dependencies, dependencies are not upgraded, `npm-shrinkwrap.json` is not updated, which is a bit useless. So if you want to update, just delete it directly through the above method and add it again.

**4. Results**

Delete node_modules, `npm i`, and the dependencies are downloaded successfully.

Advantages: npm has natural support
Disadvantages: Need to be triggered manually, update does not take effect

## yarn

Run the `npm shrinkwrap` verification logic again.

**1. Add new dependencies**

When `yarn add vue@2.2.0 vue-http@1.0.0`, the `yarn.lock` file and its related dependencies are automatically generated

**2. Delete dependencies**

`yarn remove vue-http`, automatically delete dependencies

**3. Update dependencies**

`yarn upgrade vue-http@2.0.1`, dependencies updated successfully, `yarn.lock` version updated successfully

**4. Results**

Delete node_modules, `npm i`, and the dependencies are downloaded successfully. More importantly, yarn will cache a dependency locally, stored in the $HOME/.yarn-cache directory.

The rule for storing files is: registry-package_name-version. Before downloading, it will check whether there is a hit in the cache. If there is a hit, it will be obtained directly from the local, so it is faster.

Advantages: yarn.lock can be automatically updated through the yarn command operation, and reading from the cache is fast. Supports offline mode
Disadvantages: You also need to download a yarn command

## package-lock.json

`package-lock.json` is after npm 5.0, and the corresponding node version is 8.0.0. It will automatically appear in the directory when npm is downloaded. Upgrade Node to 8.0.0 to perform the above test.

**1. Add dependencies**

`npm i vue-http@2.0.1 -S`, the automatically generated `package-lock.json` automatically adds `vue-http` and its dependencies.

**2. Delete dependencies**
`npm uni vue-http -S`, when deleting, automatically delete `vue-http` and its dependencies in `package-lock.json`; no need to add -S -D

**3. Upgrade/downgrade dependencies**

`npm up vue-http@2.0.0 -S`, upgrade dependencies, dependencies are not upgraded, `package-lock.json` is not updated. So if you want to update, just delete it directly through the above method and add it again. It’s a problem with npm update

**4. Results**

Delete node_modules, `npm i`, and the dependencies are downloaded successfully.

Advantages: npm has natural support and is relatively smart.
Disadvantages: It is only supported after npm5.0. If the node version is lower than 8.0.0, you need to download npm5 manually. In addition, `package-lock.json` cannot be sent. Therefore, it is officially stated that `package-lock.json` can be renamed to `npm-shrinkwrap.json` through `npm shrinkwrap`.

## Summary

Comparative summary, the benefits of using yarn management are that after installing a dependency, the version is locked intelligently and the download speed is fast. The packages used by yarn are also packages on npm and can be used in various node versions.

## Recommended reading

- [Migrating from npm](https://yarnpkg.com/lang/zh-hans/docs/migrating-from-npm/)
