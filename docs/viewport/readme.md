[无javascript实现移动端自适应布局](width-750.html)

1. 这种方式相当于把viewport（视图）的宽度定位在750，当设备显示的实际宽度 screen.width * dpr （设备宽度 * 设备像素比） 大于 750， initial-scale maximum-scale会缩放为 screen.width * dpr / 750，以达到适配的作用
2. 因为本质上还是改变 initial-scale， 所以当对接的第三方css不是以750设计的时候 需要自行修改css, 即 用第三方的css值 乘以 第三方设计的宽度/750 即可
3. 这种方案还有一种好处就是，遇到响应式外面设置宽度即可
4. 基于以上原因，这也是淘宝的flexible为什么要设置initial-scale的原因，但由于rem的方案字体会出现一些问题。因此需要设置dpr去重置字体样式
5. 不管rem，initial-scale， vw等本质上都是百分比缩放布局。根据场景选择对应的解决方案。

## 参考资料

- [移动前端开发之viewport的深入理解](https://www.cnblogs.com/2050/p/3877280.html)
