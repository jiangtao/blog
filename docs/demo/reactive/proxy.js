const work = { name: 'jt', age: 18, behavior: null }

const baseProxyHandler = {
  get(target, property) {
    return target[property]
  },
  set(target, property, value) {
    target[property] = value
    return true
  }
}
function runAsProxy(obj, proxyHandler = baseProxyHandler) {
  return new Proxy(obj, proxyHandler)
}

