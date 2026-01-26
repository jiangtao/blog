// 图片 WebP 回退到 PNG
window.imgFallback = function(img) {
  img.onerror = null; // 防止重复触发
  img.src = img.src.replace(/\.webp$/, '.png');
};
