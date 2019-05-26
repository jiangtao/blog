function run(taskDef) {
  const task = taskDef()
  let result = task.next()

  function step() {
    if(!result.done) {
      if(typeof result.value === 'function'){
        result.value(function(err, data) {
          if(err) {
            result = task.throw(err)
            return
          }
          result = task.next(data)
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
const fs = require('fs')
const readFile = function(...parameters) {
  return function(callback) {
    return fs.readFile(...parameters, callback)
  }
}
const Path = require('path')
// thunk
run(function* () {
  let content = yield readFile(Path.resolve(__dirname, 'var.html'), {encoding: 'utf-8'})
  content = yield (content + '\nhi')
  console.log(content)
})