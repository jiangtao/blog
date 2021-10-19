/**
 * 当后续我们的用户类型过多，需要批量创建时，一个个创建就不太满足，且创建逻辑单独抽象和不够单一、清晰。
 */
 class User {
  constructor(user) {
    if (new.target === User) throw new Error('User为抽象类, 不能实例化')
    this.user = user
  }
}
class LabelUser extends User {
  constructor(user, opts) {
    supper(user)
    this.role = { type: 'label' }
    this.visitAuth = opts.visitAuth || ['/', '/label/*']
    this.editPage = opts.editPage || '/label/edit'
  }
}
class AdminUser extends User {
  constructor(user, opts) {
    supper(user)
    this.role = { type: 'admin' }
    this.visitAuth = opts.visitAuth || ['/', '/admin/*']
    this.editPage = opts.editPage || '/admin/edit'
  }
}
class MixUser extends User {
  constructor(user, opts) {
    supper(user)
    this.role = { type: 'mix' }
    this.visitAuth = opts.visitAuth || ['/', '/mix/*']
    this.editPage = opts.editPage || '/mix/edit'
  }
}

const getAbstractUserFactory = (role) => {
  switch (role.type) {
    case 'mix':
      return MixUser;
    case 'admin':
      return AdminUser;
    case 'label':
      return LabelUser;
  }
}
const AdminUserCls = getAbstractUserFactory({role: {type: 'admin'}})
const MixUserCls = getAbstractUserFactory({role: {type: 'mix'}})
const LabelUserCls = getAbstractUserFactory({role: {type: 'label'}})

const adminUser = new AdminUser('张三')
const mixUser = new AdminUser('李四')
const labelUser = new AdminUser('王五')


