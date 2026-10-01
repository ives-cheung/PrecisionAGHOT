# 信源

信源在后台“信源”页管理：新建、试抓一次看看抓到什么、改频率、启停、看失败原因和最近的条目。首次启动时，`industry/sources.json` 里的示范信源会被导入。

## 六种信源

| 类型 | 适合 | 需要 |
|---|---|---|
| `rss` | 有 RSS / Atom 的博客、媒体、Substack、公众号转 RSS 服务 | 无 |
| `web_list` | 没有 RSS 的网页列表（新闻页、博客列表、更新日志） | 写选择器；抓不到时可以经 Jina Reader 渲染（按次计费） |
| `json_list` | 返回 JSON 的接口（GitHub Releases 等） | 写字段路径 |
| `x_search` | X（推特）账号 | SocialData 的 key，按请求计费 |
| `mp_account` | 微信公众号 | 极致了（Dajiala）的 key，按请求计费 |
| `external` | 你自己的脚本推送进来的内容 | `INGEST_TOKEN`，见下文 |

每种信源认哪些配置项写在 `packages/backend/src/sources/config-keys.ts`。填了不认识的配置项，保存会被拒绝、抓取会直接失败并在后台显示原因，不会悄悄退回通用解析。

### rss

```json
{ "feedUrl": "https://example.com/feed.xml" }
```

可选：`summaryIsBody`（订阅里的摘要就是全文）、`allowCategories` / `denyCategories`（按订阅里的分类过滤）。

### web_list

```json
{
  "url": "https://example.com/news",
  "itemSelector": "article",
  "linkSelector": "a",
  "titleSelector": "h2",
  "publishedAtSelector": "time"
}
```

- `parseMode`：`html`（默认，用选择器）、`markdown`（经 Jina 渲染后按 Markdown 读）、`docusaurus_changelog`。
- `detail`：列表缺日期、标题或摘要时抓详情页补齐（`publishedAtSelector`、`titleSelector`、`summarySelector` 等）。
- `allowUrlPrefixes` / `denyUrlPrefixes`：只收某些路径下的文章。
- `pagination`：直接读取的 HTML 列表可跟随下一页链接，例如 `{"nextSelector":"a[rel=next]","maxPages":5}`。`nextSelector` 指向下一页的链接，`maxPages` 是包含首页在内的页数，必须是 1–10 的整数。不配置时只读一页；Markdown/Jina 或专用适配器不接受这个配置。翻页只在首个列表页所在 origin 内进行，跳站会报错，循环链接会停止；后续页失败时整次采集失败，不会提交前面几页的半批数据。跨页按文章身份判重，保留来源日期。
- `publishedAtUtcOffset`：无时区的来源日期按此偏移解释；点号数字日期必须按来源选择 `publishedAtFormat:"DMY"`（日/月/年，如 PTx 的 `23.03.2026`）或 `"MDY"`（月/日/年）。顶层配置用于列表，`detail.publishedAtFormat` 用于详情日期规则；非法日期不会成为发布时间，不配置则保留原有解析行为。仅有“更新月份”或最后修改时间时，不应将其冒充发布日期。

### 首次导入和每轮条数

`rss`、`web_list`、`json_list` 可配置 `maxItemsPerRun`：后续普通采集每轮最多存入的候选条数，默认 60，必须是 1–500 的整数。它扩大已读取列表的处理批次，不会让 RSS 自动提供更多历史，也不会代替网页的翻页配置。

`maxAgeMonths` 可限制新遇到候选的历史范围，必须是 1–120 的整数，例如 `24` 表示只采集原文日期在近 24 个月内的条目（每月按 30 天计算）。它也作用于已有首次导入游标的信源；详情页补出的日期同样检查。缺少日期的条目保持原有处理方式，数据库里的旧稿不删除；不配置则不增加此限制。

`requirePublishedAt:true` 要求候选在详情页补齐之后仍有可验证的发布日期；详情抓取失败、额度用完后仍缺日期的条目会跳过，避免将未注明时间的存量文章放到今天。值必须是布尔值，不配置或设为 `false` 时保留原有行为。

新信源第一次导入使用 `_aihot.initialBackfillLimit`（默认 30）和 `_aihot.initialBackfillMonths`（默认 12）限制存量，同时受 `maxAgeMonths` 限制，取较近的截止日期；已有信源的首次导入游标不会因修改这两个值而重置。可在新源中使用例如 `{"maxItemsPerRun":200,"maxAgeMonths":24,"_aihot":{"initialBackfillLimit":100,"initialBackfillMonths":24}}`，并通过后台“立即抓取”读取更新后的列表。所有旧文仍保留原文日期与回灌标记，不会成为今天的新消息；扩大采集不改变精选评分门槛、模型回执或预算限制。

### x_search

```json
{ "query": "from:SomeAccount -filter:replies" }
```

普通账号会被自动合并成一次搜索（每次最多二十几个账号），省请求数。

### mp_account

```json
{ "ghid": "gh_xxxxxxxx", "nickname": "公众号名称" }
```

每个公众号按它的抓取间隔检查一次（查列表按次计费），新文章的正文一并取回。

## 分级、参与方式与全文

- **分级** `tier`：`T1` 官方一手（官网、官方博客、机构）、`T1_5` 官方账号与准官方创作者、`T2` 媒体与个人、`EXCLUDE_MP` 不参与精选。入选门槛按分级不同（`industry/selection.ts`）。
- **参与方式** `participation_mode`：`editorial` 进精选和全部动态；`hot_signal` 不单独展示，只作为“大家在讨论什么”的热度证据；`isolated` 不进任何公开页面。
- **一手** `first_party`：来源是当事方自己。事件页会优先展示一手报道。
- **全文**：`site_fulltext` 决定站内能不能显示全文，`syndicate_fulltext` 决定全文 RSS 能不能带正文。两者**默认都关**，只显示摘要和原文链接；来源明确允许时再打开。公众号、付费墙内容不会因为技术上抓得到就获得全文展示。

## 抓取频率

每个信源有自己的抓取间隔。每天 04:20 会按近 7 天的产出自动调整：产出多的抓得勤，最短 15 分钟；免费信源最长 60 分钟，按次计费的信源最长 120–180 分钟。

抓取失败不推进位置，下次从同一处继续；连续失败的信源在后台标红，每周一会在运营群发一份信源周报（配置了飞书内部群时）。

## 规则：旧文不刷屏

首次发现时原文已经发布超过 48 小时的资料、新信源第一次导入的存量条目、标记为回灌的推送，都按原文时间归档：不进入“今天”，也不推送。这条规则所有入口共用，防止一次性导入历史内容刷屏。

## 外部推送接口

自己写脚本抓的内容，可以推进站里，走和普通采集一样的判重、精选和归组。

```
POST /api/ingest/items
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "sourceId": "my-crawler",
  "sourceName": "我的抓取脚本",
  "items": [
    { "title": "必填", "url": "必填", "publishedAt": "2026-10-01T08:00:00+08:00", "author": "可选" }
  ]
}
```

- `INGEST_TOKEN` 在 `.env` 里设置，至少 16 位；不设置时接口一律返回 401。
- 每次最多 50 条；每个客户端每分钟最多 10 次。
- 返回 `{"ok": true, "created": <新建条数>}`。缺标题或网址的条目会被跳过，同一请求里重复的网址只取第一条。
- `sourceId` 不存在时会自动建一个 `external` 信源，默认不进公开页面：到后台把它的参与方式改成 `editorial` 才会出现在站上。
- 条目的 `raw._aihot.backfill` 为 `true` 时按历史回灌处理（不进入“今天”、不推送）。
