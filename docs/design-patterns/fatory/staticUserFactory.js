/**
 * 工厂方法是将创建对象的过程封装其他，然后通过同一个接口创建新的对象
 * 以下是为了展示模式的实现, 项目代表中并不一定这么做
 * 有人把下面这种形式叫做简单工厂模式, 工厂方法模式
 */
class User {
  constructor(user) {
    this.user = user
  }
  static createUser (role) {
    switch (role.type) {
      case 'label':
        return new User({ role, visitAuth: ['/', '/label/*'], editPage: '/label/edit' });
      case 'mix':
        return new User({ role, visitAuth: ['/', '/mix/*'], editPage: '/mix/edit' });
      case 'admin':
        return new User({ role, visitAuth: ['/', '/admin/*'], editPage: '/admin/edit' });
      default:
        throw new Error('参数错误, role.type 可选参数:label, mix, admin')
    }
  }
}

// 使用
let labelUser = User.createUser({ type: 'label' })
let adminUser = User.createUser({ type: 'admin' })
let mixUser = User.createUser({ type: 'mix' })

// 统一调用
let role = { type: 'admin' } // role 是动态参数这里模拟
let user = User.createUser(role)
window.location.href = `${user.editPage}` // 实际的时候使用 vue相关的东西 
