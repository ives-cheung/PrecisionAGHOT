// 站点身份和读者看得到的文案。换成你的行业时，先改这个文件。
// 网页和后端都读它；改完重新构建（docker compose up --build）即可生效。
// 域名不在这里：部署时用环境变量 SITE_URL 设置。

export const SITE = {
  /** 站名：导航、页面标题、分享图、RSS、MCP、后台都用它。 */
  name: "PrecisionAGHOT",
  /**
   * 行业词：拼进默认说法里，比如“AI 日报”“AI 动态”。
   * 改成“法律”“HR”“黄金”之类，页面上就会变成“法律日报”“法律动态”。
   */
  subject: "精准农业",
  /** 首页的完整标题（浏览器标签、搜索结果）。 */
  homeTitle: "PrecisionAGHOT — 全球精准农业科技、软件与服务情报",
  /** 一句话介绍：搜索引擎、分享卡片、RSS、llms.txt 会用。 */
  description: "追踪全球精准农业：农机自动转向与导航、智能装备、遥感与传感器、水肥管理、农场软件和技术服务。汇聚公开信源，提供中文精选、行业热点与日报。",
  /** 首页左上角和侧边栏下面的一行小字。 */
  tagline: "全球农业科技，连接每一块田。",
  /** 界面语言（HTML lang、og:locale）。 */
  locale: "zh-CN",
  /** 默认域名，只在没设置 SITE_URL 时使用。 */
  defaultUrl: "http://localhost:3000",
  /**
   * MCP 工具名的前缀（小写字母、数字、下划线），工具会叫 myhot_get_latest、myhot_search……
   * 已经有人接入后就不要再改。
   */
  mcpPrefix: "precisionaghot",
  /** 对外联系邮箱（选填）：使用规则、llms.txt、响应头里会写。 */
  contactEmail: null as string | null,
  /** 页脚的一行小字（选填）。 */
  footerNote: "基于数字生命卡兹克（卡哥）的开源框架改造",
  /** 中国大陆网站的 ICP 备案号（选填），填了就显示在页脚并链接到工信部备案系统。 */
  icp: null as string | null,
  /** 结构化数据里的网站运营者（搜索引擎用）。 */
  organization: {
    name: "PrecisionAGHOT",
    /** 创始人（选填）：{ name, url, description }。 */
    founder: null as null | { name: string; url?: string; description?: string },
  },
  /** 抓取信源时报上的名字（User-Agent 里用），不要冒用别的站。 */
  crawlerName: "PrecisionAGHOTBot",
} as const;

/** 关于页的文案。数字（信源数、收录数、精选数、日报期数）来自站内实时统计，不用写在这里。 */
export const ABOUT = {
  kicker: `关于 ${SITE.name}`,
  /** 大标题：第一行正常颜色，第二行强调色。 */
  headline: ["从自动转向到农场软件，", "看见农业的下一步。"] as [string, string],
  /** 标题下面的一段话。{sources} 会换成实时的信源数。 */
  lead: `${SITE.name} 汇聚 {sources} 个公开信源，关注全球精准农业的技术、产品与服务：从 GNSS / RTK 自动转向、变量作业和农业机器人，到农场管理软件、遥感数据与农艺决策。中文摘要、事件归并与行业精选，帮助你持续追踪产业变化。`,
  /** 信源河动画下面的四个环节。 */
  steps: {
    collect: "追踪装备与导航厂商、农业软件平台、研究机构及行业媒体的公开动态，覆盖产品发布、技术服务和田间应用。",
    store: "同一项产品、试验或合作的多篇报道归为一个事件，独立来源形成热度线索，减少重复阅读。",
    select: "优先关注技术变化、兼容性、作业效率和落地证据，区分厂商宣称与田间验证；过滤泛农业资讯、软广与无依据的收益承诺。",
    publish: "按北京时间每天 08:00 编排日报，周一编排周报，每月 1 日编排月报；也可通过主题、搜索、RSS 和公开 API 持续追踪。",
  },
  /**
   * 作者块（选填），null 就不显示。
   * avatarSourceId：一个 X 账号信源的 id，头像取它的（选填）。
   * 二维码在后台“设置”里上传，或者放进 industry/brand/contact/；没有二维码就不显示那张卡片。
   */
  maker: null as null | {
    name: string;
    greeting: string[];
    avatarSourceId?: string | null;
    wechat?: { title: string; note: string };
    feishu?: { title: string; note: string };
  },
  /** 原始框架作者与上游出处；行业改造沿用 MIT 并保留版权声明。 */
  acknowledgments: {
    name: "数字生命卡兹克",
    description: "原始框架由 AI 自媒体博主数字生命卡兹克（卡哥）创作并开源。PrecisionAGHOT 在此基础上面向全球农业科技进行定制，感谢卡哥提供的采集、筛选、事件归组与日报框架。",
    url: "https://github.com/KKKKhazix/AIHOT",
  },
  /** 页面底部的版权与下架说明（结尾会接“反馈页”的链接）。 */
  copyright: `${SITE.name} 是聚合摘要和阅读索引，原文版权归各来源所有。如果你是来源方，希望更正、下架或调整展示方式，可以通过`,
} as const;

/** “AI 日报”这类说法：行业词和名词之间，英文词加空格，中文词不加。 */
export function withSubject(noun: string): string {
  return /[A-Za-z0-9]$/.test(SITE.subject) ? `${SITE.subject} ${noun}` : `${SITE.subject}${noun}`;
}
