---
title: 編譯原理在前端應用
pubDatetime: 2022-08-18T00:00:00.000Z
tags:
  - 編譯原理
  - missile
  - 低代碼
  - AST
draft: false
description: "深入探討前端編譯原理，包括 JavaScript 解析、AST 生成、代碼轉換等核心概念。"
cover: /images/i18n/zh-TW/blog-covers/compiler-in-fe-cover.svg
locale: zh-TW
translationKey: compiler-in-fe
---


文中觀點僅代表個人學習與觀點沈澱，用於學習交流。文中涉及到任何內容，與本人呆過的所有公司無關，思路僅供參考。

> 感謝您花時間閱讀本篇文章，本篇文章主要介紹編譯原理思想在前端的應用，通過閱讀本篇文章您能瞭解到：**編譯原理概述， 編譯思想在前端工程中應用，編譯思想在低代碼平台的應用，**通過本篇文章閱讀希望可以給您在後續的工作中提供一些思路。對於編譯原理涉及到技術細節和算法，本篇文章中不再講述，感興趣的話可查閱相關資料。

<!--more-->

## 一、前言
從互聯網時代初至今， 從[Web1.0](https://zh.wikipedia.org/wiki/Web_2.0#Web_1.0)靜態展示型到 [Web2.0](https://zh.wikipedia.org/wiki/Web_2.0) 重交互型發展，軟件應用的複雜度越來越高。前端領域需進一步提高研發效率，在此過程中針對細分領域誕生了各種語言及配套工具。而在這些工具中編譯原理及其思想被反復在前端中使用。有必要瞭解、學習基本原理和應用場景，來更好的解決業務問題。
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450767287.svg" alt="前端生態與工具鏈演進" loading="lazy" onerror="window.imgFallback(this)">
## 二、編譯原理概述
### 2.1 甚麼是編譯原理

- **編譯原理：**我們當前使用的程序設計語言（如 C， Java等）有別於早期的機器語言，**在一個程序可運行之前首先被翻譯成一種能夠被計算機理解的機器碼， **這部分工作通常由編譯器（compiler）或解釋器（interpreter）。而編譯原理是計算機專業的一門重要專業課，旨在介紹**編譯構造**的一般原理和基本方法。內容包括語言和文法、詞法分析、語法分析、語法制導翻譯、中間代碼生成、存儲管理、代碼優化和目標代碼生成。

- **編譯器和解釋器**
   - **編程語言： **編程語言分為兩種：一種是靜態類型，如（C++，Go等），都需要提前編譯 **（AOT）** 成機器碼然後執行，這個過程主要使用**編譯器**來完成；一種是動態類型，如JavaScript、Python等，只在運行時進行編譯執行 **（JIT）** ，這個過程通過解釋器完成。靜態類型語言運行時不需要在進行編譯，執行效率較快；動態語言因邊解釋邊執行，調試較方便。

   - **編譯器主要工作階段：**
      - <img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450768758.svg" alt="編譯器處理管線" loading="lazy" onerror="window.imgFallback(this)">
   - **解釋器主要工作階段：**
      - <img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450768986.svg" alt="直譯器執行管線" loading="lazy" onerror="window.imgFallback(this)">
### 2.2 為甚麼前端要瞭解編譯原理

- **本職工作：**JavaScript本身也屬於程序設計語言，通過瞭解 JS 執行時解釋器工作原理，可以幫助更好的理解代碼運行，優化代碼，基於JavaScript 本身做些擴展（如Flow 靜態類型檢查器，JSDoc 文檔生成等等）。

- **工程實踐：**前端發展過程中，工程實踐工具越來越多，如 CSS預處理工具 less,  JavaScript編譯器 Babel等 而大多以前端設計語言（HTML/CSS/JS）為源程序進行編譯處理，瞭解工具的編譯處理過程，可以更好的追蹤和處理問題。

- **應用領域：**把編譯思想升維，源程序為領域特定語言（DSL），編譯處理成目標程序，如低代碼平台生成多端復用應用，生成多技術棧代碼等。把編譯思想的空間維度轉移到業務場景中可能會有更大的解決思路。

## 三、在前端中的應用
編譯原理在前端中有很多應用，這裡列舉幾個常見的應用例子，便於理解。
### 3.1 JS 執行機制
JS執行機制整理流程
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450769163.svg" alt="JavaScript 執行模型" loading="lazy" onerror="window.imgFallback(this)">
#### 3.1.1 **生成抽象語法樹（AST）和執行上下文**
##### **3.1.1.1 生成抽象語法樹**
對於我們開發者而言，JavaScript 源代碼是對我們較為友好的理解，但對於編譯器來說生成抽象語法樹 AST 更好理解，好比 HTML 生成 DOM 樹瀏覽器更好理解。
生成抽象語法樹經過兩個階段
**詞法分析**
詞法解析，將一行行源代碼解析成 token 單元，所謂 token 單元是語法上不能再分的最小單元。可以通過下圖理解：
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450769508.svg" alt="從原始碼到 Token 的詞法分析" loading="lazy" onerror="window.imgFallback(this)">

上面的代碼，由關鍵字var, 標識符 name，值literal 組成。更多的 token 組成，可以通過[ast工具](https://astexplorer.net/)查看生成的 token 單元描述。
**語法分析**
根據上述生成的詞法 token 單元，根據 JS 語法規則，生成 ast。如果源碼符合語法規則，順利生成 ast。但若存在語法錯誤，這一步就會終止，並拋出一個“語法錯誤”。生成 ast 後，生成執行上下文。
```
var name = "美团"
function foo(a){
  return '我是' + a + '员工';
}
name = "meituan"
foo(name)
```
```
{
  "type": "Program",
  "start": 0,
  "end": 87,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 15,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 4,
          "end": 15,
          "id": {
            "type": "Identifier",
            "start": 4,
            "end": 8,
            "name": "name"
          },
          "init": {
            "type": "Literal",
            "start": 11,
            "end": 15,
            "value": "美团",
            "raw": "\"美团\""
          }
        }
      ],
      "kind": "var"
    },
    {
      "type": "FunctionDeclaration",
      "start": 16,
      "end": 60,
      "id": {
        "type": "Identifier",
        "start": 25,
        "end": 28,
        "name": "foo"
      },
      "expression": false,
      "generator": false,
      "async": false,
      "params": [
        {
          "type": "Identifier",
          "start": 29,
          "end": 30,
          "name": "a"
        }
      ],
      "body": {
        "type": "BlockStatement",
        "start": 31,
        "end": 60,
        "body": [
          {
            "type": "ReturnStatement",
            "start": 35,
            "end": 58,
            "argument": {
              "type": "BinaryExpression",
              "start": 42,
              "end": 57,
              "left": {
                "type": "BinaryExpression",
                "start": 42,
                "end": 50,
                "left": {
                  "type": "Literal",
                  "start": 42,
                  "end": 46,
                  "value": "我是",
                  "raw": "'我是'"
                },
                "operator": "+",
                "right": {
                  "type": "Identifier",
                  "start": 49,
                  "end": 50,
                  "name": "a"
                }
              },
              "operator": "+",
              "right": {
                "type": "Literal",
                "start": 53,
                "end": 57,
                "value": "员工",
                "raw": "'员工'"
              }
            }
          }
        ]
      }
    },
    {
      "type": "ExpressionStatement",
      "start": 61,
      "end": 77,
      "expression": {
        "type": "AssignmentExpression",
        "start": 61,
        "end": 77,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 61,
          "end": 65,
          "name": "name"
        },
        "right": {
          "type": "Literal",
          "start": 68,
          "end": 77,
          "value": "meituan",
          "raw": "\"meituan\""
        }
      }
    },
    {
      "type": "ExpressionStatement",
      "start": 78,
      "end": 87,
      "expression": {
        "type": "CallExpression",
        "start": 78,
        "end": 87,
        "callee": {
          "type": "Identifier",
          "start": 78,
          "end": 81,
          "name": "foo"
        },
        "arguments": [
          {
            "type": "Identifier",
            "start": 82,
            "end": 86,
            "name": "name"
          }
        ],
        "optional": false
      }
    }
  ],
  "sourceType": "module"
}
```
##### **3.1.1.2 生成執行上下文**
本篇文章主要圍繞編譯相關介紹進行，執行上下文這裡做簡單的介紹。
當 AST 生成後，會生成執行上下文，執行上下文是當前 JavaScript 代碼被解析和執行時所在環境的抽象概念， JavaScript 中運行任何的代碼都是在執行上下文中運行。
執行上下文生命週期為： **創建階段，執行階段，回收階段。**執行上下文創建後，會生成以下幾個指針和環境：

- **變量環境：**記錄變量、函數。在進行編譯之前會將相關變量、函數，預先存儲到變量環境中，當代碼執行時從變量環境中取出。

- **詞法環境：**有let或者const聲明的變量，編譯後存放到該函數的詞法環境

- **outer**： 指向外部作用鏈，用於維護作用域鏈關係

- **this指向:  this 和執行上下文有關，1 個執行上下文有一個this**


<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450769732.svg" alt="從 Token 到 AST 的語法分析" loading="lazy" onerror="window.imgFallback(this)">
##### 3.1.1.3 js 執行
有了**ast 和執行上下文**之後， 遇到 ignition 解析器 解析成字節碼。如果一段代碼多次觸發，會標記為 hot，觸發turboFan 編譯器，將字節碼編譯成更高效的機器碼存儲，當下次再次執行，使用優化後的機器碼執行，以此來提高 js 執行效率。
turboFan 編譯器去優化，舉個例子，當執行函數100 次 時，假設前 90次 參數為 init，第 91 次是其他類型，此時turboFan 編譯器進行去優化操作，重新回到 ignition 解析器 解析成字節碼並執行階段，去優化代價比較昂貴，在實際編碼中注意去優化操作。
### 3.2 前端工程中的應用
上述瞭解了JS執行機制，下面介紹在前端中應用例子。
#### 3.2.1 doc生成
doc生成的例子有很多經典的 [JS Doc](https://jsdoc.app/)， [Swagger API](https://swagger.io/)， [VuePress](https://vuepress.vuejs.org/zh/guide/)等。找了一個相對來說解析、處理過程較單一的場景來說明編譯思想的應用。
##### 3.2.1.1 背景
在之前工作中基於 Koa 的 [Node.js 框架](https://github.com/halojs)，有大量的 API 需要書寫，API 文檔書寫成本較高，而 Restful API 生成文檔較單一，因此需要提供一套可根據源代碼範式生成API 文檔的工具。
##### 3.2.1.2 思路
我們把 源代碼作為輸入， 最終的markdown 結果，視圖流程如下：
```
export default class ListController {
    // 获取当前用的订单信息
    @RequestUrl('/list', RequestUrl.GET)
    @RequestParam('text', 'required', '名称')
    @RequestParam('nickname', '*', '昵称')
    @RequestMock(getMockName(conf.mock.dir), conf.mock.enabled)
    async action(ctx, next) {
        ctx.body = `hello ${ctx.getParameter('text')}`
    }
}
```
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450769908.svg" alt="前端程式碼轉換管線" loading="lazy" onerror="window.imgFallback(this)">
##### 3.2.1.3 實現流程
上面源代碼的範式基於 JS class Decorator 實現，集中式管理Node API地址，請求參數，請求規則，Mock 數據等。感興趣這裡可以查看[代碼](https://github.com/ijs/halojs-doc-examples) 主要介紹 doc 生成的工作流程：
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450770283.svg" alt="剖析後的 AST 表示法" loading="lazy" onerror="window.imgFallback(this)">

- **源碼解析：**可以用任意JS解析器，選擇對 ESModule 較為友好的[babylon](https://www.npmjs.com/package/babylon)解析，實例中的代碼通過 decorators定義信息，生成後的 AST decorator 中存儲著關鍵信息
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450770661.svg" alt="低程式碼編輯器互動流程" loading="lazy" onerror="window.imgFallback(this)">
- **語義分析： **通過提取 ast的 每個decorator信息， 這裡只對 RequestUrl, RequestParam信息提取，[代碼實現邏輯可點擊查看](https://github.com/jiangtao/halo-utils/blob/master/src/libs/doc/utils.js#L9)
```
[
  {
    "params": [
      [
        "text",
        "required",
        "名称"
      ],
      [
        "nickname",
        "*",
        "昵称"
      ]
    ],
    "comment": " 获取当前用的订单信息",
    "url": "/list",
    "method": "GET"
  }
]
```

- **編譯生成markdown： **關鍵數據生成markdown 的過程，可以看作一次編譯過程，實現過程把相關的數據拼裝成 markdown 語法

- **寫入文件： **最後將文本寫入對應文件即可。

## 四、低代碼平台中應用
### 4.1 甚麼是低代碼平台
看到這裡可能會有疑問， 為甚麼編譯思想在低代碼領域有所應用。先瞭解下甚麼是低代碼平台，低代碼平台是通過少量代碼就可以快速生成應用程序的開發平台，可以通過圖形化的用戶界面，使用拖拽組件或模型驅動的邏輯來創建應用的平台。
低代碼平台因面向用戶和面向領域，實現方式等不同，有不同的稱謂，如搭建平台，無代碼平台等。具體可[查看開源的 awsome-lowcode](https://github.com/taowen/awesome-lowcode)一些介紹。
### 4.2 頁面編輯器工作流程
不同的低代碼平台對於 實體的抽象不同，但最核心頁面編輯器（視圖、交互、數據），頁面編輯器輸出 （頁面視圖、交互、數據）的表示DSL（領域特定語言），DSL 回顯到頁面編輯器，展示再編輯等。為了讓存儲的 DSL，創建應用，需要將 DSL 轉換為瀏覽器可識別的語言，將 DSL 轉換到小程序、手機端等不同平台展示。具體的流程
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450771186.svg" alt="低程式碼元件資料模型" loading="lazy" onerror="window.imgFallback(this)">

從核心的DSL來看，DSL 是組件的表示，若想在瀏覽器中運行， 需要通過對 DSL 進行解析和轉換在瀏覽器動態運行（和業務強相關的 DSL 會通過編譯來處理，進行數據脫敏，數據組裝、加工、鑒權等），若存在不同平台需要對 DSL 進行編譯處理成不同平台可運行的代碼，發佈後運行。整個過程和編譯思想相似，每個階段面向對象有所區別。
在整個低代碼平台中 頁面編輯器 是低代碼平台的核心承載，應用生產者的輸入和調整都是通過編輯器來製作，就好比開發者通過 IDE 進行代碼研發一樣。
### 4.3 頁面編輯器
#### 4.3.1 編輯器界面
以之前公司的[無代碼平台編輯器](http://wudaima.com/)設計為例。把頁面拆成三部分： 視圖、交互、數據。

- **視圖：**視圖主要由組件組成，組件分為基礎組件，佈局組件，業務組件，容器組件等。組件需要排版展示，樣式修改

- **交互：**交互行為分為前端行為（事件行為、頁面行為），後端行為（流程關聯、邏輯處理）

- **數據：**數據主要是數據查詢，接口調用等。


**視圖與數據**之間 通過 **交互**連接, 體現在前端 通過組件 method， event來做處理。而交互有很高的複雜性，每個交互可以看成一步步的流程。整個頁面編輯器分為兩部分：**設計和流程**
組件通過事件來調用流程好的流程，流程通過邏輯操作可對組件屬性進行設置，暴露方法調用。
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450771654.svg" alt="元件事件編排" loading="lazy" onerror="window.imgFallback(this)">
整體的**設計編輯區域** 和 **流程節點編排區域，**社區裡面有不少優秀的案例，如**設計編輯區域 [vvweb editor](http://www.vvveb.com/vvvebjs/editor.html)， 流程節點編排**[G6 Editor](https://github.com/antvis/g6-editor)，[GGeditor](https://github.com/alibaba/GGEditor)。本篇文章重心還是放在編譯思維的應用上，涉及到具體的領域技術細節這裡不作展開。
#### 4.3.2 存儲設計
由於系統的複雜性和早期的實驗和快速迭代。之前工作的無代碼平台採用了 MongoDB 數據庫。編輯器界面的核心是組件、流程。這裡面介紹下
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450771919.svg" alt="介面控制項的互動流程" loading="lazy" onerror="window.imgFallback(this)">

- 組件通過事件調用流程設計好的流程，組件表中記錄對應事件調用的流程 flow_id

- 流程通過主動調用，組件暴露的方法，流程表中記錄主動調用方法，記錄在流程節點options字段每個 option 字段代表一個節點，每個param代碼節點下處理行為


**組件表設計**
```
{
    "_id" : ObjectId("5f848ac45ba062e4e77c79ec"),
    "removed" : 0, // 组件状态，假删
    "parentId" : "nxdgb7zzhg9a4vc00", // 组件的父组件 id
    "childrenIds" : [], // 当前组件的子组件 id，前端渲染使用，避免重复查询计算
    "style" : { // 组件样式
        "width" : 154,
        "height" : 40
    },
    "type" : "text", // 组件类型
    "name" : "text1", // 组件类型
    "componentId" : "", // Vue2.0组件
    "props" : { // 组件暴露的属性
    },
    "eventsCall": { // 事件调用流程
        "complexEvents" : [
            {
                "type" : "click",
                "bind" : "5f8509445ba062e4e77c7bfd",
                "repetitive" : false,
                "rate" : 500,
                "tip" : ""
            }
        ]
    },
    "events" : {
        "click" : {
            "type" : 4
        }
    },
    "id" : "geatgutd56lj5s000",
    "controlId" : "geatgutd56lj5s000",
    "appId" : ObjectId("5f848ab85ba062e4e77c79df"),
    "pageId" : "26a92dae656266bf6b9a18a2fd889823",
    "userId" : ObjectId("5f84881b5ba062e4e77c79d9"),
}
```
**流程表設計**
```
{
    "_id" : ObjectId("5f8509445ba062e4e77c7bfd"),
    "removed" : 0,
    "tags" : [],
    "options" : [  // 流程图节点描述
        {
            "id" : 1,
            "type" : "compute",
            "desc" : "计算赋值",
            "next" : 0,
            "style" : {
                "width" : 110,
                "height" : 42,
                "left" : 20,
                "top" : 30
            },
            "params" : [
                {
                    "target_type" : "control", // 来源组件
                    "target_value" : {
                        "prop" : "",
                        "controlId" : ""
                    },
                    "source_type" : "inner", // 内部方法
                    "source_value" : "console.log(123)" // 内部方法值
                },
                {
                    "target_type" : "control", // 来源组件
                    "target_value" : {
                        "prop" : "",
                        "controlId" : ""
                    },
                    "source_type" : "method", // 组件主动调用方法
                    "source_value" : "print(#a#, #b#)", // 调用方法形式,
                    "source_opts": [{}, {}] // 调用方法的参数
                }
            ],
            "start" : true
        }
    ],
    "initial" : false, // 是否页面初始化执行
    "app_id" : ObjectId("5f848ab85ba062e4e77c79df"), // 对应的应用 id
    "page_id" : "26a92dae656266bf6b9a18a2fd889823", // 对应的页面 id
    "name" : "流程图-前台-1", // 页面名称
    "type" : "front", // 流程图节点
    "flow_id" : "5f8509445ba062e4e77c7bfd", // 流程图节点，自己生成，节点存在复用时可重复
}
```
### 4.4 組件漸進升級思路
#### 4.4.1 場景

- 之前工作的無代碼平台由於歷史原因，基於較老的 Vue1.0 技術體系打通全流程。新入職員工對於 Vue1.0 技術體系不熟，且 Vue1.0 體系不少技術文檔陳舊更新不足，影響了團隊對組件的研發效率

- 平台已經進入一直長久的穩定期，且代碼量巨大（100w 行前端代碼，編譯代碼），升級技術棧投入回報嚴重不成正比。希望可以引入 Vue2.0 的語法，提高團隊組件產能，且在 1.0 技術體系在共存。

#### **4.4.2 實現流程**
上面介紹到低代碼平台整體的核心是 DSL，可以通過把編寫的 Vue 2.0 組件 以 DSL 的存入數據庫中，以 Vue2.0 的模板編譯器和 JS 編譯器轉換成 Vue1.0可識別的語法，以達成使用 Vue2.0 組件開發，在 Vue1.0 的編譯環境下運行。
<img src="/images/i18n/zh-TW/misc/compiler-in-fe/1769450772174.svg" alt="低程式碼互動與 DSL 流程" loading="lazy" onerror="window.imgFallback(this)">
編譯實現通過Vue 模板核心基於不同版本的 [vue-template-compiler](https://www.npmjs.com/package/vue-template-compiler)， 通過Vue2.0的 template-compiler 編譯成 模板 ast，在對 ast 進行 轉換成 Vue1.0 的代碼。[Vue1.0模板轉ast轉模板](https://github.com/jiangtao/vue-template-ast-to-template)， [Vue2.0模板轉 ast 轉模板](https://github.com/jiangtao/vue-template-ast-to-template/tree/master)。JS 通過手動轉換生命週期即可。Css 無需要轉換。
## 五、總結
本文講述了編譯原理概述，前端學習編譯思想的一些好處，以及從 JS 執行機制解析編譯在前端中的流程，JSDoc 在前端中的基本流程，低代碼平台中編譯思維的運用，低代碼平台通過 DSL 不同編譯環境下實現前端開發技術棧升級。理解編譯原理思維，對不同的實體（可以是 源代碼、DSL 信息）進行抽象，解析或編譯處理成目標對象，來實現場景。再次感謝您的閱讀，您在工作中把編譯思想用到哪些有意思的場景，歡迎留言或聯繫我交流。
## 六、參考資料

- [前端開發 20 年變遷史](https://zhuanlan.zhihu.com/p/68030183)

- [V8 的 JavaScript 執行管道](https://juejin.im/post/6844903990073753613)

- [V8 的相關演講](https://www.youtube.com/watch?v=M1FBosB5tjM)

- [深入理解 JavaScript 執行上下文和執行棧](https://blog.fundebug.com/2019/03/20/understand-javascript-context-and-stack/)

- [低代碼，要怎麼低？和低代碼有關的 10 個問題](https://zhuanlan.zhihu.com/p/225987562)

- [可視化搭建系統探索前端領域技術和業務價值](https://zhuanlan.zhihu.com/p/164558106)
