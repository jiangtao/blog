const myImage = function() {
  var img = document.createElement('img')
  document.body.appendChild(img)
  return {
    setSrc(src) {
      img.src = src
    }
  }
}()

const proxyImage = function(){
  const img = new Image()
  img.onload = function(){
    myImage.setSrc(this.src)
  } 
  return {
    setSrc(src) {
      myImage.setSrc('//loading')
      img.src = src
    }
  }
}()