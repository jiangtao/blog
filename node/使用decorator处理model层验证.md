最近开始写一些`node`的东西，以前使用`thinkjs`这种高度集成的框架，对我这种懒人来说太方便。但经过[统计调查](https://github.com/jiangtao/statistics/issues/1)发现大伙对`koa`, `express`等比较青睐。于是俺也“弃恶从善”， 当然`thinkjs`也是非常好的应用框架。本博客的使用的就是thinkjs开发的firekylin系统。 回到正题：在使用`koa`封装处理`数据验证`的时候，发现以往的做法是错的，或者是很冗余的。

<!--more-->

## 验证数据的几种方式

### 路由层验证

在路由层，直接在路由层做scheme校验；每个路由表维护对应的scheme，工作量也不小。

### controller层验证

在`controller`层， 直接写各种分支判断 。缺点：同样数据或者字段校验需要在不同的`controller`之间添加 代码校验，冗余代码过多

### model层验证

在`model`层做校验，以往的写法直接在里面做校验 或 用 `mongoose`等做校验，但这种校验无法对复杂校验起作用。比如产品经理要验证 邮箱，电话，密码等等。要知道在某些厂特殊需求，规则复杂，当然数据库的数据也要符合规则，减少不必要的清理。 那直接写在model里面校验怎么样？ 要知道老板和产品经理的思维变化很快，而model层那么关键和重要，这种`侵入式`的方式，耦合太强，牵一发而动全身。

## 使用`decorators`做验证

那么， 有木有好的方式？

最近和同事调研发现，`java` 和 `python` 有 `@`， 也就是 `修饰器`。作用就是**对方法进行修改返回新的方法**， 听起来是不是很熟悉，木有错，就是高阶函数（higher order function）. `JavaScript` 在`ES7`中支持`decorators`， `babel`是我们更好的使用这些特性。具体实现原理可查看[这里](http://greengerong.com/blog/2015/09/24/es7-javascript-decorators/)

### javascript实现一个decorator

```javascript
export function validate(vKey, message, validator) {
    return (target, key, descriptor) => {
        // descriptor中的属性，通过Object.defineProperty定义
        const { set, get, value, writable, configurable, writable, enumerable} = descriptor
        // 重写 descriptor
        return descriptor
    }
}
```

### 预期验证效果

由于`Javascript`中的`decorators`支持在类（class）中使用，不支持类之外的方法使用。因此期望代码是这样的。

```javascript
class Model{
    constructor(){
        
    }
    @validate('name', 'name is not a chinese name', validator.isChineseName)
    @validate('age', 'age is out of [0, 100]', validator.isValidAge)
    @validate('email', 'email is invalid email', validator.isEmail)
    insert(obj){
        // db insert with obj.
    }
    
    @validate('name', 'name is not a chinese name', validator.isChineseName)
    @validate('age', 'age is out of [0, 100]', validator.isValidAge)
    @validate('email', 'email is invalid email', validator.isEmail)
    update(obj){
        // db update with obj.
    }
}
```

预期结果发现上面的 validate 有大量的重复，利用`getter` 和 `setter`改进一下：

```javascript
class Model{
    constructor(){
       this._scheme = null 
    }
    
    @validate('name', 'name is not a chinese name', validator.isChineseName)
    @validate('age', 'age is out of [0, 100]', validator.isValidAge)
    @validate('email', 'email is invalid email', validator.isEmail)
    set scheme(v){
        this._scheme  = v
    }
    get scheme(){
        return this._scheme
    }
    
    insert(){
        // db insert this.scheme.
    }
    
    update(){
        // db update this.scheme.
    }
}
```
因此需要实现一个验证 `setter`的 decorators.  在这之前讨论下 setter decorators validate对外接口（验证字段错误处理）

### 验证字段错误处理

- throw Error的形式

对外每次构建实例之后，对scheme设置时需要try catch才能拿到错误信息

- 统一格式处理
需要对对外暴露的字段做一次校验。

> 基于每个模块各司其职，Model层在Model层做处理，当不符合规则时候，返回统一格式给API层。

最终期望的结果：
```javascript
class Model {
    constructor(ctx, dbname) {
        this.table = ctx.mongo.collection(dbname)
        this._scheme = null
    }

    @validate('name', 'name is not a chinese name', validator.isChineseName)
    @validate('age', 'age is out of [0, 100]', validator.isValidAge)
    @validate('email', 'email is invalid email', validator.isEmail)
    set scheme(v) {
        this._scheme = v
    }
    get scheme() {
        return this._scheme
    }

    insert() {
        // 将验证错误信息方法在scheme中
        if(this.scheme.validateResult && this.scheme.validateResult.invalid){
            return this.scheme.validateResult
        } else {
            delete this.scheme.validateResult
            // 执行db插入操作.
        }
    }

    update() {
        // 将验证错误信息方法在scheme中
        if(this.scheme.validateResult && this.scheme.validateResult.invalid){
            return this.scheme.validateResult
        } else {
            delete this.scheme.validateResult
            // 执行db更新操作.
        }
    }
}
```
### 坑点

-  generator不支持 decorator
-  对`setter`实现decorator, 需要自行处理异常拦截的问题

## 参考资料

- [PYTHON修饰器的函数式编程](http://coolshell.cn/articles/11265.html)
- [细说ES7 JavaScript Decorators](http://greengerong.com/blog/2015/09/24/es7-javascript-decorators/)
- [ES7 Decorator 装饰者模式](http://taobaofed.org/blog/2015/11/16/es7-decorator/)
- [core-decorator.js](https://github.com/jayphelps/core-decorators.js/)


以上是使用`decorators`实现model验证的思路和过程，查看[validate decorator实现](https://github.com/jiangtao/validate-decorator)。
`decorator`给开发带来了很好的`集中式处理`。

如有不妥，欢迎指正。转载请写明出处。

转载请备注出处
