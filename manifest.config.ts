import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "AI评论洞察",
  version: "0.1.0",
  description:
    "一键提取电商平台当前页可见评论，用你自己的 AI API Key 分析好评差评、用户画像和改进建议。",
  permissions: ["storage", "activeTab", "scripting", "windows"],
  host_permissions: [
    "https://taobao.com/*",
    "https://*.taobao.com/*",
    "https://tmall.com/*",
    "https://*.tmall.com/*",
    "https://jd.com/*",
    "https://*.jd.com/*",
    "https://*.jd.hk/*",
    "https://api.deepseek.com/*",
    "https://revenue.ezboti.com/*",
  ],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_title: "AI评论洞察",
    default_icon: {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png",
    },
  },
  content_scripts: [
    {
      matches: [
        "https://taobao.com/*",
        "https://*.taobao.com/*",
        "https://tmall.com/*",
        "https://*.tmall.com/*",
        "https://jd.com/*",
        "https://*.jd.com/*",
        "https://*.jd.hk/*",
      ],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: true,
    },
  ],
  icons: {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png",
  },
  minimum_chrome_version: "110",
});
