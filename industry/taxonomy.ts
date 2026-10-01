// 精准农业的分类、标签、主体名录和身份词典。
// 类别 key 用于公开网址和 API，上线后保持稳定；主题页按标签与实体归类。

/** section 为日报分节；guide 为模型归类提供边界。 */
export const CATEGORIES = [
  { key: "equipment", label: "农业装备", section: "装备与智能作业", guide: "拖拉机、播种机、收获机、喷施装备和智能农具的新机型与更新；变量作业、智能作业终端与机具控制。自动转向系统归 guidance，无人机归 drones，专用农业机器人归 robotics" },
  { key: "guidance", label: "自动转向", section: "导航与自动转向", guide: "农机自动转向、辅助驾驶、GNSS/RTK 校正、导航接收机、自动调头、机具引导、后装套件和定位技术更新；以订阅、服务网络或交付为核心的报道归 services，不把自动转向等同于无人作业" },
  { key: "drones", label: "农业无人机", section: "无人机与农业机器人", guide: "农业无人机的喷施、播撒、巡田、测绘与吊运，以及飞控、载荷和安全技术；以飞手培训、作业服务交付或服务网络为核心的报道归 services" },
  { key: "robotics", label: "农业机器人", section: "无人机与农业机器人", guide: "农业机器人和无人作业系统，覆盖除草、采摘、巡检、搬运、牧场自动化及其感知、安全与商业化" },
  { key: "sensing", label: "遥感监测", section: "监测与农艺决策", guide: "卫星和航空遥感、传感器、农业物联网、气象、土壤与作物监测、病虫害识别；农场管理平台归 software，咨询或遥感服务商业化归 services" },
  { key: "water", label: "水肥管理", section: "水肥与精准植保", guide: "智慧灌溉、水肥一体化、灌溉控制、土壤水分决策、精量施肥和精准植保，突出投入品效率与田间验证" },
  { key: "software", label: "软件平台", section: "农场软件与数据平台", guide: "FMIS/FMS、农场 ERP、农场管理软件、农业数据平台、农机车队和作业管理、成本与库存、追溯、API、数据互通、农业 AI 与决策支持产品" },
  { key: "services", label: "农业服务", section: "技术服务与数字化运营", guide: "农机作业服务、RTK/导航订阅、遥感与土壤检测服务、农艺咨询、无人机服务、设备维保与数字化运营；关注服务覆盖、订阅价格、商业交付、服务能力和商业模式；同一报道只有一个主分类，以设备/功能/性能为核心时归相应技术类别，以服务交付为核心时归本类" },
  { key: "industry", label: "产业政策", section: "全球产业与政策", guide: "精准农业与农机产业的融资并购、经营、合作、供应链、标准、数据权属、补贴、农机与无人机监管、贸易政策；只收与农业科技应用相关的变化" },
  { key: "paper", label: "研究", section: "研究与田间验证", guide: "农业科技论文、技术报告、数据集、独立评测与田间试验；区分实验室结果、试点和商业部署" },
  { key: "tip", label: "实践", section: "实践与行业观察", guide: "自动转向安装校准、变量作业处方、传感器部署、软件集成与田间实践，含可复现方法、投入产出和适用条件；服务商的商业交付动态归 services" },
  { key: "opinion", label: "观点", section: "实践与行业观察", guide: "农业科技与装备行业的访谈、评论、产业分析、采用率与商业模式观察，明确区分事实与判断" },
] as const;

/** 保留七个内容类型存储值，行业语义和权重与评分提示词同步。 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

/** 第一标签必须为以下分类标签之一。 */
export const CATEGORY_TAGS = [
  "装备发布", "产品更新", "论文/研究", "开源/仓库", "教程/实践", "现象/趋势", "行业观点", "评测/田间试验", "安全/合规", "行业动态", "政策/监管",
  "非农业/通用工具", "其他",
] as const;

export const TOPIC_TAGS = [
  "自动转向", "GNSS/RTK", "ISOBUS", "作业终端", "变量作业", "无人作业", "农业机器人", "无人机", "遥感", "传感器物联网", "智慧灌溉", "水肥一体化",
  "农场软件", "FMIS/FMS", "农场ERP", "数据互通", "农业AI", "农业技术服务", "农机作业服务", "农艺决策", "数字化运营", "土壤", "植保", "碳与可持续", "设施农业", "畜牧科技",
] as const;

export const ENTITY_TAGS = [
  "John Deere", "AGCO", "CNH", "Kubota", "CLAAS", "DJI", "XAG", "PTx Trimble", "Topcon", "CHCNAV", "FJ Dynamics", "Netafim", "Lindsay", "Valley",
  "Carbon Robotics", "Naïo", "Planet", "EOSDA", "AGRIVI", "Agworld", "Farmbrite", "USDA", "FAO",
] as const;

export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "教程/玩法": "教程/实践", "技巧/最佳实践": "教程/实践", "合作/生态": "行业动态", "融资/收购": "行业动态", "公司动态": "行业动态",
  合作: "行业动态", 生态: "行业动态", 融资: "行业动态", 收购: "行业动态", 投资: "行业动态", 并购: "行业动态",
  政策: "政策/监管", 监管: "政策/监管", 法规: "政策/监管", 安全: "安全/合规", 合规: "安全/合规",
  论文: "论文/研究", 研究: "论文/研究", paper: "论文/研究", papers: "论文/研究",
  "open-source": "开源/仓库", 开源: "开源/仓库", 仓库: "开源/仓库", repo: "开源/仓库",
  教程: "教程/实践", 指南: "教程/实践", 技巧: "教程/实践", 最佳实践: "教程/实践", 实践: "教程/实践",
  产品: "产品更新", 更新: "产品更新", 发布: "装备发布", 新机型: "装备发布", 趋势: "现象/趋势", 现象: "现象/趋势", 观点: "行业观点",
  评测: "评测/田间试验", 基准: "评测/田间试验", 田间试验: "评测/田间试验", "benchmark": "评测/田间试验",
  自动导航: "自动转向", 自动驾驶: "无人作业", 无人驾驶: "无人作业", "auto-steering": "自动转向", "autosteer": "自动转向",
  GNSS: "GNSS/RTK", RTK: "GNSS/RTK", 导航: "GNSS/RTK", "variable rate": "变量作业", VRT: "变量作业",
  农业无人机: "无人机", 植保无人机: "无人机", 无人机喷施: "无人机", UAV: "无人机",
  机器人: "农业机器人", 物联网: "传感器物联网", IoT: "传感器物联网", 传感器: "传感器物联网",
  精准灌溉: "智慧灌溉", 数字农业: "数字化运营", 农场管理软件: "农场软件", FMIS: "FMIS/FMS", FMS: "FMIS/FMS", ERP: "农场ERP",
  技术服务: "农业技术服务", 农业服务: "农业技术服务", 农机服务: "农机作业服务", 农艺咨询: "农艺决策", 行业: "行业动态", 动态: "行业动态",
  约翰迪尔: "John Deere", 大疆: "DJI", 极飞: "XAG", 久保田: "Kubota", 华测导航: "CHCNAV", 丰疆: "FJ Dynamics",
  通用工具: "非农业/通用工具", 非农业: "非农业/通用工具", "non-agriculture": "非农业/通用工具",
};

export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  model_release: "装备发布", product_launch: "产品更新", tool_or_prompt: "教程/实践", research_paper: "论文/研究",
  industry_event: "行业动态", opinion_analysis: "行业观点", tutorial_explainer: "教程/实践",
};

/** 公司、机构和服务商主体；品牌别名只用于识别，不代表独立主体。 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  "john-deere": { name: "John Deere 约翰迪尔", displayTag: "John Deere", aliases: ["John Deere", "Deere & Company", "约翰迪尔", "AutoTrac", "StarFire", "JDLink", "See & Spray", "Operations Center"] },
  agco: { name: "AGCO 爱科", displayTag: "AGCO", aliases: ["AGCO", "爱科", "Fendt", "Massey Ferguson", "Valtra", "Precision Planting"] },
  cnh: { name: "CNH", displayTag: "CNH", aliases: ["CNH", "CNH Industrial", "Case IH", "New Holland", "Raven", "Augmenta"] },
  kubota: { name: "Kubota 久保田", displayTag: "Kubota", aliases: ["Kubota", "久保田", "Kverneland"] },
  claas: { name: "CLAAS 科乐收", displayTag: "CLAAS", aliases: ["CLAAS", "科乐收", "365FarmNet"] },
  dji: { name: "DJI Agriculture 大疆农业", displayTag: "DJI", aliases: ["DJI", "大疆", "Agras", "DJI SmartFarm"] },
  xag: { name: "XAG 极飞", displayTag: "XAG", aliases: ["XAG", "极飞"] },
  "ptx-trimble": { name: "PTx Trimble", displayTag: "PTx Trimble", aliases: ["PTx Trimble", "Trimble Agriculture", "Precision-IQ", "NextSwath"] },
  topcon: { name: "Topcon 拓普康", displayTag: "Topcon", aliases: ["Topcon", "拓普康", "Topcon Agriculture", "Topcon Agriculture Platform"] },
  chcnav: { name: "CHCNAV 华测导航", displayTag: "CHCNAV", aliases: ["CHCNAV", "华测导航", "CHC Navigation"] },
  "fj-dynamics": { name: "FJ Dynamics 丰疆", displayTag: "FJ Dynamics", aliases: ["FJ Dynamics", "FJDynamics", "丰疆"] },
  netafim: { name: "Netafim 耐特菲姆", displayTag: "Netafim", aliases: ["Netafim", "耐特菲姆", "GrowSphere"] },
  lindsay: { name: "Lindsay 林赛", displayTag: "Lindsay", aliases: ["Lindsay", "林赛", "Zimmatic", "FieldNET"] },
  valley: { name: "Valley Irrigation", displayTag: "Valley", aliases: ["Valley Irrigation", "Valley 365", "Valmont"] },
  "carbon-robotics": { name: "Carbon Robotics", displayTag: "Carbon Robotics", aliases: ["Carbon Robotics", "LaserWeeder"] },
  naio: { name: "Naïo Technologies", displayTag: "Naïo", aliases: ["Naïo", "Naio", "Naïo Technologies", "Naio Technologies"] },
  planet: { name: "Planet Labs", displayTag: "Planet", aliases: ["Planet Labs", "PlanetScope"] },
  eosda: { name: "EOS Data Analytics", displayTag: "EOSDA", aliases: ["EOS Data Analytics", "EOSDA", "EOS Crop Monitoring"] },
  agrivi: { name: "AGRIVI", displayTag: "AGRIVI", aliases: ["AGRIVI", "AGRIVI FMS", "AGRIVI AI Engage"] },
  agworld: { name: "Agworld", displayTag: "Agworld", aliases: ["Agworld"] },
  farmbrite: { name: "Farmbrite", displayTag: "Farmbrite", aliases: ["Farmbrite"] },
  farmerp: { name: "FarmERP", displayTag: null, aliases: ["FarmERP", "Shivrai Technologies"] },
  usda: { name: "USDA 美国农业部", displayTag: "USDA", aliases: ["USDA", "美国农业部", "Agricultural Research Service"] },
  fao: { name: "FAO 联合国粮农组织", displayTag: "FAO", aliases: ["FAO", "联合国粮农组织", "Food and Agriculture Organization"] },
};

/** 输出中提到的主体也必须在原文出现，避免把厂商、品牌和试验成果张冠李戴。 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "john-deere", name: "John Deere", patterns: [/john\s+deere|deere\s*(?:&|and)\s*company|约翰迪尔|autotrac|starfire|jdlink|see\s*(?:&|and)\s*spray/i] },
  { id: "agco", name: "AGCO", patterns: [/\bagco\b|爱科|\bfendt\b|massey\s+ferguson|\bvaltra\b|precision\s+planting/i] },
  { id: "cnh", name: "CNH", patterns: [/\bcnh\b|case\s+ih|new\s+holland|\braven\s+(?:industries|precision)|\baugmenta\b/i] },
  { id: "kubota", name: "Kubota", patterns: [/kubota|久保田|kverneland/i] },
  { id: "claas", name: "CLAAS", patterns: [/\bclaas\b|科乐收|365farmnet/i] },
  { id: "dji", name: "DJI", patterns: [/\bdji\b|大疆|\bagras\b/i] },
  { id: "xag", name: "XAG", patterns: [/\bxag\b|极飞/i] },
  { id: "ptx-trimble", name: "PTx Trimble", patterns: [/ptx\s+trimble|trimble\s+agriculture|precision[ -]iq|nextswath/i] },
  { id: "topcon", name: "Topcon", patterns: [/topcon|拓普康/i] },
  { id: "chcnav", name: "CHCNAV", patterns: [/chcnav|chc\s+navigation|华测导航/i] },
  { id: "fj-dynamics", name: "FJ Dynamics", patterns: [/fj\s*dynamics|丰疆/i] },
  { id: "netafim", name: "Netafim", patterns: [/netafim|耐特菲姆|growsphere/i] },
  { id: "lindsay", name: "Lindsay", patterns: [/\blindsay\b|林赛|zimmatic|fieldnet/i] },
  { id: "valley", name: "Valley Irrigation", patterns: [/valley\s+(?:irrigation|365)|\bvalmont\b/i] },
  { id: "carbon-robotics", name: "Carbon Robotics", patterns: [/carbon\s+robotics|laserweeder/i] },
  { id: "naio", name: "Naïo Technologies", patterns: [/\bna[iï]o\b/i] },
  { id: "planet", name: "Planet Labs", patterns: [/planet\s+labs|planetscope/i] },
  { id: "eosda", name: "EOS Data Analytics", patterns: [/eosda|eos\s+data\s+analytics|eos\s+crop\s+monitoring/i] },
  { id: "agrivi", name: "AGRIVI", patterns: [/\bagrivi\b/i] },
  { id: "agworld", name: "Agworld", patterns: [/\bagworld\b/i] },
  { id: "farmbrite", name: "Farmbrite", patterns: [/\bfarmbrite\b/i] },
  { id: "farmerp", name: "FarmERP", patterns: [/\bfarmerp\b|shivrai/i] },
  { id: "usda", name: "USDA", patterns: [/\busda\b|美国农业部|agricultural\s+research\s+service/i] },
  { id: "fao", name: "FAO", patterns: [/\bfao\b|联合国粮农组织|food\s+and\s+agriculture\s+organization/i] },
];

export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "john-deere", domains: ["deere.com", "johndeere.com"] },
  { entityId: "agco", domains: ["agcocorp.com", "fendt.com", "masseyferguson.com", "valtra.com", "precisionplanting.com"] },
  { entityId: "cnh", domains: ["cnh.com", "cnhindustrial.com", "caseih.com", "newholland.com", "ravenind.com"] },
  { entityId: "kubota", domains: ["kubota.com", "kubota-global.net", "kvernelandgroup.com"] },
  { entityId: "claas", domains: ["claas.com"] },
  { entityId: "dji", domains: ["dji.com"] },
  { entityId: "xag", domains: ["xa.com"] },
  { entityId: "ptx-trimble", domains: ["ptxtrimble.com"] },
  { entityId: "topcon", domains: ["topcon.com", "topconpositioning.com"] },
  { entityId: "chcnav", domains: ["chcnav.com"] },
  { entityId: "fj-dynamics", domains: ["fjdynamics.com"] },
  { entityId: "netafim", domains: ["netafim.com"] },
  { entityId: "lindsay", domains: ["lindsay.com"] },
  { entityId: "valley", domains: ["valleyirrigation.com"] },
  { entityId: "carbon-robotics", domains: ["carbonrobotics.com"] },
  { entityId: "naio", domains: ["naio-technologies.com"] },
  { entityId: "planet", domains: ["planet.com"] },
  { entityId: "eosda", domains: ["eos.com"] },
  { entityId: "agrivi", domains: ["agrivi.com"] },
  { entityId: "agworld", domains: ["agworld.com"] },
  { entityId: "farmbrite", domains: ["farmbrite.com"] },
  { entityId: "farmerp", domains: ["farmerp.com"] },
  { entityId: "usda", domains: ["usda.gov"] },
  { entityId: "fao", domains: ["fao.org"] },
];

export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "john-deere", pattern: /@JohnDeere\b/i },
  { entityId: "agco", pattern: /@AGCOcorp\b/i },
  { entityId: "dji", pattern: /@DJIAgriculture\b/i },
];
