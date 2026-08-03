import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL) => `
# Google 与百度可抓取三种语言的文章，以支持搜索收录。
User-agent: Googlebot
Allow: /posts/
Allow: /en/posts/
Allow: /zh-TW/posts/
Allow: /_astro/
Allow: /images/
Allow: /sitemap
Disallow: /

User-agent: Baiduspider
Allow: /posts/
Allow: /en/posts/
Allow: /zh-TW/posts/
Allow: /_astro/
Allow: /images/
Allow: /sitemap
Disallow: /

# llms 文档仅作为用户明确授权的分析入口，不授权整站自动化采集。
User-agent: *
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(sitemapURL), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
