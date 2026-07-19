import {
  createVisibleEditorAdapter,
  type BrowserDraftExecutor,
} from "../browser-editor";

type JuejinAdapterOptions = {
  allowVisibleAutomation?: boolean;
  executor?: BrowserDraftExecutor;
};

export function createJuejinAdapter(options: JuejinAdapterOptions = {}) {
  return createVisibleEditorAdapter({
    channel: "juejin",
    newEditorUrl: "https://juejin.cn/editor/drafts/new?v=2",
    importMode: "markdown-editor",
    allowVisibleAutomation: options.allowVisibleAutomation,
    executor: options.executor,
    instructions: [
      "确认当前页面是掘金官方 Markdown 编辑器且账号已登录。",
      "填入标题和 markdownPath 的正文，等待正文图片上传完成。",
      "填写摘要、分类、标签、封面和原文链接。",
      "等待草稿保存完成并取得稳定 draft URL。",
      "重新打开草稿，核对正文、元数据、图片和出处。",
      "停留在草稿态，不点击公开发布。",
    ],
    visibleChecks: [
      "标题与源文章一致",
      "正文出处可见",
      "图片全部加载完成",
      "代码块可读",
      "摘要已填写",
      "分类已选择",
      "标签已填写",
      "封面已填写",
      "原文链接已填写",
      "草稿重新打开后正文仍一致",
    ],
  });
}
