// 艺爪付费配置。
//
// 真实凭证不要写进这个文件：复制 .env.example 为 .env.local（已被 .gitignore 忽略）再填。
// 构建时 Vite 会把 VITE_* 变量内联进扩展包，因此凭证最终会随扩展分发到用户侧，
// 只能降低滥用，不能当成绝对保密，详见方案文档附录 B。
const env = import.meta.env;

export const EZREVENUE_CONFIG = {
  projectId: String(env.VITE_EZREVENUE_PROJECT_ID ?? "").trim(),
  projectSecret: String(env.VITE_EZREVENUE_PROJECT_SECRET ?? "").trim(),
  paywallAlias: String(env.VITE_EZREVENUE_PAYWALL_ALIAS ?? "").trim() || "paywall_vip",
};

export function isEzrevenueConfigured(): boolean {
  return Boolean(EZREVENUE_CONFIG.projectId && EZREVENUE_CONFIG.projectSecret);
}
