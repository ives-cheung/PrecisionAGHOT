# PrecisionAGHOT

一个面向全球精准农业生态的中文热点与行业日报网站。持续关注农业科技、农机装备和实际落地：自动转向与 GNSS/RTK 导航、智能作业终端、变量作业、无人机、传感器与物联网、农业机器人、水肥管理，以及农场软件、数据平台和技术服务。

本项目是 [AIHOT](https://github.com/KKKKhazix/AIHOT) 的精准农业定制版。**原始框架作者是 AI 自媒体博主数字生命卡兹克**，感谢卡哥创作并开源这套框架。PrecisionAGHOT 在上游基础上扩展农业行业配置、全球信源与阅读界面，使用独立站名和品牌。

## 功能

- 从 RSS、网页列表和公开 JSON 列表采集，支持有界分页、日期补齐和跨源去重。
- 模型完成行业预筛、双次评分、中文摘要、分类和事件归组；付费请求经过回执复用和预算熔断。
- 首页展示最新来源动态与行业精选，支持分类、标签、主题和中英文搜索。
- 热点按过去 48 小时独立来源参与度排序；日报、周报、月报按刊期生成。没有合格生成结果时，页面说明原因并提供真实来源动态。
- 提供 RSS、公开 HTTP API、MCP 与管理后台，所有公开出口遵循同一读取规则。
- 黑白灰界面，支持浅色与深色模式，适配手机和桌面阅读。模型榜和 Codex 重置监控在农业版本中关闭。

## 信源与数据

配置覆盖厂商、农业软件平台、研究机构、协会和行业媒体，范围包括中国、北美、欧洲、澳新、非洲与拉美。自动转向、智能装备、农场软件、传感器、水肥管理、农业机器人和技术服务都在关注范围内。当前配置含 **68 个启用信源**，完整列表见 [信源目录](docs/sources-catalog.md) 与 [industry/sources.json](industry/sources.json)。新增配置经过本项目实际采集器验证；网站或 RSS 地址今后仍可能变化，运行健康状态以后台为准。

新来源首次最多回灌 200 条、24 个月历史，后续每轮最多 300 条；网页分页按各源实际结构限制，最多 10 页。历史报道保留原文发布日期，缺少可核实日期的候选不入库。相同发布机构的多个栏目共用热度参与者分组。

开源仓库包含代码、行业配置和测试夹具，运行时数据库与抓取材料不随仓库分发。新克隆项目需要配置模型并启用采集；种子脚本只导入信源和主题，不会生成新闻。新闻原文版权归发布方，默认只公开中文摘要和原文链接。

精选标准保留内容类型、五个维度加权、噪声压制和安全边界。现有评分门槛尚未用农业标注样本重新校准，详见 [精准农业版本说明](docs/precision-agriculture.md)。全部动态订阅为 `/feed/all.xml`；`/feed.xml` 读取精选。

## 关注范围

| 方向 | 关注内容 |
|---|---|
| 农机装备与智能作业 | 拖拉机、农具、智能终端、ISOBUS、变量作业与精准施用 |
| 导航与自动转向 | GNSS/RTK、自动转向、引导系统、农机控制与兼容性 |
| 无人机与农业机器人 | 测绘、植保、播撒、除草、采收与自主田间作业 |
| 遥感、传感器与水肥 | 卫星/地面监测、物联网、土壤传感、灌溉控制与水肥一体化 |
| 软件与数据平台 | FMIS/FMS、农场 ERP、农艺决策、数据互通、设备联网与数字化运营 |
| 技术服务与产业 | RTK/导航服务、遥感分析、作业服务、农艺支持、合作并购与政策研究 |

阅读和呈现以中文为主，信源范围面向全球。摘要重点交代产品何时可用、在哪些地区/作物上适用、已有何种田间证据，以及效率、成本、兼容性和规模化部署的变化。

## 本地预览

需要 **Node.js 24.11+** 和 **PostgreSQL 16 或 17**，或使用带 Compose 的 Docker。部署方式见 [部署文档](docs/deploy.md)。

在项目根目录执行：

```bash
npm ci
node scripts/init-env.ts
createdb precisionaghot
```

`init-env.ts` 生成本地 `.env` 和管理员密码。将下面的本地地址配置写入 `.env`，保留其余生成的随机密钥：

```dotenv
DATABASE_URL=postgres://你的本机用户名@127.0.0.1:5432/precisionaghot
API_BASE_URL=http://127.0.0.1:3001
SITE_URL=http://localhost:3000
COLLECT_ENABLED=false
MODEL_CALLS_ENABLED=false
FEISHU_CONTENT_PUSH_ENABLED=false
FEISHU_INTERNAL_ENABLED=false
INDEXNOW_SUBMIT_ENABLED=false
```

初始化并构建：

```bash
node --env-file=.env scripts/migrate.ts
node --env-file=.env scripts/seed.ts
npm run build -w @aihot/web
```

如需先导入经过人工核对的来源摘要，保持上述安全开关关闭，在 Node.js 24 下运行：

```bash
node --env-file=.env scripts/import-curated.ts --input .data/your-curated-materials.json
```

输入是 JSON 数组或含 `items` 数组的对象。每项包含已有 `sourceId`、真实 `url`、`originalTitle`（或 `title`）、原始 `publishedAt`、人工 `titleZh` / `summaryZh`、合法 `category` 和 `tags`，可附 `subjects` 与核对证据 `evidence`。导入器保留原日期和来源，只发布摘要与原文链接，记录人工整理且不设置评分或精选。重复导入会跳过已有稿件，不覆盖后续人工修改；材料应留在被 Git 忽略的 `.data/`。

分别在三个终端中运行：

```bash
node --env-file=.env apps/api/src/main.ts
node --env-file=.env apps/worker/src/main.ts
NODE_ENV=production node --env-file=.env apps/web/server.ts
```

打开 <http://localhost:3000>，后台在 `/admin`。以上配置用于预览，不会自动抓取或调用模型。后台源码和 npm workspace 名仍沿用 `@aihot/*`，以保留框架接口兼容性，网站显示使用 PrecisionAGHOT。

使用 Docker 时，先生成 `.env`、确认安全开关关闭，再执行 `docker compose up -d --build`；Docker 内部数据库连接无需填写上述本机 `DATABASE_URL`。原部署文档中的 `myhot` 是目录/数据库示例，可替换为自己的名称。

## 开始实际采集

先确认候选信源及分类，配置 `.env` 中的 `LLM_BASE_URL`、`LLM_API_KEY` 和 `LLM_MODEL`，再主动开启 `COLLECT_ENABLED` 与 `MODEL_CALLS_ENABLED`。模型调用只在 worker 任务中发生，并经过回执和预算熔断；读者打开网页不触发模型调用。

默认公开摘要和原文链接，`site_fulltext` 与 `syndicate_fulltext` 保持关闭。信源的官网或 RSS 可访问，并不等于有权转载全文。已有数据库中的信源不会被种子配置覆盖，需要在后台逐项调整。

公开部署前还需配置实际 `SITE_URL`、域名、HTTPS、备份、访问日志和联系渠道，并由运营者确认 [使用规则模板](industry/pages/terms.md) 与 [隐私说明模板](industry/pages/privacy.md)。本次行业改造未代替这些决定。

## 开发检查

```bash
npm run typecheck
DATABASE_URL=postgres://127.0.0.1:5432/precisionaghot_test node scripts/migrate.ts
DATABASE_URL=postgres://127.0.0.1:5432/precisionaghot_test npm test
npm run build -w @aihot/web
node --test apps/web/tests/*.test.ts
node scripts/smoke.ts --base http://localhost:3000
```

测试库先自行创建为空库，名称必须以 `_test` 或 `_ci` 结尾。测试提供商使用本地 stub；不要加载真实凭据或调用外部服务。烟雾检查需要先启动网站。

## 文档

| 文档 | 内容 |
|---|---|
| [精准农业版本说明](docs/precision-agriculture.md) | 行业边界、编辑原则、启用与上线前的事项 |
| [行业定制](docs/customize.md) | 行业包配置方法，上游默认例子仍用于说明接口 |
| [信源](docs/sources.md) | 六种采集方式、分级、全文授权与外部推送 |
| [精选与校准](docs/selection.md) | 双次评分、标注样本和门槛校准 |
| [事件归组与关系评测](docs/grouping.md) | 同一事件、后续进展与关系评测 |
| [部署](docs/deploy.md) | Docker、本机进程、域名与 HTTPS、备份 |
| [架构](docs/architecture.md) | API、worker、SSR 网站和统一公开读取层 |

技术栈：Node.js · TypeScript · React Router · Fastify · PostgreSQL · pg-boss · Tailwind CSS · Docker Compose。

## 许可与致谢

**鸣谢卡哥。** 原始框架由 AI 自媒体博主 **数字生命卡兹克** 创作，原项目为 [KKKKhazix/AIHOT](https://github.com/KKKKhazix/AIHOT)。感谢卡哥提供采集、双次筛选、事件归组、日报与开放接口的基础。本项目是基于上游的农业定制与界面改造；原作者版权声明和提交历史均予以保留。

本项目与农业定制改动以 [MIT 许可证](LICENSE) 开源。AIHOT 的名字和 Logo 不在许可范围内，本版本使用独立站点品牌。字体、模型厂商和其他第三方资产有各自的许可和商标归属，见 [NOTICE](NOTICE)。
