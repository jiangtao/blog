let a1: symbol = Symbol()
let a2: number = 1
let a3: string = '1'
let a4: boolean = true
let a5: undefined = undefined
let a6: null = null
let a7: object = {}

// 子类可以赋值父类
class StringEx extends String {
  constructor(...args: any[]) {
    super(...args)
  }
}
// 包装器对象 new String new Object, 不能直接赋值给 JS 类型
let a8: String = new String('1')

a8 = new StringEx('2')

a8 = '3' // JS 类型可以赋值到包装器对象, 直至root对象



interface Point {
  x: number
  y: number
}

interface Point3D extends Point {
  z: number
}

type point2d = {
  x: number
  y: number
}
type point3d = point2d & {
  z: number
}

interface point3D {
  radius: number
}

// 不被允许
type point3d = {
  radius: number
} & Point