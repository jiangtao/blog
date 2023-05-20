/**
 * 小明 和 小红 小红闺蜜之间的故事
 */

class Flower{}
class Present{}
const xiaoming = {
  sendFlower(target) {
    const flower = new Flower()
    target.recieveFlower(flower)
  },
  sendPresent(target) {
    const present = new Present()
    target.recievePresent(present)
  }
}
const closeFriend = {
  recieveFlower(flower) {
    console.log('小红收到花了', flower)
  },

  recievePresend(present) {
    console.log('小红收到礼物了', present)
  }
}
const xiaohong = {
  recieveFlower(flower) {
    return closeFriend.recieveFlower()
  },
  recievePresent(present) {
    xiaohong.watchHappyBirthday(() => {
      closeFriend.recievePresend(present)
    })
  },
  watchHappyBirthday(fn) {
    setTimeout(fn, 1000) // 模拟生日
  }
}
xiaoming.sendPresent(xiaohong)

// 矩阵相乘