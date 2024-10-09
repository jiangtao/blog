## L1

1. TS 主要作用
- 代码上显式标注类型, 让代码更加易读
- 开发和编译时, 通过类型推断和静态类型检查可以显著提高代码质量
  - 发现潜在的编码风险, 提前暴露风险

2. TS 主要用法
- 编译制定文件 (tsc xx.ts)
- 使用 tsc 初始化 ts 工程

## L2

1. JS 的类型和 TS 的类型 

JS 类型分为
- 引用类型: function object
- 值类型: symbol number boolean string
- 初始值: undefined null

>  JS类型可以直接在 TS 中引用定义
子类可以赋值给父类
包装器对象 new String new Object, 不能直接赋值给 JS 类型

---
类型传递

字面类型 => 原始类型 => 包装类型 => 祖先类 -> 空接口/空对象 Empty {}
                      
                      任意子类 => 父类p

'abc'  => string => String =>  Object => Empty


2. TS 类型

- 基本类型
- Arrays
- any
- functions
  - 参数
  - 返回值

- Object Types
  - Optional Properties
- Union Types
- 类型别名
- 接口
  - 所有的接口都可以实现类型别名
  - > 类型别名和接口之间的区别
类型别名和接口非常相似，在大多数情况下你可以在它们之间自由选择。 几乎所有的 interface 功能都可以在 type 中使用，关键区别在于不能重新开放类型以添加新的属性，而接口始终是可扩展的
  - > 类型别名是不能添加新字段的
- Type Assertions
  - as
  - <HTMLCanvasElement>
- iteral types (字面类型)






  
                       

