let summit = (username, password) => {
  if (!username) {
    alert('用户名不能为空啊')
    return false
  }
  if(!password || password.length < 6 || password.length > 30) {
    alert('请输入合法的密码')
    return false
  }
  return fetch('/user/register')
}

// 使用装饰器改造
Function.prototype.before = function(beforeFn) {
  let that = this
  return function() {
    // 前置函数如果返回失败, 后续就不执行了
    if(!beforeFn.apply(this, arguments)) {
      return
    }
    return that.apply(this, arguments)
  }
}

let submit2 = function(username, password) {
  return fetch('/user/register')
}
submit2.before(function(username, password) {
  if (!username) {
    alert('用户名不能为空啊')
    return false
  }
  if(!password || password.length < 6 || password.length > 30) {
    alert('请输入合法的密码')
    return false
  }
  return true
})()