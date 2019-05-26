
// error first function 和 promise 兼容处理
function run(genrator) {
  let task = genrator()
  let result = task.next()
  console.log(result)
  function step() {
    if(!result.done) {
      if(result.value instanceof Promise) {
        result.value.then(function(data) {
          result = task.next(data)
          step()
        }).catch(function(e) {
          result = task.throw(e)
          step()
        })
      } else {
        result = task.next(result.value)
        step()
      }
    } 
  }
  step()
}

const promisify = require('util').promisify
const fs = require('fs')
const path = require('path')
const readFile = promisify(fs.readFile)
run(function *() {
  let content = yield readFile(path.resolve(__dirname, './function.html'), {encoding: 'utf-8'})
  content = yield Promise.resolve(content + '\nhi')
  console.log(content)
})