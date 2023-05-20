/**
 * 单例分为惰性版和非惰性版
 */
class Single1 {
  static instance =  new Single1();
  static getInstance() { 
    return Single1.instance
  }
}

let a1 = Single1.getInstance()
let b1 = Single1.getInstance()
console.log(a1 === b1)

class Single2 {
  static getInstance() { 
    return Single2.instance || (Single2.instance = new Single2())
  }
}

let a2 = Single2.getInstance()
let b2 = Single2.getInstance()
console.log(a2 === b2)

class Single3 {}
// 函数版
let getInstance = function(){
  let instance
  return function() {
    return instance || (instance = new Single3());
  }
}()

let a3 = getInstance()
let b3 = getInstance()
console.log(a3 === b3)
