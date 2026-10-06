# AI 评论洞察（国内版）完整方案

> 版本：v1.8  
> 日期：2026-09  
> 产品名：AI评论洞察  
> 仓库名：`ecommerce-review-analyzer`  
> 目标平台：Google Chrome（Chrome Web Store）  
> 变现模式：BYOK + 艺爪付费买断  
> 推进方式：按节点，不按周。当前节点未验收，不开下一个。  
> 当前节点：N5 上架物料

---

## 0. 项目一句话

做一个浏览器插件：在淘宝、京东、抖音、小红书、拼多多商品页，一键提取**当前页可见评论**，调用用户自己的 AI API Key，自动生成好评卖点、差评痛点、用户画像、改进建议、客服回复模板，并支持导出 CSV。

核心公式：

> 赚钱 = 需求 × 付费意愿 × 获客渠道 × 转化率 × 复购/客单价

你的优势：

- 会 AI 开发
- 几乎 0 预算（Chrome Web Store 一次性 $5）
- 不用地推销售
- 商店自带搜索流量
- AI 成本由用户承担

---

## 1. 项目概述

### 1.1 目标用户

- 电商卖家：淘宝、京东、拼多多、抖音小店
- 自媒体/内容创作者：小红书、抖音
- 产品经理/运营：需要看用户反馈
- 代运营团队：需要批量分析评论

### 1.2 核心痛点

- 评论太多，人工看不过来
- 不知道差评集中在哪
- 不知道用户真正购买理由
- 不会写客服回复
- 不会整理成表格汇报

### 1.3 功能按节点

只按依赖排序。上一节点验收通过，才开始下一节点。

| 节点 | 做什么 | 完成标准 |
|---|---|---|
| N0 工程骨架 | 方案对齐、扩展工程、Popup、DeepSeek、本地 3 次/天 | `npm run build` 通过，能加载 `dist/` |
| N1 实页提取 | 淘宝 / 天猫 / 京东当前页可见评论能抽出 | 三站各至少 1 个真实商品页抽出有效评论 |
| N2 分析体验 | 错误态、额度、结果展示可独立演示 | 填 Key → 出四块结果；失败有明确文案，不白屏 |
| N3 Pro 能力 | CSV（UTF-8 BOM）、回复模板、手动翻页合并 | 免费版不可用；本地 Pro 开关打开后可用 |
| N4 艺爪付费 | 买断墙、权益回写，替换本地 Pro 开关 | 付款后无限次 + Pro 能力解锁 |
| N5 上架物料 | 隐私政策页、截图、宣传图、Chrome 开发者账号 | 附录 C 中 Chrome 相关项全部勾上 |
| N6 提交 Chrome | 提交 Chrome Web Store | 商店页可访问，或审核中有单号 |
| N7 抖音 / 小红书 | 先实页验证选择器，再写适配器 | 两站各至少 1 个真实页抽出有效评论 |
| N8 拼多多 + 第二模型 | 拼多多适配；通义 / 智谱 | 拼多多实页可抽；设置里能切换模型 |
| N9 冷启动 | Chrome 商店关键词、内容长尾 | Chrome 已上架后再做 |

情感分布图不单列节点：等 Prompt 能稳定返回正负面数量，并入当时正在做的体验节点。

### 1.4 支持平台

- N1：淘宝、天猫、京东
- N7：抖音、小红书
- N8：拼多多

### 1.5 变现模式

- 免费版：每天 3 次，支持淘宝、天猫、京东
- Pro 买断版：¥99，首发 ¥69，无限次，全平台，导出 CSV，回复模板
- 团队版：¥299 / 5 个席位（由艺爪侧配置，不自研发码）

会员状态以艺爪为准，**不自研 License Key，不自建校验 Worker**。

### 1.6 成本估算

| 项目 | 费用 |
|---|---|
| Chrome Web Store 开发者注册 | 一次性 $5 |
| 艺爪付费 | 收款 100 万内免费 |
| 域名（可选，隐私政策页） | ¥50/年 |
| AI 调用成本 | 用户承担，BYOK |
| 合计 | ≈ $5 + 可选域名 |

---

## 2. 技术方案

### 2.1 整体架构

```text
┌──────────────────────────────────────────────┐
│              Browser Extension                │
│                                              │
│  Popup (React)     Content Script            │
│  设置 / 展示   ←→   评论提取适配器            │
│       │                    │                 │
│       └────────┬───────────┘                 │
│                ▼                             │
│        Background Service Worker             │
│        · 读 API Key / 每日次数               │
│        · 调用用户的 AI API                   │
│        · N4 起查询艺爪会员状态                │
└────────────────┼─────────────────────────────┘
                 │
     ┌───────────┴────────────┐
     │  DeepSeek（N0～N2）     │
     │  艺爪付费（N4）         │
     │  通义 / 智谱（N8）      │
     └────────────────────────┘
```

数据流（必须遵守）：

1. Content Script 只负责从当前页（含同域 iframe）提取可见评论，**不读 API Key**
2. Popup 发起「提取并分析」，把页面评论交给 Background
3. Background 读取本地 Key、校验次数，再请求 AI
4. 结果回传 Popup 展示

设计原则：

- 插件**无自建业务后端**。AI 走用户自己的 Key；会员走艺爪
- API Key、次数、设置只放 `chrome.storage.local`
- 以 **Google Chrome + Manifest V3** 为准开发和测试；其他 Chromium 浏览器不进主节点

### 2.2 技术栈

- TypeScript
- Vite 5
- React 18
- TailwindCSS 3
- @crxjs/vite-plugin 2
- chrome.storage.local
- Manifest V3
- N0～N2 模型：DeepSeek `deepseek-chat`
- N4 会员：艺爪付费 SDK
- N8 模型：通义千问、智谱

### 2.3 目录结构

```text
ecommerce-review-analyzer/
├── AI评论洞察-完整方案.md
├── manifest.config.ts
├── src/
│   ├── popup/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── index.css
│   │   └── components/
│   │       ├── ReviewSummary.tsx
│   │       └── ApiKeySettings.tsx
│   ├── content/
│   │   ├── index.ts
│   │   ├── extractor.ts
│   │   └── adapters/
│   │       ├── types.ts
│   │       ├── taobao.ts
│   │       └── jd.ts
│   ├── background/
│   │   └── service-worker.ts
│   ├── ai/
│   │   ├── client.ts
│   │   ├── providers/
│   │   │   └── deepseek.ts
│   │   └── prompts.ts
│   ├── storage/
│   │   └── index.ts
│   └── shared/
│       ├── types.ts
│       ├── constants.ts
│       └── messages.ts
├── public/
│   └── icons/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

按节点再补：N3 导出与回复模板；N4 艺爪 SDK；N7 `douyin.ts` / `xiaohongshu.ts`；N8 `pdd.ts`、`qwen.ts` / `zhipu.ts`。

### 2.4 Manifest V3 配置

权限从紧：只声明当前节点用到的站点与 API。N4 再加艺爪，N7 / N8 再加对应平台和模型域名，避免审核时解释未使用权限。

```json
{
  "manifest_version": 3,
  "name": "AI评论洞察",
  "version": "0.1.0",
  "description": "一键提取电商平台当前页可见评论，用你自己的 AI API Key 分析好评差评、用户画像和改进建议。",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://*.taobao.com/*",
    "https://*.tmall.com/*",
    "https://*.jd.com/*",
    "https://api.deepseek.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/index.html"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.taobao.com/*",
        "https://*.tmall.com/*",
        "https://*.jd.com/*"
      ],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  "minimum_chrome_version": "110"
}
```

后面节点再加（不要提前写进已上架包，除非该节点已做完）：

- `https://*.douyin.com/*`、`https://*.xiaohongshu.com/*`、`https://*.pinduoduo.com/*`、`https://*.yangkeduo.com/*`、`https://*.jinritemai.com/*`
- `https://dashscope.aliyuncs.com/*`、`https://open.bigmodel.cn/*`
- `https://revenue.ezboti.com/*`（艺爪）

权限说明：

- `storage`：保存 API Key、设置、当日次数
- `activeTab`：用户点击插件时读取当前页
- `scripting`：必要时注入/辅助提取
- `host_permissions`：仅支持的电商域 + 用户选择的 AI 域名

### 2.5 评论提取适配器

```typescript
export interface ReviewAdapter {
  name: string;
  match: (url: string) => boolean;
  extract: () => Promise<RawReview[]>;
}

export interface RawReview {
  content: string;
  rating?: number;
  date?: string;
  author?: string;
}
```

实现约束：

- 只收集**用户当前已经能看见**的评论，不自动登录、不绕过验证、不后台翻页爬取
- 淘宝 / 天猫评价常在异步模块或 iframe 里，**选择器必须对着实页验证**，文档里的 class 只是起点，不能当最终答案
- 每个适配器写多组兜底选择器，抽完去空、去重
- `all_frames: true`，Background 汇总各 frame 结果
- Pro 的「多页」= 用户自己翻页后再次提取，与本地上次结果合并；**禁止自动连爬**

适配器体量：能跑通即可，不要按「60～100 行」估进度。线上 DOM 变一次就要改一次。

### 2.6 AI 调用层 BYOK

N0～N7 只接 DeepSeek。通义、智谱放到 N8。

| 提供商 | API 端点 | 模型 | 节点 |
|---|---|---|---|
| DeepSeek | api.deepseek.com | deepseek-chat | N0 起 |
| 通义千问 | dashscope.aliyuncs.com | qwen-plus | N8 |
| 智谱 | open.bigmodel.cn | glm-4-flash | N8 |

规则：

- 只在 Background 里带 Key 发请求
- 单次最多送 50 条评论，超出截断并在 UI 提示
- Key 只存 `chrome.storage.local`，不进 content script，不打日志

### 2.7 Prompt 模板

N0～N2 返回字段：

```json
{
  "positiveSummary": "好评核心卖点总结，80字以内",
  "negativeSummary": "差评核心痛点总结，80字以内",
  "userPersona": ["用户画像标签1", "标签2", "标签3"],
  "improvementSuggestions": ["改进建议1", "改进建议2", "改进建议3"]
}
```

`replyTemplates` 在 N3 再加；正负面条数等图表字段有数据需求时再加，避免组件先于数据存在。

### 2.8 会员与付费（N4）

不自研 `AIREV-...` License，不自建 Cloudflare 校验 Worker。

N4 接入 [艺爪付费](https://www.ezboti.com/docs/revenue/start/)：

- 控制台：https://revenue.ezboti.com/
- 浏览器插件集成：https://github.com/guyskk/ezrevenue-browser
- 凭证：`projectId` + `projectSecret` + 付费墙别名
- Popup 打开艺爪付费墙；Background 查询会员状态后解锁次数 / 平台 / 导出

免费次数仍可先做本地计数，Pro 以艺爪返回的权益为准。

### 2.9 免费版限制

| 功能 | 免费版 | Pro 买断版 |
|---|---|---|
| 每日分析次数 | 3 次（本地，东八区） | 无限 |
| 支持平台 | 淘宝、天猫、京东 | 全部平台 |
| 导出 CSV | 不支持 | 支持（UTF-8 BOM） |
| 回复模板 | 不支持 | 支持 |
| 多页合并 | 不支持 | 用户手动翻页后合并 |

本地次数防君子不防小人，可接受。

### 2.10 开发环境

```json
{
  "devDependencies": {
    "typescript": "^5.5",
    "vite": "^5.4",
    "@crxjs/vite-plugin": "^2.0",
    "@vitejs/plugin-react": "^4.3",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@types/chrome": "^0.0.270",
    "tailwindcss": "^3.4"
  }
}
```

开发流程：

1. 在本仓库根目录安装依赖（不要再 `npm create vite`，工程已初始化好）
2. `npm run dev` 做扩展热更新，或 `npm run build` 出 `dist/`
3. Chrome 打开 `chrome://extensions`
4. 开启开发者模式
5. 加载解压的 `dist/`

---

## 3. 定价体系

### 3.1 定价策略

国内用户对订阅制抵触，优先买断制。

| 版本 | 价格 | 定位 |
|---|---|---|
| 免费版 | ¥0 | 获客和口碑 |
| Pro 买断版 | ¥99 | 主力收入 |
| Pro 首发优惠 | ¥69 | 首次上架后的首发期 |
| 团队版 | ¥299 / 5 个席位 | 电商团队 |

为什么是 99 元：

- 国内工具插件常见买断价 49～199 元
- 99 元处于冲动消费和认真考虑的临界点
- 竞品月费 29～59 元，买断 99 元性价比高

为什么不做订阅制：

- 个人开发者持续迭代承诺弱
- 国内订阅扣款体验不成熟
- 买断制回款快

### 3.2 支付接入

**只用艺爪付费**，到 N4 再接入，不要提前自研发码。N3 先用本地 Pro 开关把能力做出来。

- 微信支付、支付宝、收款码
- 个人开发者可收款
- 买断、兑换码、席位均可在控制台配
- 累计收款 100 万元内免费
- 文档：https://www.ezboti.com/docs/revenue/start/
- 插件示例：https://github.com/guyskk/ezrevenue-browser

不纳入本项目：

- 支付宝「AI 收」：面向 Agent 按次调用（HTTP 402），不是卖买断插件
- 自研 HMAC License + Cloudflare Worker
- 微信支付个人商户号、KodePay、Lemon Squeezy

### 3.3 定价页文案

```text
┌──────────────────────────────────┐
│        解锁 AI评论洞察 Pro        │
│                                  │
│  ✅ 无限次分析                    │
│  ✅ 淘宝/京东/抖音/小红书/拼多多   │
│  ✅ 一键导出 CSV                 │
│  ✅ 好评/差评回复模板             │
│  ✅ 永久使用，无月费              │
│                                  │
│      ¥99  ¥69 限时首发价         │
│                                  │
│         [ 前往开通 ]              │
└──────────────────────────────────┘
```

开通跳转艺爪付费墙，不再做「手输 License Key」主路径。

### 3.4 收入测算

| 付费人数 | 单价 | 收入 |
|---|---|---|
| 20 人 | ¥99 | ¥1,980 |
| 100 人 | ¥99 | ¥9,900 |
| 500 人 | ¥99 | ¥49,500 |
| 1000 人 | ¥99 | ¥99,000 |

副业目标先定：1000 安装，2% 付费，20 人付费 = ¥1,980。

---

## 4. 上架清单

开发和上架都以 **Google Chrome / Chrome Web Store** 为准。Edge、360、QQ 不进主节点，有余力再另说。

### 4.1 平台优先级

| 优先级 | 平台 | 费用 | 审核周期 | 备注 |
|---|---|---|---|---|
| P0 | Chrome Web Store | 一次性 $5 | 通常数小时到 14 天 | **唯一主渠道** |
| 可选 | Microsoft Edge Add-ons | 免费 | 1～7 天 | 同一套 MV3 包，主路径不做 |
| 可选 | 360 / QQ | 免费 | 邮件审核 | 主路径不做 |

### 4.2 Chrome Web Store 上架

开发者注册：

1. 打开 [Chrome Web Store 开发者后台](https://chrome.google.com/webstore/devconsole)
2. 使用 Google 账号登录
3. 支付一次性 $5 注册费
4. 完成开发者身份验证（可能要求手机号、证件）
5. 创建商品，上传 zip（用 `dist/` 打包，不要上传源码仓库）

提交时要准备：

- 商店标题、简短描述、详细描述
- 图标 128px（商店会用）
- 截图至少 1 张，建议 3～5 张（1280×800 或 640×400）
- 小宣传图 440×280（建议）
- 隐私政策 URL
- 权限 justification：每一条权限一句话说明
- Privacy practices：说明会把评论发给用户配置的 AI，Key 只存在本地

注意事项：

- 文案用「提取当前页可见评论」，不要写「爬虫」「抓取全部数据」
- 遵守 single purpose：本扩展只做评论洞察
- 不要远程加载可执行代码（MV3 本就不允许）
- 付费走艺爪属于扩展内数字商品，不走 Chrome 内购
- 新账号审核可能更慢，描述和截图必须和真实功能一致

### 4.3 物料清单

| 物料 | 规格 | 要求 |
|---|---|---|
| 插件图标 | 16 / 48 / 128 px | PNG，透明背景 |
| 商店截图 | 1280×800 或 640×400 | 至少 1 张，建议 3～5 张 |
| 小宣传图 | 440×280 | 建议提供 |
| 隐私政策 URL | — | 必须提供，且与真实数据流一致 |
| 权限说明 | — | 每条一句话 |
| Privacy practices | 后台表单 | 勾选本地存储 + 发往第三方 AI |

### 4.4 商店文案模板

标题：

```text
AI评论洞察 - 淘宝京东抖音评论分析导出助手
```

简短描述：

```text
一键提取电商平台当前页可见评论，用你自己的 AI Key 分析好评差评、用户画像和改进建议。适用于淘宝、京东等平台。
```

详细描述：

```markdown
## 功能
- 在淘宝/京东等商品页，一键提取当前页可见评论
- 使用你自己的 AI API Key 生成：好评核心卖点、差评痛点、用户画像、改进建议
- 支持客服回复模板、导出 CSV（Excel 可直接打开；N3 起）

## 使用方式
1. 在插件设置中填写 DeepSeek API Key
2. 打开淘宝、天猫或京东商品详情页
3. 点击插件图标，提取并分析

## 隐私说明
本插件不运营自建业务服务器。评论仅在本地提取后，由你配置的 AI 服务商分析。
API Key 只保存在浏览器本地。开通 Pro 时，会员状态由艺爪付费处理。
```

权限说明：

- `storage`：保存 API Key、设置和当日次数
- `activeTab`：点击插件时读取当前页面
- `scripting`：辅助提取当前页评论
- `host_permissions`：仅在支持的电商平台，以及你选择的 AI 接口运行

### 4.5 审核避坑

- 功能描述要详细
- 权限说明要完整
- 没用到的权限不要写
- 隐私政策必须可访问，且承认会请求第三方 AI / 支付
- 后台 Privacy practices 与真实行为一致
- 截图要展示真实功能（在 Chrome 里截）
- 不要出现「爬虫」「抓取全部数据」等敏感词
- 单一用途：不要夹带无关工具

---

## 5. 节点路线图

规则：

- **按节点串行**，不按日历排期
- 每个节点有完成标准；没达到就不进入下一节点
- 节点内部可以拆小任务并行，节点之间不跳号
- 商店审核、平台 DOM 变更等外部等待，不算「到点该做下一件」

| 节点 | 状态 | 依赖 | 做什么 | 完成标准 |
|---|---|---|---|---|
| N0 工程骨架 | 已完成 | — | 方案、Vite/CRXJS、Popup、DeepSeek、本地额度 | `npm run build` 通过，能加载 `dist/` |
| N1 实页提取 | 已完成 | N0 | 对着淘宝/天猫/京东实页改选择器 | 真实商品页能抽出有效评论 |
| N2 分析体验 | 已完成 | N1 | 补齐空态、错态、加载态，保证可演示 | 填 Key 到四块结果可走通；失败有文案 |
| N3 Pro 能力 | 已完成 | N2 | CSV（UTF-8 BOM）、回复模板、手动翻页合并 | 免费不可用，本地 Pro 开关可用 |
| N4 艺爪付费 | 已完成 | N3 | 接艺爪，付款后写回权益 | 付款后无限次 + Pro 解锁 |
| N5 上架物料 | **当前** | N4 | 隐私政策、截图、宣传图、Chrome 开发者账号 | 附录 C 的 Chrome 项全部勾上 |
| N6 提交 Chrome | 未开始 | N5 | 提交 Chrome Web Store | 有审核单号或商店页 |
| N7 抖音/小红书 | 未开始 | N6 | 先实页验证再写适配器 | 两站各 ≥1 个真实页可抽 |
| N8 拼多多+第二模型 | 未开始 | N7 | 拼多多；通义/智谱 | 拼多多可抽；设置可切模型 |
| N9 冷启动 | 未开始 | N6 | Chrome 商店关键词、内容长尾 | Chrome 已上架后再铺 |

N4 已验收：艺爪项目、权益 `equity_vip`、付费界面 `paywall_vip` 均已配好，真实付款后插件显示「我的会员」，额度变为不限次数，回复模板与导出 CSV 解锁。

N5 拆开做（当前只做这些）：

已产出，都在 `store/`：

1. 隐私政策页 `store/privacy.html`，含数据说明与逐条权限说明（邮箱待填）
2. 商店文案 `store/listing.md`：名称、简短说明、详细说明、权限理由、图片清单
3. 图标 `public/icons/icon{16,48,128}.png`，带「评」字，源文件 `store/icon.html`
4. 宣传小图 `store/promo-440x280.png`，源文件 `store/promo-440x280.html`
5. 开源物料：`README.md`、`LICENSE`（MIT）、`.env.example`

开源与上架互不冲突：仓库公开源码，扩展包仍从 `dist/` 打包上传商店。凭证按附录 B 的规则处理，仓库里不出现 `projectSecret`。

还差的都需要你本人操作：

5. 把邮箱补进 `privacy.html`，并把它挂到公开可访问的地址
6. 截 1280×800 截图 1～5 张：四块结果、提取中、Pro 能力
7. 注册 Chrome Web Store 开发者账号，一次性 $5

不要在 N5 里写新功能。截图必须是真实运行画面，不允许拼贴假数据。

---

## 6. 推广冷启动

不靠销售，靠平台搜索和内容长尾。

可做：

- Chrome Web Store 关键词优化
- 知乎回答：评论分析、电商运营、差评处理
- 小红书发使用截图
- B 站发 3 分钟演示
- 掘金/CSDN 发开发复盘
- 电商卖家群分享免费版

不要做：

- 天天拍抖音
- 地推
- 付费广告
- 大规模私域运营

---

## 7. 风险与合规

- 只处理当前页用户可见评论
- 不自动登录
- 不自动翻页、不高频爬取
- 不绕过平台验证
- 遵守平台条款
- 隐私政策写清楚第三方 AI 与艺爪
- 不自建服务器收集用户评论或 API Key
- API Key 仅本地存储
- 不承诺法律、医疗、金融结论

---

## 附录 A：隐私政策模板

正式版已按此模板扩写为 `store/privacy.html`，直接用那个文件，下面的模板只作对照。

```text
隐私政策

最后更新：[日期]

本插件（AI评论洞察）由 [你的名称] 开发。

1. 我们不运营业务后端
本插件不把评论、API Key 或浏览记录发到开发者自己的服务器。

2. 评论如何被处理
用户点击分析后，当前页可见评论在本地提取，再发送到用户自己配置的
AI 服务商（当前为 DeepSeek）完成分析。

3. 本地存储
插件使用浏览器本地存储保存：API Key、插件设置、当日使用次数。
这些数据不会上传到开发者服务器。

4. 第三方服务
- AI 服务商：按其自己的隐私政策处理你发送的评论。
- 艺爪付费（开通 Pro 时）：处理支付与会员状态。
  文档：https://www.ezboti.com/docs/revenue/

5. 联系方式
[你的邮箱]
```

---

## 附录 B：艺爪付费接入要点（N4）

不要写「只检查 Key 格式」的 Worker。按官方插件示例接入：

1. 在 https://revenue.ezboti.com/ 创建项目，拿到 `projectId`、`projectSecret`
2. 复制 `.env.example` 为 `.env.local`，把凭证填进去（该文件已被 `.gitignore` 忽略，不会进仓库）
3. 配置买断商品与付费墙（¥99 / 首发 ¥69 / 团队席位）
4. `host_permissions` 增加 `https://revenue.ezboti.com/`
5. Background 注册艺爪 SDK，Popup 打开付费墙
6. 用返回的会员状态覆盖本地免费次数限制

参考：

- https://www.ezboti.com/docs/revenue/start/
- https://www.ezboti.com/docs/revenue/api-example-browser/
- https://github.com/guyskk/ezrevenue-browser

`projectSecret` 会打进扩展包，只能降低滥用，不能当成绝对保密。接受这个限制，靠艺爪服务端权益校验。

因此仓库里一律不提交凭证：真实值只存在于本地 `.env.local`，仓库只保留 `.env.example` 模板。没有凭证时插件仍可构建、可开发，设置页会出现本地 Pro 开关用于验收。

---

## 附录 C：上架前检查清单

- [ ] manifest.json 版本号正确
- [x] 图标 16/48/128 齐全
- [ ] 隐私政策 URL 可访问，且承认第三方 AI / 支付
- [ ] 只声明已使用的权限
- [ ] 商店标题含关键词
- [ ] 简短描述不超过限制
- [ ] 截图 3～5 张
- [x] 宣传图 440×280
- [ ] 免费版 3 次/天可验证
- [x] 艺爪开通与权益回写可走通
- [ ] 支付链接可打开
- [ ] 无「爬虫」「抓取全部」等敏感词
- [ ] Chrome Web Store 开发者账号已注册（$5 已付）
- [ ] Privacy practices 已填写
- [ ] 淘宝 / 天猫 / 京东实页提取已在 Chrome 复测

---

## 附录 D：常用链接

- Chrome Web Store：https://chromewebstore.google.com
- Chrome 开发者后台：https://chrome.google.com/webstore/devconsole
- 本地加载：`chrome://extensions`
- 艺爪付费：https://www.ezboti.com/revenue/
- 艺爪控制台：https://revenue.ezboti.com/
- 艺爪插件示例：https://github.com/guyskk/ezrevenue-browser
- DeepSeek：https://platform.deepseek.com
- 通义千问：https://dashscope.aliyun.com
- 智谱：https://open.bigmodel.cn

---

## 最后建议

如果只选一个方向，就做：

> Chrome 插件「AI评论洞察」  
> BYOK，免费 3 次/天，Pro ¥99 买断，首发 ¥69，收款走艺爪  
> 只上 Chrome Web Store

目标按结果计，不按月份：

- 上架完成：N6 过
- 能收款：N4 过且商店可安装
- 副业有第一笔收入：出现付费用户

主要投入是时间。唯一固定现金是 Chrome Web Store 一次性 $5。
