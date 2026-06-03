export const SITE = {
  website: "https://blog.jerret.me/", // replace this with your deployed domain
  author: "Jerret",
  profile: "https://github.com/jiangtao",
  desc: "Jerret's blog, record growth, and progress together",
  title: "Jerret",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 10,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit Page",
    url: "https://github.com/jiangtao/blog/edit/main/",
  },
  wechatOfficialAccount: {
    enabled: true,
    name: "Jerret Life",
    englishName: "Jerret Life",
    description: "分享技术思考、AI 等以及生活。",
    qrImage: "/images/social/wechat-official-account.jpg",
    alt: "Jerret Life 微信公众号二维码",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
