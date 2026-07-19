import {
  createVisibleEditorAdapter,
  type BrowserDraftExecutor,
} from "../browser-editor";

type ZhihuAdapterOptions = {
  allowVisibleAutomation?: boolean;
  executor?: BrowserDraftExecutor;
};

export function createZhihuAdapter(options: ZhihuAdapterOptions = {}) {
  return createVisibleEditorAdapter({
    channel: "zhihu",
    newEditorUrl: "https://zhuanlan.zhihu.com/write",
    importMode: "markdown-file",
    allowVisibleAutomation: options.allowVisibleAutomation,
    executor: options.executor,
    instructions: [
      "确认当前页面是知乎官方文章编辑器且账号已登录。",
      "使用编辑器的“导入文档 MD/Doc”入口导入 markdownPath。",
      "填写标题，等待图片处理完成，并确认正文末尾出处可见。",
      "等待编辑器显示已保存，再重新打开当前编辑入口核对内容。",
      "停留在可审核编辑态，不点击公开发布。",
    ],
    visibleChecks: [
      "标题与源文章一致",
      "正文出处可见",
      "图片全部加载完成",
      "代码块可读",
      "编辑器显示已保存",
      "重新打开后正文仍一致",
    ],
  });
}
