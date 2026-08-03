---
title: "Applying Compiler Principles in Front-End Engineering"
pubDatetime: 2022-08-18T00:00:00.000Z
tags:
  - "compiler design"
  - "Meituan"
  - "low-code"
  - "AST"
draft: false
description: "An exploration of compiler concepts in front-end engineering, from JavaScript parsing and ASTs to code transformation and low-code platforms."
cover: /images/i18n/en/blog-covers/compiler-in-fe-cover.svg
locale: en
translationKey: compiler-in-fe
---
This article captures personal study notes. It is provided for discussion only and does not represent any current or former employer.

> This article introduces compiler concepts through front-end engineering: parsing, AST construction, code transformation, and low-code platforms. It focuses on practical mental models rather than compiler algorithms or formal implementation details.

<!--more-->

## 1. Preface
As the web evolved from [Web 1.0](https://zh.wikipedia.org/wiki/Web_2.0#Web_1.0) documents to [Web 2.0](https://zh.wikipedia.org/wiki/Web_2.0) applications, front-end systems and their tooling became substantially more complex. Compilers and compiler-like transformations now appear throughout the stack. Understanding their core ideas makes engineering tools easier to reason about and extend.
<img src="/images/i18n/en/misc/compiler-in-fe/1769450767287.svg" alt="Front-end ecosystem and tooling evolution" loading="lazy" onerror="window.imgFallback(this)">
## 2. Overview of compilation principles
### 2.1 What is the compilation principle?

- **Compilation principle: **The programming languages we currently use (such as C, Java, etc.) are different from early machine languages. **Before a program can be run, it is first translated into a machine code that can be understood by the computer. **This part of the work is usually performed by a compiler (compiler) or an interpreter (interpreter). The principle of compilation is an important professional course in computer science, aiming to introduce the general principles and basic methods of **compilation construction**. Content includes language and grammar, lexical analysis, syntax analysis, syntax-guided translation, intermediate code generation, storage management, code optimization, and target code generation.

- **Compiler and Interpreter**
   - **Programming language: **Programming languages are divided into two types: one is static type, such as (C++, Go, etc.), which needs to be compiled in advance **(AOT)** into machine code and then executed. This process is mainly completed using **compiler**; the other is dynamic type, such as JavaScript, Python, etc., which is only compiled and executed at runtime **(JIT)**. This process is completed through the interpreter. Static type languages ​​do not need to be compiled when running, and the execution efficiency is faster; dynamic languages ​​are interpreted and executed at the same time, making debugging more convenient.

   - **Main working stages of the compiler:**
      - <img src="/images/i18n/en/misc/compiler-in-fe/1769450768758.svg" alt="Compiler pipeline" loading="lazy" onerror="window.imgFallback(this)">
   - **Main working stages of the interpreter:**
      - <img src="/images/i18n/en/misc/compiler-in-fe/1769450768986.svg" alt="Interpreter execution pipeline" loading="lazy" onerror="window.imgFallback(this)">
### 2.2 Why the front-end needs to understand the compilation principle

- **Job: **JavaScript itself is also a programming language. By understanding the working principle of the JS interpreter during execution, it can help you better understand the code running, optimize the code, and make some extensions based on JavaScript itself (such as Flow static type checker, JSDoc document generation, etc.).

- **Engineering practice:** In the process of front-end development, there are more and more engineering practice tools, such as CSS preprocessing tool less, JavaScript compiler Babel, etc. Most of them compile and process the source program in front-end design language (HTML/CSS/JS). Understanding the compilation process of the tool can better track and deal with problems.

- **Application fields: **Upgrade the compilation idea to a higher dimension. The source program is a domain-specific language (DSL), which is compiled and processed into a target program. For example, a low-code platform generates multi-terminal reuse applications, generates multi-technology stack code, etc. Transferring the spatial dimension of compilation thinking to business scenarios may lead to greater solutions.

## 3. Application in front-end
The compilation principle has many applications in the front-end. Here are a few common application examples for easy understanding.
### 3.1 JS execution mechanism
JS execution mechanism organization process
<img src="/images/i18n/en/misc/compiler-in-fe/1769450769163.svg" alt="JavaScript execution model" loading="lazy" onerror="window.imgFallback(this)">
#### 3.1.1 **Generate abstract syntax tree (AST) and execution context**
##### **3.1.1.1 Generate abstract syntax tree**
For us developers, JavaScript source code is more friendly to us, but for the compiler, it is better to understand the abstract syntax tree AST, just like the DOM tree generated by HTML is better understood by the browser.
Generating an abstract syntax tree goes through two stages
**Lexical Analysis**
Lexical analysis parses lines of source code into token units. The so-called token unit is the smallest unit that cannot be divided grammatically. It can be understood through the following figure:
<img src="/images/i18n/en/misc/compiler-in-fe/1769450769508.svg" alt="Lexical analysis from source code to tokens" loading="lazy" onerror="window.imgFallback(this)">

The above code consists of the keyword var, identifier name, and value literal. For more token components, you can view the generated token unit description through [ast tool](https://astexplorer.net/).
**Syntax Analysis**
According to the lexical token unit generated above, ast is generated according to JS grammar rules. If the source code complies with the grammatical rules, ast will be generated successfully. But if there is a syntax error, this step will terminate and a "syntax error" will be thrown. After ast is generated, the execution context is generated.
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
##### **3.1.1.2 Generate execution context**
This article mainly focuses on the introduction of compilation, and the execution context is briefly introduced here.
When the AST is generated, an execution context will be generated. The execution context is an abstract concept of the environment in which the current JavaScript code is parsed and executed. Any code running in JavaScript runs in the execution context.
The execution context life cycle is: **Creation phase, execution phase, and recycling phase. **After the execution context is created, the following pointers and environments will be generated:

- **Variable environment:**Record variables and functions. Before compilation, relevant variables and functions will be pre-stored in the variable environment and taken out from the variable environment when the code is executed.

- **Lexical environment:** Variables declared with let or const are stored in the lexical environment of the function after compilation.

- **outer**: Points to the external scope chain, used to maintain the scope chain relationship

- **this points to: this is related to the execution context, and one execution context has one this**


<img src="/images/i18n/en/misc/compiler-in-fe/1769450769732.svg" alt="Syntax analysis from tokens to an AST" loading="lazy" onerror="window.imgFallback(this)">
##### 3.1.1.3 js execution
After having **ast and execution context**, encounter the ignition parser and parse it into bytecode. If a piece of code is triggered multiple times, it will be marked as hot, triggering the turboFan compiler to compile the bytecode into more efficient machine code storage. When it is executed again next time, the optimized machine code will be used to execute, thereby improving js execution efficiency.
The turboFan compiler de-optimizes. For example, when the function is executed 100 times, assuming that the first 90 parameters are init and the 91st time are other types, the turboFan compiler performs de-optimization operations and returns to the ignition parser to parse into bytecode and execute the stage. De-optimization is expensive, so pay attention to de-optimization operations in actual coding.
### 3.2 Application in front-end engineering
We have learned about the JS execution mechanism above, and here are examples of its application in the front end.
#### 3.2.1 doc generation
Examples of doc generation include many classic [JS Doc](https://jsdoc.app/), [Swagger API](https://swagger.io/), [VuePress](https://vuepress.vuejs.org/zh/guide/), etc. I found a scenario with a relatively simple analysis and processing process to illustrate the application of compilation ideas.
##### 3.2.1.1 Background
In my previous work, based on Koa's [Node.js framework](https://github.com/halojs), there were a large number of APIs that needed to be written. The cost of writing API documents was high, and the Restful API generated documents were relatively simple. Therefore, it was necessary to provide a set of tools that can generate API documents based on the source code paradigm.
##### 3.2.1.2 Ideas
We take the source code as input, and the final markdown result, the view process is as follows:
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
<img src="/images/i18n/en/misc/compiler-in-fe/1769450769908.svg" alt="Front-end code transformation pipeline" loading="lazy" onerror="window.imgFallback(this)">
##### 3.2.1.3 Implementation process
The paradigm of the above source code is based on JS class Decorator implementation, which centrally manages Node API addresses, request parameters, request rules, Mock data, etc. If you are interested, you can view [code](https://github.com/ijs/halojs-doc-examples), which mainly introduces the workflow of doc generation:
<img src="/images/i18n/en/misc/compiler-in-fe/1769450770283.svg" alt="AST representation after parsing" loading="lazy" onerror="window.imgFallback(this)">

- **Source code analysis:**You can use any JS parser, choose [babylon](https://www.npmjs.com/package/babylon) which is more friendly to ESModule for analysis. The code in the example defines information through decorators, and the generated AST decorator stores key information.
<img src="/images/i18n/en/misc/compiler-in-fe/1769450770661.svg" alt="Low-code editor interaction flow" loading="lazy" onerror="window.imgFallback(this)">
- **Semantic analysis: **By extracting each decorator information of ast, here only RequestUrl, RequestParam information is extracted, [Click to view the code implementation logic](https://github.com/jiangtao/halo-utils/blob/master/src/libs/doc/utils.js#L9)
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

- **Compile and generate markdown: **The process of generating markdown from key data can be regarded as a compilation process. The implementation process assembles relevant data into markdown syntax.

- **Write to file: **Finally write the text to the corresponding file.

## 4. Application in low-code platform
### 4.1 What is a low-code platform?
Seeing this, you may have questions about why compilation ideas are applied in the low-code field. Let’s first understand what a low-code platform is. A low-code platform is a development platform that can quickly generate applications with a small amount of code. It can create applications through a graphical user interface, using drag-and-drop components or model-driven logic.
Low-code platforms have different names, such as building platforms, no-code platforms, etc., due to their different user-oriented and domain-oriented implementation methods. For details, please [View the open source awesome-lowcode](https://github.com/taowen/awesome-lowcode) for some introduction.
### 4.2 Page Editor Workflow
Different low-code platforms have different abstractions of entities, but the core page editor (view, interaction, data), page editor output (page view, interaction, data) is represented by DSL (domain specific language), and the DSL is echoed to the page editor, displayed and edited, etc. In order to use the stored DSL to create applications, it is necessary to convert the DSL into a language that can be recognized by the browser, and convert the DSL to different platforms such as mini programs and mobile phones for display. specific process
<img src="/images/i18n/en/misc/compiler-in-fe/1769450771186.svg" alt="Low-code component data model" loading="lazy" onerror="window.imgFallback(this)">

From the core DSL point of view, DSL is a representation of components. If you want to run it in a browser, you need to parse and convert the DSL and run it dynamically in the browser (DSLs that are strongly related to the business will be processed through compilation, data desensitization, data assembly, processing, authentication, etc.). If there are different platforms, the DSL needs to be compiled and processed into code that can be run on different platforms and run after release. The whole process is similar to the compilation idea, and each stage is different in object orientation.
In the entire low-code platform, the page editor is the core carrier of the low-code platform. Inputs and adjustments by application producers are made through the editor, just like developers conduct code development through an IDE.
### 4.3 Page Editor
#### 4.3.1 Editor interface
Take the previous company's [No-Code Platform Editor](http://wudaima.com/) design as an example. Split the page into three parts: view, interaction, and data.

- **View: **View is mainly composed of components, which are divided into basic components, layout components, business components, container components, etc. Components need to be typed and displayed, and styles modified.

- **Interaction: **Interactive behavior is divided into front-end behavior (event behavior, page behavior), back-end behavior (process association, logical processing)

- **Data: **Data mainly includes data query, interface call, etc.


**View and data** are connected through **interaction**, which is reflected in the front end through component method and event. Interactions are highly complex, and each interaction can be viewed as a step-by-step process. The entire page editor is divided into two parts: **Design and Process**
Components call good processes through events, and processes can set component properties and expose method calls through logical operations.
<img src="/images/i18n/en/misc/compiler-in-fe/1769450771654.svg" alt="Component event orchestration" loading="lazy" onerror="window.imgFallback(this)">
The overall **design editing area** and **process node arrangement area, there are many excellent cases in the **community, such as **design editing area [vvweb editor](http://www.vvveb.com/vvvebjs/editor.html), process node arrangement**[G6 Editor](https://github.com/antvis/g6-editor), [GGeditor](https://github.com/alibaba/GGEditor). The focus of this article is still on the application of compilation thinking, and the technical details involved in specific fields will not be discussed here.
#### 4.3.2 Storage design
Due to the complexity of the system and early experimentation and rapid iteration. The no-code platform I worked on previously used the MongoDB database. The core of the editor interface is components and processes. Let’s introduce it here
<img src="/images/i18n/en/misc/compiler-in-fe/1769450771919.svg" alt="Interactive flow for a UI control" loading="lazy" onerror="window.imgFallback(this)">

- The component has a designed process through the event call process, and the process flow_id of the corresponding event call is recorded in the component table.

- The process is actively called, and the component exposes the method. The actively called method is recorded in the process table and recorded in the options field of the process node. Each option field represents a node, and each param code node handles the behavior.


**Component table design**
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
**Flow chart design**
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
### 4.4 Component gradual upgrade ideas
#### 4.4.1 Scenario

- Due to historical reasons, the codeless platform I worked on before was based on the older Vue1.0 technology system to open up the entire process. New employees are not familiar with the Vue1.0 technical system, and many technical documents of the Vue1.0 system are out of date and insufficiently updated, which affects the team's R&D efficiency of components.

- The platform has entered a long-term stable period, and the amount of code is huge (1 million lines of front-end code, compiled code), and the return on investment in upgrading the technology stack is seriously disproportionate. It is hoped that the syntax of Vue2.0 can be introduced to improve the team's component productivity and coexist in the 1.0 technical system.

#### **4.4.2 Implementation process**
As introduced above, the core of the low-code platform as a whole is DSL. You can store the written Vue 2.0 components in the database in DSL, and use the Vue2.0 template compiler and JS compiler to convert them into Vue1.0-recognizable syntax, so that you can develop using Vue2.0 components and run them in the Vue1.0 compilation environment.
<img src="/images/i18n/en/misc/compiler-in-fe/1769450772174.svg" alt="Low-code interaction and DSL flow" loading="lazy" onerror="window.imgFallback(this)">
The compilation implementation is based on different versions of [vue-template-compiler](https://www.npmjs.com/package/vue-template-compiler) through the Vue template core. It is compiled into template ast through Vue2.0's template-compiler, and then the ast is converted into Vue1.0 code. [Vue1.0 template to ast to template](https://github.com/jiangtao/vue-template-ast-to-template), [Vue2.0 template to ast to template](https://github.com/jiangtao/vue-template-ast-to-template/tree/master). JS can be converted manually through the life cycle. CSS requires no conversion.
## 5. Summary
This article describes an overview of compilation principles, some benefits of front-end learning about compilation ideas, and analyzes the compilation process in the front-end from the JS execution mechanism. The basic process of JSDoc in the front-end, the application of compilation thinking in low-code platforms, and the low-code platform realizes the upgrading of the front-end development technology stack under different compilation environments through DSL. Understand the thinking of compilation principles, abstract different entities (which can be source code, DSL information), and parse or compile them into target objects to realize the scenario. Thank you again for reading. What interesting scenarios have you used compilation ideas in your work? Please leave a message or contact me to communicate.
## 6. Reference materials

- [20-year history of changes in front-end development](https://zhuanlan.zhihu.com/p/68030183)

- [V8’s JavaScript execution pipeline](https://juejin.im/post/6844903990073753613)

- [V8 related speech](https://www.youtube.com/watch?v=M1FBosB5tjM)

- [In-depth understanding of JavaScript execution context and execution stack](https://blog.fundebug.com/2019/03/20/understand-javascript-context-and-stack/)

- [Low code, how to be low? 10 issues related to low code](https://zhuanlan.zhihu.com/p/225987562)

- [Visual construction system to explore front-end field technology and business value](https://zhuanlan.zhihu.com/p/164558106)
