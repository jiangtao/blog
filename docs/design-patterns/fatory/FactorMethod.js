/**
 * 当职责过多的时候，为了减少上述 User 类的工作负担，把创建工作推迟到子类中进行，核心类保证其纯正性，即为抽象类。
 */
class User {
  constructor(user) {
    if (new.target === User) throw new Error('User为抽象类, 不能实例化')
    this.user = user
  }
}
class UserFactory extends User{
  static createUser(role) {
    switch (role.type) {
      case 'label':
        return new UserFactory({ role, visitAuth: ['/', '/label/*'], editPage: '/label/edit' });
      case 'mix':
        return new UserFactory({ role, visitAuth: ['/', '/mix/*'], editPage: '/label/edit' });
      case 'admin':
        return new UserFactory({ role, visitAuth: ['/', '/admin/*'], editPage: '/admin/edit' });
      default:
        throw new Error('参数错误, role.type 可选参数:label, mix, admin')
    }
  }
}

// 使用
let labelUser = UserFactory.createUser({ type: 'label' })
let adminUser = UserFactory.createUser({ type: 'admin' })
let mixUser = UserFactory.createUser({ type: 'mix' })

// 统一调用
let role = { type: 'label' } // role 是动态参数这里模拟
let user = UserFactory.createUser(role)
// window.location.href = `${user.editPage}` // 实际的时候使用 vue相关的东西 
console.log(user)
