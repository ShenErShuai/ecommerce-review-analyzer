# AI评论洞察

一个 Chrome 扩展：在淘宝 / 天猫 / 京东商品页一键提取**当前页可见评论**，用你自己的 AI API Key 生成好评卖点、差评痛点、用户画像和改进建议，并支持导出 CSV。

> BYOK（Bring Your Own Key）：插件不自带 AI 额度、不代管 Key，调用费用直接结算给你自己的 AI 服务商。

![宣传图](store/promo-440x280.png)

## 功能

| 能力 | 说明 | 版本 |
|---|---|---|
| 评论提取 | 淘宝 / 天猫 / 京东商品页当前已显示的评论，含 iframe | 免费 |
| AI 分析 | 好评卖点、差评痛点、用户画像、改进建议 | 免费 |
| 免费额度 | 每天 3 次，按东八区自然日 | 免费 |
| 回复模板 | 好评 / 差评客服回复，可直接照着回 | Pro |
| 导出 CSV | UTF-8 BOM，Excel 直接打开不乱码 | Pro |
| 翻页合并 | 手动翻页后再次提取，去重合并多页评论 | Pro |
| 不限次数 | Pro 买断后不再计次 | Pro |

设计上有意不做的事：不自动登录、不自动翻页、不做后台持续采集，只读取你当前页面上已经可见的内容。

## 安装（本地加载）

```bash
npm install
npm run build
```

然后打开 `chrome://extensions`，开启右上角**开发者模式**，点**加载已解压的扩展程序**，选择项目里的 `dist/` 目录。

## 开发

```bash
npm run dev     # Vite 开发模式，改代码后到 chrome://extensions 重新加载
npm run build   # 生成图标 + 类型检查 + 打包到 dist/
npm run icons   # 只重新生成 public/icons 下的三个尺寸
```

需要 Node.js 18+。`npm run icons` 依赖 macOS 自带的 `sips`，其他系统可跳过该步、直接使用仓库里已生成的图标。

## 配置

扩展要跑起来只需要一样东西：一个 DeepSeek API Key，在插件弹窗的**设置**里填写，保存在 `chrome.storage.local`，只在 background 里读取，不会注入页面脚本。

如果要做付费，再配置艺爪凭证：

```bash
cp .env.example .env.local
# 填入 VITE_EZREVENUE_PROJECT_ID / VITE_EZREVENUE_PROJECT_SECRET
```

凭证来自 [艺爪控制台](https://revenue.ezboti.com/)。**不配置也能正常开发**：此时付费墙不可用，设置里会出现本地 Pro 开关，用于验收 Pro 功能。

> 注意：Vite 会把 `VITE_*` 变量内联进扩展包，凭证最终会随扩展分发到用户侧。这只能降低滥用，不能当成绝对保密，真正的权益校验在艺爪服务端。详见 [方案文档](AI评论洞察-完整方案.md) 附录 B。

## 隐私

- 插件没有开发者自建的业务后端，不上报、不存储你的任何数据
- 评论会发送到**你自己配置的 AI 服务商**（当前为 DeepSeek）用于分析
- 会员状态与支付由艺爪处理，只传一个浏览器本地生成的匿名设备标识
- 不读取订单、地址、支付信息或账号密码

完整条款见 [store/privacy.html](store/privacy.html)。

## 技术栈

Manifest V3 + TypeScript + React 18 + Vite 5 + Tailwind CSS + [@crxjs/vite-plugin](https://crxjs.dev/)。

## 目录结构

```text
src/
  background/service-worker.ts   # 消息路由、调用 AI、额度、艺爪会员
  content/
    index.ts                     # 内容脚本入口
    widget.ts                    # 页面右下角悬浮卡片
    extractor.ts                 # 多适配器汇聚与去重
    adapters/{taobao,jd}.ts      # 各平台评论提取
  popup/                         # React 弹窗（设置、进度、结果）
  ai/
    client.ts                    # AI 调用入口
    prompts.ts                   # 分析 Prompt
    providers/deepseek.ts        # DeepSeek 适配
  shared/                        # 类型、常量、消息协议、CSV、平台识别
  storage/                       # chrome.storage 封装
vendor/ezrevenue-sdk/            # 艺爪官方插件 SDK（见下方「第三方」）
store/                           # 上架物料：隐私政策、商店文案、图标源文件
scripts/generate-icons.mjs       # 从母图缩出 16/48/128 图标
manifest.config.ts               # 扩展清单
```

AI 调用链固定为 `content 提取 → background 调 AI → popup / 悬浮卡片展示`，API Key 不进入页面脚本。

## 关键设计取舍

- **权限从紧**：只声明当前用到的站点与 API，不为「以后可能用到」提前申请权限
- **免费额度靠本地计数**：清存储即可绕过，接受这个限制，不做过度设计
- **选择器需要实页验证**：各平台评价区常在异步模块或 iframe 里，类名会变，适配器以真实页面为准
- **Pro 走艺爪**：不自研 License Key，不写只校验格式的假验签 Worker

## 路线图

按节点推进，上一节点验收通过才开始下一个，不按日历排期：

已完成 N0 工程骨架、N1 实页提取、N2 分析体验、N3 Pro 能力、N4 艺爪付费。

接下来是 N5 上架物料（隐私政策托管、商店截图、开发者账号）和 N6 提交 Chrome Web Store，之后是 N7 抖音 / 小红书适配。

详细标准见 [方案文档](AI评论洞察-完整方案.md) 第 5 节。

## 第三方

`vendor/ezrevenue-sdk/` 是[艺爪付费官方浏览器插件示例](https://github.com/guyskk/ezrevenue-browser)的 SDK 副本，版权与许可归原作者所有，此处仅作免安装依赖引用。升级时请以上游仓库为准。

图片来源：图标与宣传图由 `store/icon.html`、`store/promo-440x280.html` 渲染生成，字体使用系统自带字体。

## 免责声明

本扩展仅读取用户当前页面上已经可见的评论内容，不绕过任何登录、验证码或访问控制。请遵守目标网站的服务条款，并将分析结果用于合规用途。

## License

[MIT](LICENSE)
