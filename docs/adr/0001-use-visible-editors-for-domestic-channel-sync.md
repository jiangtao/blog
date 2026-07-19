# 国内内容渠道使用可见编辑器同步

微信继续复用已验证的 `md2wechat` 草稿能力；知乎和掘金通过用户现有登录态的可见官方编辑器完成同步，不读取浏览器凭据，也不把 Wechatsync 的未鉴权桥接层或平台私有 API 作为默认依赖。该选择牺牲部分无人值守能力，换取可审核、可降级且不把账号权限暴露给高风险本地服务的长期边界。

English: WeChat reuses the verified md2wechat draft flow. Zhihu and Juejin use visible official editors with the user's existing browser session; unsafe bridges and private APIs are excluded from the default path.
