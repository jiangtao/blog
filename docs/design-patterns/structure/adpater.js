const baiduMap = {
  type: 'baidu',
  render (position) {
    console.log('render baidu')
  }
}
const gaodeMap = {
  type: 'gaode',
  render (position) {
    console.log('render gaode')
  }
}
const googleMap = {
  type: 'google',
  display (position) {
    console.log('display google')
  }
}
const googleAdapter = {
  render(position) {
    console.log('google render adapter')
    return googleMap.display(position)
  }
}
const renderMap = (map, ...args) => {
  if (typeof map.render === 'function') {
    return map.render(...args)
  }
}

renderMap(gaodeMap)
renderMap(googleAdapter)