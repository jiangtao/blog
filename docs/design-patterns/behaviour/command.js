const setCommand = function (command, ...args) {
  if(command && (typeof command.execute === 'function')) {
    command.execute(...args)
  }
  return command
}
const playSongCommand = function (reciever) {
  const execute = function (name) {
    reciever.play(name)
  }
  var undo = function () {
    reciever.wait()
  }
  return {
    execute,
    undo
  }
}
const xiaoai = {
  play(name) {
    console.log(`播放歌曲: ${name}`)
  },
  wait() {
    console.log(`切换到等待状态`)
  }
}

const command = setCommand(playSongCommand(xiaoai), '千里之外')
command.undo()